# 11 — Production Readiness

## A — Logging & Monitoring

### Winston Setup (Required)

```typescript
// src/config/logger.ts
import winston from 'winston';
import { env } from './env';

const logger = winston.createLogger({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    env.NODE_ENV === 'production'
      ? winston.format.json()
      : winston.format.colorize({ all: true })
  ),
  transports: [
    new winston.transports.Console(),
    ...(env.NODE_ENV === 'production' ? [
      new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
      new winston.transports.File({ filename: 'logs/combined.log' }),
    ] : []),
  ],
});

export default logger;
```

### Sentry (Error Tracking — Production)

```bash
npm install @sentry/node @sentry/profiling-node
```

```typescript
// src/config/sentry.ts
import * as Sentry from '@sentry/node';
import { env } from './env';

if (env.NODE_ENV === 'production') {
  Sentry.init({
    dsn: env.SENTRY_DSN,
    tracesSampleRate: 0.1,  // 10% of transactions
    profilesSampleRate: 0.1,
  });
}

// Add to error handler
export const errorHandler = (err, req, res, next) => {
  if (env.NODE_ENV === 'production') Sentry.captureException(err);
  // ... rest of handler
};
```

### Request Logging Middleware

```typescript
// src/middleware/requestLogger.ts
import logger from '@/config/logger';

export const requestLogger = (req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.info('HTTP Request', {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${Date.now() - start}ms`,
      ip: req.ip,
    });
  });
  next();
};
```

---

## B — Caching (Redis)

```bash
npm install ioredis
```

```typescript
// src/config/redis.ts
import Redis from 'ioredis';
import { env } from './env';
import logger from './logger';

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

redis.on('connect', () => logger.info('Redis connected'));
redis.on('error',   (err) => logger.error('Redis error', { error: err.message }));

// .env: REDIS_URL=redis://localhost:6379
```

```typescript
// src/utils/cache.ts
import { redis } from '@/config/redis';

export const cache = {
  async get<T>(key: string): Promise<T | null> {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  },

  async set(key: string, value: unknown, ttlSeconds = 300): Promise<void> {
    await redis.setex(key, ttlSeconds, JSON.stringify(value));
  },

  async del(key: string): Promise<void> { await redis.del(key); },

  async delPattern(pattern: string): Promise<void> {
    const keys = await redis.keys(pattern);
    if (keys.length) await redis.del(...keys);
  },
};

// Cache keys — always define as constants
export const CACHE_KEYS = {
  user:         (id: string)          => `user:${id}`,
  userList:     (page: number)        => `users:list:${page}`,
  product:      (id: string)          => `product:${id}`,
  productList:  (filters: string)     => `products:list:${filters}`,
};

// Usage in service
async getUserById(id: string) {
  const cached = await cache.get<User>(CACHE_KEYS.user(id));
  if (cached) return cached;

  const user = await userRepository.findById(id);
  if (!user) throw new NotFoundError('User');

  await cache.set(CACHE_KEYS.user(id), user, 300); // cache 5 min
  return user;
}

// Invalidate on update
async updateUser(id: string, dto: UpdateUserDto) {
  const user = await userRepository.update(id, dto);
  await cache.del(CACHE_KEYS.user(id)); // bust cache
  return user;
}
```

---

## C — Deployment

### Docker

```dockerfile
# Dockerfile (backend)
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
EXPOSE 5000
CMD ["node", "dist/server.js"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  backend:
    build: ./backend
    ports: ['5000:5000']
    env_file: .env
    depends_on: [mongodb, redis]
    restart: unless-stopped

  frontend:
    build: ./frontend
    ports: ['3000:3000']
    restart: unless-stopped

  mongodb:
    image: mongo:7
    volumes: [mongo_data:/data/db]
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    volumes: [redis_data:/data]
    restart: unless-stopped

volumes:
  mongo_data:
  redis_data:
```

### PM2 (Without Docker)

```bash
npm install -g pm2
```

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'api',
    script: 'dist/server.js',
    instances: 'max', // use all CPU cores
    exec_mode: 'cluster',
    env_production: { NODE_ENV: 'production' },
    error_file: 'logs/pm2-error.log',
    out_file: 'logs/pm2-out.log',
    max_memory_restart: '500M',
  }],
};
```

### Environment Files Per Stage

```bash
.env.development   # local dev
.env.staging       # staging server
.env.production    # production server
.env.example       # committed to git — no real values
```

---

## D — SEO (Next.js Projects)

```typescript
// app/layout.tsx — global defaults
export const metadata: Metadata = {
  metadataBase: new URL('https://yourdomain.com'),
  title: { default: 'App Name', template: '%s | App Name' },
  description: 'Your app description',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://yourdomain.com',
    siteName: 'App Name',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    creator: '@yourhandle',
  },
  robots: { index: true, follow: true },
};

// app/sitemap.ts — auto sitemap
import { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await getProducts(); // fetch dynamic pages

  return [
    { url: 'https://yourdomain.com', lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: 'https://yourdomain.com/about', changeFrequency: 'monthly', priority: 0.8 },
    ...products.map(p => ({
      url: `https://yourdomain.com/products/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
  ];
}

// app/robots.ts
export default function robots() {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/dashboard/', '/api/'] },
    sitemap: 'https://yourdomain.com/sitemap.xml',
  };
}
```

---

## E — GDPR & Privacy

```typescript
// Required for any app with EU users

// 1. Cookie consent (use a library like react-cookie-consent)
// 2. Privacy policy page — /privacy
// 3. Terms of service page — /terms

// 4. Account deletion — REQUIRED
router.delete('/account', authenticate, async (req, res) => {
  await userService.deleteAccount(req.user.id);
  res.clearCookie('accessToken');
  res.json(ApiResponse.ok(null, 'Account deleted'));
});

// Soft delete with data anonymization
async deleteAccount(userId: string) {
  await userRepository.anonymize(userId); // replace PII with anonymous data
  // Keep non-PII data for analytics (order history totals, etc.)
  // Hard delete after 30 days (GDPR right to erasure)
}

// 5. Data export — right to access
router.get('/account/export', authenticate, async (req, res) => {
  const data = await userService.exportUserData(req.user.id);
  res.setHeader('Content-Disposition', 'attachment; filename=my-data.json');
  res.json(data);
});

// 6. Consent tracking
// Store when user accepted privacy policy + which version
interface UserConsent {
  privacyPolicyVersion: string;
  acceptedAt: Date;
  ipAddress: string; // for audit trail
}
```

---

## Production Checklist

**Logging & Monitoring**
- [ ] Winston logger configured (JSON in production)?
- [ ] Sentry (or equivalent) integrated for error tracking?
- [ ] Request logging middleware active?
- [ ] Log files excluded from git?

**Caching**
- [ ] Redis configured for frequently-read data?
- [ ] Cache invalidated on write operations?
- [ ] Cache keys defined as constants?

**Deployment**
- [ ] Dockerfile or PM2 config present?
- [ ] docker-compose for local dev with all services?
- [ ] Separate .env per environment?
- [ ] Health check endpoint `/health` available?

**SEO (Next.js)**
- [ ] Global metadata in root layout?
- [ ] Dynamic metadata on all detail pages?
- [ ] sitemap.ts generated?
- [ ] robots.ts configured?
- [ ] OG images defined?

**GDPR**
- [ ] Cookie consent implemented?
- [ ] Privacy policy page exists?
- [ ] Account deletion available?
- [ ] Data export available?
- [ ] Consent recorded with timestamp?
