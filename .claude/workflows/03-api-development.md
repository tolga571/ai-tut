# Workflow 03 — REST API Development

## Order: Validation → Repository → Service → Controller → Routes

---

## 1. Zod Validation Schema — Write First

```typescript
// src/modules/user/user.validation.ts
import { z } from 'zod';

export const createUserSchema = z.object({
  body: z.object({
    name:     z.string().min(2).max(100).trim(),
    email:    z.string().email().toLowerCase(),
    password: z.string().min(8).max(128)
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Must contain upper/lower case and number'),
    role:     z.enum(['admin', 'editor', 'viewer']).default('viewer'),
  }),
});

export const updateUserSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body:   z.object({
    name:  z.string().min(2).max(100).trim().optional(),
    email: z.string().email().toLowerCase().optional(),
  }).strict(),
});

export const getUsersSchema = z.object({
  query: z.object({
    page:   z.string().transform(Number).default('1'),
    limit:  z.string().transform(Number).default('20'),
    search: z.string().optional(),
    role:   z.enum(['admin', 'editor', 'viewer']).optional(),
  }),
});

export type CreateUserDto = z.infer<typeof createUserSchema>['body'];
export type UpdateUserDto = z.infer<typeof updateUserSchema>['body'];
```

---

## 2. Repository — Database Layer

```typescript
// src/modules/user/user.repository.ts
export class UserRepository {
  async findById(id: string)          { return User.findById(id).select('-password').lean(); }
  async findByEmail(email: string)    { return User.findOne({ email }).lean(); }
  async findByEmailWithPassword(email: string) { return User.findOne({ email }).select('+password'); }

  async findAll({ page, limit, search, role }: FindAllParams) {
    const skip = (page - 1) * limit;
    const query: Record<string, unknown> = {};
    if (search) query.$or = [
      { name:  { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
    if (role) query.role = role;

    const [data, total] = await Promise.all([
      User.find(query).select('-password').skip(skip).limit(limit).lean(),
      User.countDocuments(query),
    ]);
    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit), hasNext: page < Math.ceil(total / limit), hasPrev: page > 1 } };
  }

  async create(dto: CreateUserDto & { password: string }) { return User.create(dto); }
  async update(id: string, dto: UpdateUserDto)            { return User.findByIdAndUpdate(id, dto, { new: true, runValidators: true }).select('-password').lean(); }
  async delete(id: string)                                { return !!(await User.findByIdAndDelete(id)); }
}

export const userRepository = new UserRepository();
```

---

## 3. Service — Business Logic

```typescript
// src/modules/user/user.service.ts
export class UserService {
  async getUsers(filters: FindAllParams)    { return userRepository.findAll(filters); }

  async getUserById(id: string) {
    const user = await userRepository.findById(id);
    if (!user) throw new NotFoundError('User');
    return user;
  }

  async createUser(dto: CreateUserDto) {
    if (await userRepository.findByEmail(dto.email)) throw new ConflictError('Email already in use');
    const user = await userRepository.create({ ...dto, password: await hashPassword(dto.password) });
    const { password, ...safe } = user.toObject();
    return safe;
  }

  async updateUser(id: string, dto: UpdateUserDto) {
    await this.getUserById(id);
    return userRepository.update(id, dto);
  }

  async deleteUser(id: string) {
    await this.getUserById(id);
    await userRepository.delete(id);
  }
}

export const userService = new UserService();
```

---

## 4. Controller — HTTP Layer Only

```typescript
// src/modules/user/user.controller.ts
export const getUsers    = catchAsync(async (req, res) => res.status(200).json(ApiResponse.ok((await userService.getUsers(req.query as any)).data)));
export const getUserById = catchAsync(async (req, res) => res.status(200).json(ApiResponse.ok(await userService.getUserById(req.params.id))));
export const createUser  = catchAsync(async (req, res) => res.status(201).json(ApiResponse.created(await userService.createUser(req.body), 'User created')));
export const updateUser  = catchAsync(async (req, res) => res.status(200).json(ApiResponse.ok(await userService.updateUser(req.params.id, req.body), 'User updated')));
export const deleteUser  = catchAsync(async (req, res) => { await userService.deleteUser(req.params.id); res.status(200).json(ApiResponse.ok(null, 'User deleted')); });
```

---

## 5. Routes — Last Step

```typescript
// src/modules/user/user.routes.ts
const router = Router();

router.get('/',    authenticate,                validate(getUsersSchema),  getUsers);
router.get('/:id', authenticate,                                           getUserById);
router.post('/',   authenticate, authorize('admin'), validate(createUserSchema), createUser);
router.patch('/:id', authenticate, authorize('admin'), validate(updateUserSchema), updateUser);
router.delete('/:id', authenticate, authorize('admin'),                    deleteUser);

export default router;
```

---

## API Response Standard

```json
// Success
{ "success": true, "message": "Users listed", "data": [...], "pagination": { "page": 1, "limit": 20, "total": 100, "totalPages": 5, "hasNext": true, "hasPrev": false } }

// Error
{ "success": false, "message": "User not found" }

// Validation error
{ "success": false, "message": "Validation error", "errors": [{ "field": "email", "message": "Invalid email format" }] }
```

---

## Endpoint Checklist

- [ ] Zod schema written?
- [ ] Inputs sanitized?
- [ ] Auth middleware added?
- [ ] Authorization checked?
- [ ] Repository layer separate?
- [ ] Service contains business logic?
- [ ] Controller is HTTP-only?
- [ ] catchAsync used?
- [ ] ApiResponse standard followed?
- [ ] Rate limiting considered?
