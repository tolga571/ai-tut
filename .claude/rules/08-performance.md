# 08 — Performance & Accessibility

## React Optimization

```typescript
// memo — prevent unnecessary re-renders (use only when needed)
// ✅ Use when parent re-renders frequently and child is expensive
export const UserCard = memo(({ user, onAction }: UserCardProps) => <div>...</div>);

// useCallback — stabilize function references
// ✅ Use when passing as prop to a memoized child
const handleDelete = useCallback((id: string) => { deleteUser(id); }, [deleteUser]);

// useMemo — expensive calculations only
const sortedUsers = useMemo(
  () => users.sort((a, b) => a.name.localeCompare(b.name)),
  [users]
);

// Lazy loading — route-based code splitting (REQUIRED)
const DashboardPage = lazy(() => import('@/pages/dashboard/DashboardPage'));
const UsersPage     = lazy(() => import('@/pages/users/UsersPage'));

<Suspense fallback={<PageLoader />}>
  <Routes>
    <Route path="/dashboard" element={<DashboardPage />} />
  </Routes>
</Suspense>
```

---

## List Virtualization (100+ items — Required)

```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

const VirtualList = ({ items }: { items: Item[] }) => {
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72,
  });

  return (
    <div ref={parentRef} className="h-[600px] overflow-auto">
      <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
        {virtualizer.getVirtualItems().map((v) => (
          <div key={v.key} style={{ position: 'absolute', top: 0, transform: `translateY(${v.start}px)`, width: '100%', height: `${v.size}px` }}>
            <ItemCard item={items[v.index]} />
          </div>
        ))}
      </div>
    </div>
  );
};
```

---

## Image Optimization

```typescript
// Next.js — next/image REQUIRED (img tag forbidden)
import Image from 'next/image';
<Image src={user.avatar} alt={`${user.name} profile photo`} width={48} height={48}
  className="rounded-full" placeholder="blur" blurDataURL="..." />

// React (Vite) — lazy loading required
<img src={user.avatar} alt={`${user.name} profile photo`}
  loading="lazy" decoding="async" className="rounded-full w-12 h-12 object-cover" />
```

---

## Debounce — Search Inputs

```typescript
// src/hooks/useDebounce.ts
export const useDebouncedValue = <T>(value: T, delay: number): T => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
};

const SearchInput = () => {
  const [input, setInput] = useState('');
  const debouncedSearch = useDebouncedValue(input, 400);

  const { data } = useQuery({
    queryKey: ['search', debouncedSearch],
    queryFn: () => searchService.search(debouncedSearch),
    enabled: debouncedSearch.length >= 2,
  });

  return <input value={input} onChange={e => setInput(e.target.value)} />;
};
```

---

## Skeleton Loading (Required for Every List/Card)

```typescript
// ❌ WRONG
if (isLoading) return null;

// ✅ CORRECT
if (isLoading) return <UserCardSkeleton count={5} />;

export const UserCardSkeleton = ({ count = 3 }: { count?: number }) => (
  <div className="space-y-4">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="flex items-center gap-4 p-4 bg-white rounded-xl animate-pulse">
        <div className="w-12 h-12 bg-gray-200 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 rounded w-1/3" />
          <div className="h-3 bg-gray-200 rounded w-1/2" />
        </div>
      </div>
    ))}
  </div>
);
```

---

## Accessibility (a11y) — Core Rules

```typescript
// 1. Semantic HTML — div soup is forbidden
<div onClick={handleClick}>Click</div>  // ❌
<button onClick={handleClick}>Click</button>  // ✅

// 2. Alt text — required for all images
<img src={photo} />  // ❌
<img src={photo} alt="John Doe profile photo" />  // ✅
<img src={divider} alt="" role="presentation" />   // ✅ decorative

// 3. Form labels — required for every input
<label htmlFor="email" className="sr-only">Email</label>
<input id="email" type="email" placeholder="Email" />

// 4. Focus management — when modal opens
useEffect(() => { if (isOpen) closeButtonRef.current?.focus(); }, [isOpen]);

// 5. Loading state — ARIA
<button disabled={isLoading} aria-busy={isLoading}>
  {isLoading ? 'Saving...' : 'Save'}
</button>

// 6. Dynamic content — ARIA live regions
<div aria-live="polite" aria-atomic="true">{statusMessage}</div>
```

---

## React Query Global Config

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,      // 5min — data stays fresh
      gcTime: 10 * 60 * 1000,        // 10min — kept in cache
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: { retry: 0 },
  },
});
```

---

## Optimistic Updates

```typescript
const { mutate: toggleLike } = useMutation({
  mutationFn: postService.toggleLike,
  onMutate: async (postId) => {
    await queryClient.cancelQueries({ queryKey: ['posts', postId] });
    const previous = queryClient.getQueryData(['posts', postId]);

    queryClient.setQueryData(['posts', postId], (old: Post) => ({
      ...old,
      isLiked: !old.isLiked,
      likeCount: old.isLiked ? old.likeCount - 1 : old.likeCount + 1,
    }));

    return { previous };
  },
  onError: (_, postId, context) => {
    queryClient.setQueryData(['posts', postId], context?.previous);
    notify.error('Action failed');
  },
});
```
