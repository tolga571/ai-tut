# 03 — Security Rules

> ⚠️ This section is NON-NEGOTIABLE. Security rules are never skipped for any reason.

---

## 1. SQL / NoSQL Injection

### SQL (Prisma / raw query)
```typescript
// ❌ FATAL — Never do this
const query = `SELECT * FROM users WHERE email = '${email}'`;
await db.raw(query);

// ✅ CORRECT — Prisma parametric query
const user = await prisma.user.findUnique({ where: { email } });

// ✅ CORRECT — raw query when necessary
await prisma.$queryRaw`SELECT * FROM users WHERE email = ${email}`;
```

### NoSQL (MongoDB / Mongoose)
```typescript
// ❌ WRONG — vulnerable to { $gt: '' } injection
const user = await User.findOne({ email: req.body.email });

// ✅ CORRECT — sanitize + enforce string type
import mongoSanitize from 'express-mongo-sanitize';
app.use(mongoSanitize()); // add as middleware

// ✅ CORRECT — Zod input validation
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});
const validated = loginSchema.parse(req.body);
```

---

## 2. XSS (Cross-Site Scripting)

```typescript
import DOMPurify from 'isomorphic-dompurify';

// Sanitize before saving HTML content
const cleanContent = DOMPurify.sanitize(userInput);

// React — JSX auto-escapes by default (safe)
// ❌ NEVER use this
<div dangerouslySetInnerHTML={{ __html: userInput }} />

// ✅ REQUIRED — only with sanitized content
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }} />

app.use(helmet()); // X-XSS-Protection, Content-Security-Policy, etc.
```

---

## 3. CSRF (Cross-Site Request Forgery)

```typescript
// Cookie settings — REQUIRED
res.cookie('token', jwt, {
  httpOnly: true,       // block JS access
  secure: process.env.NODE_ENV === 'production', // HTTPS only
  sameSite: 'strict',   // CSRF protection
  maxAge: 7 * 24 * 60 * 60 * 1000,
});
```

---

## 4. Authentication & Authorization

```typescript
import jwt from 'jsonwebtoken';
import { env } from '@/config/env';

const generateTokens = (userId: string) => {
  const accessToken  = jwt.sign({ userId }, env.JWT_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ userId }, env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
  return { accessToken, refreshToken };
};

// Auth middleware
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];
    if (!token) throw new UnauthorizedError();
    const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    req.user = await UserService.findById(payload.userId);
    next();
  } catch {
    next(new UnauthorizedError());
  }
};

// Authorization middleware
export const authorize = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!roles.includes(req.user.role)) return next(new ForbiddenError());
    next();
  };
};

// Route usage
router.delete('/users/:id', authenticate, authorize('admin'), deleteUser);
```

---

## 5. Password Security

```typescript
import bcrypt from 'bcryptjs';

// ✅ Hash — REQUIRED
const hashPassword   = async (password: string) => bcrypt.hash(password, env.BCRYPT_ROUNDS); // min 12
const verifyPassword = async (plain: string, hashed: string) => bcrypt.compare(plain, hashed);

// ❌ NEVER — MD5, SHA1, plain text
```

---

## 6. Rate Limiting

```typescript
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';

export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
});

export const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000,
  delayAfter: 3,
  delayMs: (hits) => hits * 500,
});

app.use('/api/auth', speedLimiter, authLimiter);
app.use('/api', globalLimiter);
```

---

## 7. Input Validation — ZOD (Required)

```typescript
import { z } from 'zod';

export const createUserSchema = z.object({
  name:     z.string().min(2).max(100).trim(),
  email:    z.string().email().toLowerCase(),
  password: z.string().min(8).max(128)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain upper/lower case and a number'),
  role:     z.enum(['admin', 'editor', 'viewer']).default('viewer'),
});

// Validation middleware
export const validate = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          errors: error.errors.map(e => ({ field: e.path.join('.'), message: e.message })),
        });
      }
      next(error);
    }
  };
};

router.post('/users', validate(createUserSchema), createUser);
```

---

## 8. Helmet & CORS

```typescript
import helmet from 'helmet';
import cors from 'cors';

app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://yourdomain.com']
    : ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
```

---

## 9. File Upload Security

```typescript
import multer from 'multer';
import path from 'path';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_TYPES.includes(file.mimetype)) {
      return cb(new ValidationError('Unsupported file type'));
    }
    const ext = path.extname(file.originalname).toLowerCase();
    if (!['.jpg', '.jpeg', '.png', '.webp', '.pdf'].includes(ext)) {
      return cb(new ValidationError('Invalid file extension'));
    }
    cb(null, true);
  },
});
```

---

## 10. Secrets & .gitignore

```bash
# .gitignore — REQUIRED
.env
.env.local
.env.production
*.pem
*.key
node_modules/
```

---

## Security Checklist (Check on every PR)

- [ ] All user inputs validated with Zod?
- [ ] SQL/NoSQL injection protection in place?
- [ ] Auth middleware on all protected routes?
- [ ] Rate limiting active?
- [ ] Helmet in use?
- [ ] CORS properly configured?
- [ ] Passwords hashed with bcrypt?
- [ ] JWTs stored in httpOnly cookies?
- [ ] .env file in .gitignore?
- [ ] File upload validation in place?
