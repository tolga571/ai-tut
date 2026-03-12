# 06 — UX Completeness & Logical Flow Rules

> A feature is NOT complete until every rule in this file is satisfied.
> Code that technically works but has missing feedback, broken links, or no auth guard is incomplete.

---

## 1. Auth Guard — Protected Route Rule

### Rule: No protected page or content is ever shown to an unauthenticated user.

```typescript
// src/components/guards/AuthGuard.tsx
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

export const AuthGuard = () => {
  const { isAuthenticated, isLoading } = useAuthStore();
  const location = useLocation();

  if (isLoading) return <FullPageSpinner />;

  if (!isAuthenticated) {
    // Redirect to login, remember the intended page
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
};

// Return to the intended page after login
const LoginPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const from = (location.state as any)?.from?.pathname || '/dashboard';

  const handleLoginSuccess = () => {
    navigate(from, { replace: true });
  };
};

// App.tsx
const App = () => (
  <Routes>
    {/* Public — redirect authenticated users away */}
    <Route element={<PublicGuard />}>
      <Route path="/auth/login"    element={<LoginPage />} />
      <Route path="/auth/register" element={<RegisterPage />} />
    </Route>

    {/* Protected — redirect unauthenticated users to login */}
    <Route element={<AuthGuard />}>
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/users"     element={<UsersPage />} />
    </Route>

    {/* Root always redirects — never shows content directly */}
    <Route path="/" element={<Navigate to="/dashboard" replace />} />
  </Routes>
);

// PublicGuard — authenticated users cannot revisit login/register
export const PublicGuard = () => {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <Outlet />;
};
```

```typescript
// Next.js — middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

const PUBLIC_PATHS = ['/auth/login', '/auth/register', '/'];
const AUTH_PATHS   = ['/dashboard', '/profile', '/settings'];

export const middleware = async (req: NextRequest) => {
  const token = await getToken({ req });
  const { pathname } = req.nextUrl;

  if (!token && AUTH_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL(`/auth/login?from=${pathname}`, req.url));
  }
  if (token && PUBLIC_PATHS.includes(pathname) && pathname !== '/') {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }
  return NextResponse.next();
};
```

---

## 2. User Feedback — Required States

### Every user action must handle 4 states: Loading · Success · Error · Empty

```typescript
// ❌ WRONG — silent action
const handleAddFriend = async (userId: string) => {
  await friendService.sendRequest(userId);
};

// ✅ CORRECT — all states handled
const handleAddFriend = async (userId: string) => {
  try {
    setIsLoading(true);
    await friendService.sendRequest(userId);
    toast.success('Friend request sent');
    setButtonState('pending'); // prevent re-clicking
  } catch (error) {
    toast.error(error.message || 'Could not send request');
  } finally {
    setIsLoading(false);
  }
};
```

### Centralized Toast (Required)

```typescript
// src/utils/toast.ts
import toast from 'react-hot-toast';

export const notify = {
  success: (msg: string) => toast.success(msg, { duration: 3000 }),
  error:   (msg: string) => toast.error(msg,   { duration: 4000 }),
  loading: (msg: string) => toast.loading(msg),
  promise: <T,>(p: Promise<T>, msgs: { loading: string; success: string; error: string }) =>
    toast.promise(p, msgs),
};

// Usage
notify.promise(friendService.sendRequest(userId), {
  loading: 'Sending request...',
  success: 'Friend request sent',
  error:   'Could not send request',
});
```

---

## 3. Button & Form States

```typescript
// Every button must support: default · loading · disabled · success (if needed)
const ActionButton = ({ onClick, label, loadingLabel, disabled }: ActionButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    if (isLoading || disabled) return; // prevent double-click
    setIsLoading(true);
    try { await onClick(); }
    finally { setIsLoading(false); }
  };

  return (
    <button onClick={handleClick} disabled={isLoading || disabled}
      className="... disabled:opacity-50 disabled:cursor-not-allowed">
      {isLoading ? <><Spinner className="mr-2" />{loadingLabel || 'Loading...'}</> : label}
    </button>
  );
};

// Friend button — status-based states
type FriendStatus = 'none' | 'pending' | 'friends' | 'blocked';

const FriendButton = ({ userId, status }: { userId: string; status: FriendStatus }) => {
  const CONFIG = {
    none:    { label: 'Add Friend',      action: sendRequest,   style: 'primary'   },
    pending: { label: 'Request Sent',    action: cancelRequest, style: 'secondary' },
    friends: { label: 'Friends',         action: removeFriend,  style: 'ghost'     },
    blocked: { label: 'Unblock',         action: unblock,       style: 'danger'    },
  } as const;

  const config = CONFIG[status];
  return <Button variant={config.style} onClick={config.action}>{config.label}</Button>;
};
```

---

## 4. Navigation Integrity

