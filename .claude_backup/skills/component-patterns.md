# Skill — React Component Patterns

## Component Anatomy (Standard Structure)

```typescript
import { useState, useCallback } from 'react';
import { cn } from '@/utils/cn';

// 1. Types
interface ComponentNameProps {
  title: string;       // required props first
  data: DataType[];
  className?: string;  // optional props after
  onAction?: (id: string) => void;
}

// 2. Component (named export preferred)
export const ComponentName = ({ title, data, className, onAction }: ComponentNameProps) => {
  // 3. State
  const [isOpen, setIsOpen] = useState(false);

  // 4. Derived state
  const filteredData = data.filter(item => item.isActive);

  // 5. Handlers
  const handleAction = useCallback((id: string) => { onAction?.(id); }, [onAction]);

  // 6. Early returns (loading, error, empty)
  if (!data.length) return <EmptyState />;

  // 7. JSX
  return (
    <div className={cn('base-classes', className)}>
      <h2>{title}</h2>
      {filteredData.map(item => <Item key={item.id} item={item} onAction={handleAction} />)}
    </div>
  );
};
```

---

## Custom Hook Pattern

```typescript
// hooks/useUsers.ts
export const useUsers = ({ page = 1, limit = 20, search }: UseUsersParams = {}) =>
  useQuery({
    queryKey: QUERY_KEYS.users.list({ page, limit, search }),
    queryFn:  () => userService.getUsers({ page, limit, search }),
    staleTime: 5 * 60 * 1000,
  });

export const useCreateUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: userService.createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.users.all });
      notify.success('User created');
    },
    onError: (error: ApiError) => { notify.error(error.message || 'Something went wrong'); },
  });
};
```

---

## Form Pattern (React Hook Form + Zod)

```typescript
const formSchema = z.object({
  name:  z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Enter a valid email'),
  role:  z.enum(['admin', 'editor', 'viewer']),
});
type FormValues = z.infer<typeof formSchema>;

export const UserForm = ({ defaultValues, onSubmit, isLoading }: UserFormProps) => {
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
        <input {...register('name')} className={cn(
          'w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2',
          errors.name ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
        )} />
        {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
      </div>
      <Button type="submit" isLoading={isLoading}>Save</Button>
    </form>
  );
};
```

---

## Generic DataTable Component

```typescript
interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (row: T) => React.ReactNode;
}

export const DataTable = <T,>({ columns, data, isLoading, emptyMessage = 'No data found', keyExtractor }: DataTableProps<T>) => {
  if (isLoading) return <TableSkeleton cols={columns.length} />;
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {columns.map(col => (
              <th key={String(col.key)} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {!data.length
            ? <tr><td colSpan={columns.length} className="px-6 py-12 text-center text-gray-500">{emptyMessage}</td></tr>
            : data.map(row => (
                <tr key={keyExtractor(row)} className="hover:bg-gray-50 transition-colors">
                  {columns.map(col => (
                    <td key={String(col.key)} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {col.render ? col.render(row) : String(row[col.key as keyof T] ?? '')}
                    </td>
                  ))}
                </tr>
              ))}
        </tbody>
      </table>
    </div>
  );
};
```

---

## Query Keys Standard

```typescript
// src/constants/queryKeys.ts
export const QUERY_KEYS = {
  users: {
    all:    ['users'] as const,
    list:   (params: object) => ['users', 'list', params] as const,
    detail: (id: string)     => ['users', 'detail', id] as const,
  },
  posts: {
    all:    ['posts'] as const,
    list:   (params: object) => ['posts', 'list', params] as const,
    detail: (id: string)     => ['posts', 'detail', id] as const,
    byUser: (userId: string) => ['posts', 'byUser', userId] as const,
  },
} as const;
```

---

## API Service Pattern

```typescript
// src/services/userService.ts
export const userService = {
  getUsers:    async (params: GetUsersParams) =>    (await api.get<ApiResponse<User[]>>('/users', { params })).data,
  getUserById: async (id: string) =>                (await api.get<ApiResponse<User>>(`/users/${id}`)).data,
  createUser:  async (dto: CreateUserDto) =>        (await api.post<ApiResponse<User>>('/users', dto)).data,
  updateUser:  async (id: string, dto: UpdateUserDto) => (await api.patch<ApiResponse<User>>(`/users/${id}`, dto)).data,
  deleteUser:  async (id: string) =>                (await api.delete<ApiResponse<null>>(`/users/${id}`)).data,
};
```
