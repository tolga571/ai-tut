# Skill — Socket.IO & Real-time

## Core Rule

> Any feature involving live updates (chat, notifications, online status, live feeds)
> must use Socket.IO. Never poll the server repeatedly — use events.

---

## Backend Setup

```typescript
// src/config/socket.ts
import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { env } from '@/config/env';

export const initSocket = (httpServer: HttpServer): Server => {
  const io = new Server(httpServer, {
    cors: { origin: env.CORS_ORIGIN, credentials: true },
    pingTimeout: 60000,
  });

  // Auth middleware — verify JWT on connection
  io.use((socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
    if (!token) return next(new Error('Unauthorized'));

    try {
      const payload = jwt.verify(token, env.JWT_SECRET) as { userId: string };
      socket.data.userId = payload.userId;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.data.userId;

    // Join personal room — for targeted events
    socket.join(`user:${userId}`);

    // Track online status
    socket.broadcast.emit('user:online', { userId });

    socket.on('disconnect', () => {
      socket.broadcast.emit('user:offline', { userId });
    });
  });

  return io;
};

// src/app.ts — wire it up
import { createServer } from 'http';
import { initSocket } from '@/config/socket';

const app = createApp();
const httpServer = createServer(app);
const io = initSocket(httpServer);

// Make io available in services via dependency injection
export { io };

httpServer.listen(env.PORT, () => logger.info(`Server running on port ${env.PORT}`));
```

---

## Room Strategy

```typescript
// Use rooms to target specific recipients — never broadcast to everyone

// Personal room (notifications, DMs)
socket.join(`user:${userId}`);
io.to(`user:${userId}`).emit('notification:new', data);

// Conversation room (group chat / DM thread)
socket.join(`conversation:${conversationId}`);
io.to(`conversation:${conversationId}`).emit('message:new', message);

// Resource room (live updates on a specific post/order)
socket.join(`post:${postId}`);
io.to(`post:${postId}`).emit('comment:new', comment);
```

---

## Event Naming Convention

```typescript
// Format: resource:action
// Always use past tense for "something happened" events

'message:new'           // new message received
'message:deleted'       // message was deleted
'message:read'          // message was marked read
'notification:new'      // new notification
'notification:read_all' // all notifications marked read
'user:online'           // user came online
'user:offline'          // user went offline
'user:typing'           // user is typing
'order:status_changed'  // order status updated
'friend:request_received'
'friend:request_accepted'
```

---

## Chat Implementation

```typescript
// Backend — chat events
io.on('connection', (socket) => {
  const userId = socket.data.userId;

  // Join a conversation
  socket.on('conversation:join', (conversationId: string) => {
    socket.join(`conversation:${conversationId}`);
  });

  socket.on('conversation:leave', (conversationId: string) => {
    socket.leave(`conversation:${conversationId}`);
  });

  // Typing indicator
  socket.on('message:typing', ({ conversationId }: { conversationId: string }) => {
    socket.to(`conversation:${conversationId}`).emit('message:typing', { userId });
  });

  socket.on('message:stop_typing', ({ conversationId }: { conversationId: string }) => {
    socket.to(`conversation:${conversationId}`).emit('message:stop_typing', { userId });
  });
});

// Backend — emit when message saved
export class MessageService {
  constructor(private io: Server) {}

  async send(senderId: string, dto: SendMessageDto) {
    const message = await messageRepository.create({ ...dto, senderId });

    // Emit to conversation room
    this.io.to(`conversation:${dto.conversationId}`).emit('message:new', message);

    // Notify recipient if not in the conversation room
    this.io.to(`user:${dto.recipientId}`).emit('notification:new', {
      type: 'message',
      actorId: senderId,
      message: 'sent you a message',
    });

    return message;
  }
}
```

---

## Frontend Setup

```typescript
// src/lib/socket.ts
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/authStore';

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    const token = useAuthStore.getState().accessToken;
    socket = io(import.meta.env.VITE_API_URL, {
      auth: { token },
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
  }
  return socket;
};

export const connectSocket = () => getSocket().connect();
export const disconnectSocket = () => { socket?.disconnect(); socket = null; };
```

```typescript
// src/hooks/useSocket.ts
import { useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';
import { connectSocket, disconnectSocket, getSocket } from '@/lib/socket';
import { useAuthStore } from '@/store/authStore';

export const useSocket = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated) return;

    const s = getSocket();
    connectSocket();
    setSocket(s);

    s.on('connect',    () => setIsConnected(true));
    s.on('disconnect', () => setIsConnected(false));

    return () => {
      s.off('connect');
      s.off('disconnect');
      disconnectSocket();
    };
  }, [isAuthenticated]);

  return { socket, isConnected };
};
```

---

## Notification Hook

```typescript
// src/hooks/useNotifications.ts
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

## Chat Hook

```typescript
// src/hooks/useChat.ts
export const useChat = (conversationId: string) => {
  const { socket } = useSocket();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket || !conversationId) return;

    socket.emit('conversation:join', conversationId);

    socket.on('message:new', (message: Message) => {
      setMessages(prev => [...prev, message]);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.conversations.all });
    });

    socket.on('message:typing',      () => setIsTyping(true));
    socket.on('message:stop_typing', () => setIsTyping(false));

    return () => {
      socket.emit('conversation:leave', conversationId);
      socket.off('message:new');
      socket.off('message:typing');
      socket.off('message:stop_typing');
    };
  }, [socket, conversationId]);

  const sendTyping = useCallback(() => {
    socket?.emit('message:typing', { conversationId });
  }, [socket, conversationId]);

  return { messages, isTyping, sendTyping };
};
```

---

## Online Status

```typescript
// src/hooks/useOnlineStatus.ts
export const useOnlineStatus = () => {
  const { socket } = useSocket();
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!socket) return;

    socket.on('user:online',  ({ userId }) => setOnlineUsers(prev => new Set([...prev, userId])));
    socket.on('user:offline', ({ userId }) => setOnlineUsers(prev => { const s = new Set(prev); s.delete(userId); return s; }));

    return () => { socket.off('user:online'); socket.off('user:offline'); };
  }, [socket]);

  const isOnline = (userId: string) => onlineUsers.has(userId);
  return { isOnline };
};

// Usage in component
const { isOnline } = useOnlineStatus();
<div className={cn('w-2 h-2 rounded-full', isOnline(userId) ? 'bg-green-500' : 'bg-gray-300')} />
```

---

## Socket Checklist (Per Real-time Feature)

- [ ] Auth middleware on socket connection?
- [ ] User joined their personal room on connect?
- [ ] Correct room strategy used (personal/conversation/resource)?
- [ ] Event names follow `resource:action` convention?
- [ ] Frontend cleans up listeners on unmount?
- [ ] Reconnection handling configured?
- [ ] Disconnect updates online status?