### Rule: Every clickable element must navigate somewhere. A broken link = incomplete feature.

```typescript
// Checklist — for every clickable element:
// ✅ Click on profile photo → go to profile page
// ✅ Click on notification → go to the related content
// ✅ Click on profile inside a friend request notification → go to that user's profile
// ✅ "Go Back" on error page → go to previous page
// ✅ "Home" on 404 page → go to dashboard

// Centralized notification navigation — REQUIRED pattern
interface Notification {
  id: string;
  type: 'friend_request' | 'message' | 'comment' | 'like';
  actorId: string;
  resourceId?: string;
  isRead: boolean;
  createdAt: Date;
}

const getNotificationLink = (n: Notification): string => ({
  friend_request: `/profile/${n.actorId}`,
  message:        `/messages/${n.actorId}`,
  comment:        `/posts/${n.resourceId}`,
  like:           `/posts/${n.resourceId}`,
}[n.type] || '/notifications');

const NotificationItem = ({ notification: n }: { notification: Notification }) => {
  const navigate = useNavigate();
  return (
    <div onClick={() => navigate(getNotificationLink(n))}
      className="flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50">
      <Link to={`/profile/${n.actorId}`} onClick={e => e.stopPropagation()}>
        <Avatar userId={n.actorId} />
      </Link>
      <span>{n.message}</span>
    </div>
  );
};
```

---

## 5. Real-time Notification Flow

```typescript
// Backend — notification service
export class NotificationService {
  constructor(private io: Server) {}

  async create(data: CreateNotificationDto) {
    const notification = await notificationRepository.create(data);
    this.io.to(`user:${data.recipientId}`).emit('notification:new', notification);
    return notification;
  }
}

// Always create notification when sending a friend request
async sendFriendRequest(senderId: string, recipientId: string) {
  const request = await friendRepository.create({ senderId, recipientId });
  await this.notificationService.create({  // NEVER skip this
    recipientId,
    actorId: senderId,
    type: 'friend_request',
    message: 'sent you a friend request',
  });
  return request;
}

// Frontend — socket hook
export const useNotifications = () => {
  const { socket } = useSocket();
  const [unreadCount, setUnreadCount] = useState(0);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket) return;
    socket.on('notification:new', (notification) => {
      setUnreadCount(prev => prev + 1);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notifications.all });
      notify.success(notification.message);
    });
    return () => { socket.off('notification:new'); };
  }, [socket]);

  return { unreadCount, setUnreadCount };
};
```

---

## 6. Empty State Management

```typescript
// ❌ WRONG — empty list rendered silently
const FriendList = ({ friends }) => (
  <div>{friends.map(f => <FriendCard key={f.id} friend={f} />)}</div>
);

// ✅ CORRECT — every list has an empty state
const FriendList = ({ friends, isLoading }) => {
  if (isLoading)      return <FriendListSkeleton />;
  if (!friends.length) return (
    <EmptyState
      icon={<UsersIcon />}
      title="No friends yet"
      description="Start by searching for people you know"
      action={{ label: 'Find People', href: '/search' }}
    />
  );
  return <div>{friends.map(f => <FriendCard key={f.id} friend={f} />)}</div>;
};

// Reusable EmptyState component
export const EmptyState = ({ icon, title, description, action }: EmptyStateProps) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    {icon && <div className="mb-4 text-gray-400 w-12 h-12">{icon}</div>}
    <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
    {description && <p className="text-gray-500 mb-6 max-w-sm">{description}</p>}
    {action && (
      action.href
        ? <Link to={action.href} className="btn-primary">{action.label}</Link>
        : <button onClick={action.onClick} className="btn-primary">{action.label}</button>
    )}
  </div>
);
```

---

## 7. Feature Completion Checklist

**Action Loop**
- [ ] Does every button/action have a loading state?
- [ ] Is every successful action confirmed to the user via toast/message?
- [ ] Is every error shown to the user with a clear message?
- [ ] Is there double-click protection? (disabled during loading)

**Navigation**
- [ ] Does clicking a profile photo go to the profile page?
- [ ] Does every notification click navigate to the correct page?
- [ ] Do all links inside notifications work?
- [ ] Do back buttons navigate to a logical page?
- [ ] Do protected pages redirect to login when unauthenticated?

**Data States**
- [ ] Is there an empty state when a list is empty?
- [ ] Is there a skeleton/spinner while data is loading?
- [ ] Is there a retry option when an error occurs?

**Notifications**
- [ ] Do relevant actions trigger notifications?
- [ ] Is real-time notification working (if using sockets)?
- [ ] Is the notification counter updated?
- [ ] Is read/unread state managed?

**Consistency**
- [ ] Do similar actions behave the same way?
- [ ] Do button labels correctly describe the action?
- [ ] Are success/error messages clear and consistent?
