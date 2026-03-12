# 01 — Core Principles & OOP

## SOLID Principles

### S — Single Responsibility Principle
Every class, function, or module must have only **one** responsibility.

```typescript
// ❌ WRONG — multiple responsibilities
class UserService {
  createUser() {}
  sendEmail() {}       // email logic does not belong here
  hashPassword() {}    // crypto logic does not belong here
  generateReport() {}  // reporting does not belong here
}

// ✅ CORRECT
class UserService {
  constructor(
    private emailService: EmailService,
    private cryptoService: CryptoService
  ) {}
  async createUser(dto: CreateUserDto) {
    const hashed = await this.cryptoService.hash(dto.password);
    const user = await UserRepository.create({ ...dto, password: hashed });
    await this.emailService.sendWelcome(user.email);
    return user;
  }
}
```

### O — Open/Closed Principle
Classes should be open for **extension**, closed for **modification**.

```typescript
// ✅ CORRECT — extensible via strategy pattern
interface PaymentStrategy {
  process(amount: number): Promise<PaymentResult>;
}
class StripePayment implements PaymentStrategy {
  async process(amount: number) { /* ... */ }
}
class IyzicoPayment implements PaymentStrategy {
  async process(amount: number) { /* ... */ }
}
class PaymentService {
  constructor(private strategy: PaymentStrategy) {}
  pay(amount: number) { return this.strategy.process(amount); }
}
```

### L — Liskov Substitution Principle
Subclasses must be substitutable for their base classes without breaking the application.

### I — Interface Segregation Principle
Prefer small, specific interfaces over large general ones.

```typescript
// ❌ WRONG
interface IUser {
  read(): void;
  write(): void;
  delete(): void;
  exportToExcel(): void; // not everyone needs this
}

// ✅ CORRECT
interface IReadable   { read(): void; }
interface IWritable   { write(): void; }
interface IDeletable  { delete(): void; }
interface IExportable { exportToExcel(): void; }
```

### D — Dependency Inversion Principle
High-level modules must depend on **abstractions**, not low-level modules.

```typescript
// ✅ CORRECT
interface IUserRepository {
  findById(id: string): Promise<User | null>;
  save(user: User): Promise<User>;
}
class MongoUserRepository  implements IUserRepository { /* ... */ }
class PrismaUserRepository implements IUserRepository { /* ... */ }

// Service works with both implementations
class UserService {
  constructor(private repo: IUserRepository) {}
}
```

---

## DRY — Don't Repeat Yourself
- Same code written twice → extract a function or hook
- Same validation written twice → create a shared validator
- Same UI block written twice → extract a component

## KISS — Keep It Simple, Stupid
- Prefer simple, readable solutions over complex ones
- Avoid premature optimization
- Avoid over-engineering

## YAGNI — You Aren't Gonna Need It
- Do not add features that are not needed right now
- Do not create unnecessary abstraction layers

---

## General Naming Conventions

```typescript
// Functions: verb + noun
getUserById()   // ✅
userData()      // ❌

// Booleans: start with is/has/can
isAuthenticated  // ✅
authenticated    // ❌
hasPermission    // ✅

// Global constants: SCREAMING_SNAKE_CASE
const MAX_RETRY_COUNT = 3;
const DEFAULT_PAGE_SIZE = 20;

// Types / Interfaces: PascalCase
type CreateUserDto = { ... }
interface IUserService { ... }
```

---

## Custom Error Classes (Required in Every Project)

```typescript
// src/utils/errors.ts
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number,
    public isOperational: boolean = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class NotFoundError    extends AppError { constructor(r: string) { super(`${r} not found`, 404); } }
export class ValidationError  extends AppError { constructor(m: string) { super(m, 400); } }
export class UnauthorizedError extends AppError { constructor() { super('Unauthorized', 401); } }
export class ForbiddenError   extends AppError { constructor() { super('Forbidden', 403); } }
export class ConflictError    extends AppError { constructor(m: string) { super(m, 409); } }
```
