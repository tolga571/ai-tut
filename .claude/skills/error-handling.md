# Skill — Error Handling & Edge Cases

## Frontend Error Classes

```typescript
// src/utils/errors.ts
export class ApiError extends Error {
  constructor(public message: string, public statusCode: number, public errors?: Record<string, string>[]) {
    super(message);
    this.name = 'ApiError';
  }
}

// Axios interceptor — centralized error transformation
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorResponse>) => {
    const message    = error.response?.data?.message || 'An unexpected error occurred';
    const statusCode = error.response?.status || 500;
    const errors     = error.response?.data?.errors;
    throw new ApiError(message, statusCode, errors);
  }
);
```

---

## React Error Boundary

```typescript
// src/components/ErrorBoundary.tsx
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State { return { hasError: true, error }; }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Send to Sentry or similar in production
    this.props.onError?.(error, info);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <h2 className="text-xl font-semibold text-gray-900">Something went wrong</h2>
          <p className="text-gray-500">An error occurred while loading this page.</p>
          <button onClick={() => this.setState({ hasError: false, error: null })}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Wrap critical sections
<ErrorBoundary fallback={<SectionError />}>
  <UserList />
</ErrorBoundary>
```

---

## Network Status

```typescript
// src/hooks/useNetworkStatus.ts
export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const onOnline  = () => { setIsOnline(true);  notify.success('Connection restored'); };
    const onOffline = () => { setIsOnline(false); notify.error('No internet connection'); };
    window.addEventListener('online',  onOnline);
    window.addEventListener('offline', onOffline);
    return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline); };
  }, []);

  return isOnline;
};

// NetworkBanner — add to layout
export const NetworkBanner = () => {
  const isOnline = useNetworkStatus();
  if (isOnline) return null;
  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-red-500 text-white text-center py-2 text-sm">
      No internet connection — some features may not work
    </div>
  );
};
```

---

## Race Condition Prevention

```typescript
const useUserSearch = (query: string) => {
  const [results, setResults] = useState([]);

  useEffect(() => {
    if (!query) return;
    const controller = new AbortController();

    const search = async () => {
      try {
        const data = await searchService.search(query, { signal: controller.signal });
        setResults(data);
      } catch (error) {
        if (error.name === 'AbortError') return; // cancelled request — ignore
        notify.error('Search failed');
      }
    };

    search();
    return () => controller.abort(); // cancel when new query arrives
  }, [query]);

  return results;
};
```

---

## Infinite Scroll

```typescript
export const useInfiniteUsers = () =>
  useInfiniteQuery({
    queryKey: QUERY_KEYS.users.infinite,
    queryFn:  ({ pageParam = 1 }) => userService.getUsers({ page: pageParam }),
    getNextPageParam: (lastPage) => lastPage.pagination.hasNext ? lastPage.pagination.page + 1 : undefined,
    initialPageParam: 1,
  });

const InfiniteUserList = () => {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteUsers();
  const observerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && hasNextPage) fetchNextPage(); },
      { threshold: 0.5 }
    );
    if (observerRef.current) observer.observe(observerRef.current);
    return () => observer.disconnect();
  }, [hasNextPage, fetchNextPage]);

  const users = data?.pages.flatMap(p => p.data) ?? [];
  return (
    <div>
      {users.map(user => <UserCard key={user.id} user={user} />)}
      <div ref={observerRef} className="h-4">{isFetchingNextPage && <Spinner />}</div>
    </div>
  );
};
```

---

## Unsaved Changes Warning

```typescript
export const useUnsavedChanges = (isDirty: boolean) => {
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);
};

// React Router blocker
const EditForm = () => {
  const { formState: { isDirty } } = useForm();
  useBlocker(() => isDirty && !window.confirm('You have unsaved changes. Leave anyway?'));
};
```

---

## 404 / Not Found Handling

```typescript
const UserDetailPage = () => {
  const { id } = useParams();
  const { data: user, isLoading, isError } = useUser(id!);

  if (isLoading)       return <UserDetailSkeleton />;
  if (isError || !user) return (
    <NotFoundSection
      title="User not found"
      description="This user doesn't exist or has been deleted"
      backPath="/users"
      backLabel="Back to Users"
    />
  );

  return <UserDetail user={user} />;
};
```

---

## Cache Invalidation Strategy

```typescript
// Think carefully about what to invalidate after each mutation
const { mutate: createPost } = useMutation({
  mutationFn: postService.create,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.posts.all });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.users.detail(currentUserId) });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dashboard.stats });
  },
});
```
