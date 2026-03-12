# Workflow 04 — Database

## ORM/ODM Selection

```
MongoDB   → Mongoose
MySQL     → Prisma (preferred)
PostgreSQL → Prisma (preferred)
Multiple  → Separate repository class per DB
```

---

## Mongoose (MongoDB)

```typescript
// src/modules/user/user.schema.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  name: string; email: string; password: string;
  role: 'admin' | 'editor' | 'viewer'; isActive: boolean;
  createdAt: Date; updatedAt: Date;
}

const UserSchema = new Schema<IUser>({
  name:     { type: String, required: [true, 'Name is required'], trim: true, minlength: 2, maxlength: 100 },
  email:    { type: String, required: [true, 'Email is required'], unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 8, select: false },
  role:     { type: String, enum: ['admin', 'editor', 'viewer'], default: 'viewer' },
  isActive: { type: Boolean, default: true },
}, {
  timestamps: true, versionKey: false,
  toJSON: { transform: (_, ret) => { delete ret.password; return ret; } },
});

UserSchema.index({ email: 1 });
UserSchema.index({ role: 1, isActive: 1 });

export default mongoose.model<IUser>('User', UserSchema);
```

```typescript
// src/config/database.ts
export const connectMongoDB = async () => {
  try {
    await mongoose.connect(env.MONGODB_URI, { maxPoolSize: 10, serverSelectionTimeoutMS: 5000 });
    logger.info('MongoDB connected');
  } catch (error) {
    logger.error('MongoDB connection error', { error });
    process.exit(1);
  }
};
```

---

## Prisma (MySQL / PostgreSQL)

```bash
npm install prisma @prisma/client
npx prisma init --datasource-provider postgresql  # or mysql
```

```prisma
// prisma/schema.prisma
generator client { provider = "prisma-client-js" }
datasource db    { provider = "postgresql"; url = env("DATABASE_URL") }

model User {
  id        String   @id @default(cuid())
  name      String   @db.VarChar(100)
  email     String   @unique @db.VarChar(255)
  password  String
  role      Role     @default(VIEWER)
  isActive  Boolean  @default(true)
  posts     Post[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@index([email])
  @@index([role, isActive])
  @@map("users")
}

model Post {
  id        String   @id @default(cuid())
  title     String   @db.VarChar(255)
  content   String?  @db.Text
  published Boolean  @default(false)
  author    User     @relation(fields: [authorId], references: [id], onDelete: Cascade)
  authorId  String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@index([authorId])
  @@map("posts")
}

enum Role { ADMIN EDITOR VIEWER }
```

```typescript
// src/lib/prisma.ts — singleton
import { PrismaClient } from '@prisma/client';
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };
export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

```typescript
// Prisma Repository
export class UserRepository {
  async findAll({ page, limit, search }: FindAllParams) {
    const skip  = (page - 1) * limit;
    const where: Prisma.UserWhereInput = search
      ? { OR: [{ name: { contains: search, mode: 'insensitive' } }, { email: { contains: search, mode: 'insensitive' } }] }
      : {};

    const [data, total] = await prisma.$transaction([
      prisma.user.findMany({ where, skip, take: limit, omit: { password: true }, orderBy: { createdAt: 'desc' } }),
      prisma.user.count({ where }),
    ]);
    return { data, total };
  }
}
```

```bash
# Migration commands
npx prisma migrate dev --name add_user_table  # development
npx prisma migrate deploy                     # production
npx prisma generate                           # regenerate client
npx prisma studio                             # GUI
```

---

## General Rules

```typescript
// ❌ Direct DB call outside repository
const user = await User.findById(id); // inside controller — WRONG

// ❌ Raw string query (SQL injection risk)
await prisma.$queryRawUnsafe(`SELECT * FROM users WHERE id = ${id}`);

// ✅ Parametric raw query
await prisma.$queryRaw`SELECT * FROM users WHERE id = ${id}`;

// ✅ Transactions for multiple operations
const result = await prisma.$transaction(async (tx) => {
  const order = await tx.order.create({ data: orderData });
  await tx.product.update({ where: { id: orderData.productId }, data: { stock: { decrement: orderData.quantity } } });
  return order;
});

// ✅ Prevent N+1 — use populate/include
// Mongoose
const users = await User.find().populate('posts');
// Prisma
const users = await prisma.user.findMany({ include: { posts: true } });
```
