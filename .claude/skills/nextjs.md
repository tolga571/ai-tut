# Skill — Next.js Patterns

## Server vs Client Component Decision

```
Where should this component render?
├── Fetches data? (DB, API)            → Server Component
├── Needs user interaction? (onClick)  → Client Component
├── Uses browser API?                  → Client Component
├── Uses state/effects?                → Client Component
└── Static UI only?                    → Server Component (preferred)
```

---

## Server Component (Default)

```typescript
// app/users/page.tsx — Server Component by default
const UsersPage = async () => {
  const users = await prisma.user.findMany({ where: { isActive: true }, orderBy: { createdAt: 'desc' } });
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Users</h1>
      <UserList users={users} />
    </div>
  );
};
export default UsersPage;
```

---

## Client Component

```typescript
// components/shared/UserList.tsx
'use client';
import { useState } from 'react';
import type { User } from '@prisma/client';

export const UserList = ({ users }: { users: User[] }) => {
  const [search, setSearch] = useState('');
  const filtered = users.filter(u => u.name.toLowerCase().includes(search.toLowerCase()));
  return (
    <div>
      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
        className="px-4 py-2 border rounded-lg mb-4" />
      {filtered.map(user => <UserCard key={user.id} user={user} />)}
    </div>
  );
};
```

---

## Route Handlers (API)

```typescript
// app/api/users/route.ts
export const GET = async (request: NextRequest) => {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const page  = Number(searchParams.get('page')  || '1');
    const limit = Number(searchParams.get('limit') || '20');

    const [users, total] = await prisma.$transaction([
      prisma.user.findMany({ skip: (page - 1) * limit, take: limit, omit: { password: true } }),
      prisma.user.count(),
    ]);
    return NextResponse.json({ success: true, data: users, total });
  } catch {
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
};

export const POST = async (request: NextRequest) => {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body      = await request.json();
    const validated = createUserSchema.parse(body);
    const user      = await prisma.user.create({ data: validated, omit: { password: true } });
    return NextResponse.json({ success: true, data: user }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ success: false, errors: error.errors }, { status: 400 });
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
};
```

---

## Server Actions

```typescript
// app/actions/userActions.ts
'use server';
import { revalidatePath } from 'next/cache';

export const updateUserAction = async (formData: FormData) => {
  const session = await getServerSession();
  if (!session) throw new Error('Unauthorized');

  const validated = updateUserSchema.parse({ id: formData.get('id'), name: formData.get('name') });
  const { id, ...data } = validated;
  await prisma.user.update({ where: { id }, data });
  revalidatePath('/users');
};
```

---

## Loading & Error Boundaries

```typescript
// app/users/loading.tsx
export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="animate-pulse space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 bg-gray-200 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

// app/users/error.tsx
'use client';
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <h2 className="text-xl font-semibold text-gray-900">Something went wrong</h2>
      <p className="text-gray-600">{error.message}</p>
      <button onClick={reset} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
        Try again
      </button>
    </div>
  );
}
```

---

## Middleware (Route Protection)

```typescript
// middleware.ts
import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    if (req.nextUrl.pathname.startsWith('/admin') && token?.role !== 'admin') {
      return NextResponse.redirect(new URL('/unauthorized', req.url));
    }
  },
  { callbacks: { authorized: ({ token }) => !!token } }
);

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*', '/profile/:path*'],
};
```

---

## Metadata

```typescript
// Static
export const metadata: Metadata = {
  title: 'Users | App Name',
  description: 'User list and management',
};

// Dynamic
export const generateMetadata = async ({ params }: { params: { id: string } }): Promise<Metadata> => {
  const user = await getUserById(params.id);
  return { title: `${user?.name} | App Name` };
};
```
