# 09 — Feature Completeness & Domain Thinking

## Core Rule

> When a feature is requested, **never implement only the surface**.
> Think through the full domain: every action, every reverse action, every state,
> every related page, every notification, every edge case — then implement all of it.
>
> A feature is complete when a real user can use it end-to-end without hitting a dead end.
>
> **This rule applies to EVERY feature in EVERY type of project — no exceptions.**

---

## Universal Mental Model

Apply these 8 questions to **any** feature before writing a single line of code:

```
1. ACTIONS        — What are ALL the actions a user can perform in this domain?
2. REVERSE        — What is the reverse/undo of each action?
3. STATES         — What states can this entity be in? Model them as an enum.
4. PAGES          — What pages/routes does a user need to fully navigate this feature?
5. NOTIFICATIONS  — What events should trigger a notification to which user?
6. PERSISTENCE    — What history/data must survive a page refresh or session?
7. PERMISSIONS    — Who can do what? What is restricted and for whom?
8. EDGE CASES     — What can go wrong, conflict, or be misused?
```

If you cannot answer all 8, the feature is not fully understood yet — clarify before implementing.

---

## Universal Completion Checklist

For **any** feature, verify before marking complete:

**Actions & Reverse Actions**
- [ ] Every action has a corresponding reverse/undo (add → remove, send → cancel, publish → unpublish)
- [ ] Every destructive action has a confirmation step
- [ ] Every form has a cancel/discard path

**Pages & Navigation**
- [ ] Every section/tab that exists in the UI has a real backing route
- [ ] Every list item is clickable and navigates to a detail page
- [ ] Every "go back" / breadcrumb leads somewhere logical
- [ ] No dead ends — user can always navigate forward and backward

**States**
- [ ] Every possible entity state is handled in the UI
- [ ] Every button/label reflects the current state (not a generic static label)
- [ ] Loading, empty, and error states exist for every data-dependent view

**Data & Persistence**
- [ ] History/logs are stored where expected (messages, orders, activity, etc.)
- [ ] Data survives page refresh
- [ ] Lists are paginated — never load everything at once
- [ ] Deleted items are handled cleanly across all views (no orphaned references)

**Notifications**
- [ ] Every significant event notifies the relevant user(s)
- [ ] Every notification link navigates to the exact relevant content
- [ ] Notification counter/badge updates in real time

**Permissions**
- [ ] Users can only perform actions they are authorized for
- [ ] Restricted content is hidden or disabled — not just unlinked
- [ ] Owner-only actions (edit/delete) are not visible to other users

**Edge Cases**
- [ ] What if the related entity is deleted? (orphaned references handled)
- [ ] What if the user triggers the same action twice? (idempotency)
- [ ] What if two users act simultaneously? (conflict handling)
- [ ] Are min/max constraints enforced in both UI and backend?

---

## Implementation Protocol (Every Feature)

### Step 1 — Announce Full Scope Before Coding

Before writing any code, output a scope summary:

```
Feature: [Feature Name]

BACKEND
Models:        [list new/modified models]
Endpoints:     [list all endpoints — method + path]

FRONTEND
Pages/Routes:  [list all new routes]
Components:    [list key new components]
State:         [what needs to be stored/tracked]
Hooks:         [new custom hooks]
Notifications: [what fires, to whom, on what event]

Edge cases I'll handle: [brief list]

Shall I proceed, or would you like to adjust the scope?
```

### Step 2 — Implementation Order

```
DB Schema/Model → Zod Validation → Repository → Service → Controller → Routes
→ API Service (frontend) → Custom Hooks → Pages → Components → Notifications → Edge Cases
```

### Step 3 — Self-Check (Walk Through as a Real User)

1. Can I complete every action from start to finish?
2. Can I undo/reverse every action?
3. Do all UI elements navigate correctly with no dead ends?
4. Does data persist after a page refresh?
5. Do notifications fire and link to the correct content?
6. Are all restricted paths enforced at the backend level?

---

## Domain Examples (Illustrative — Not Exhaustive)

> These examples show how to apply the mental model. The same 8-question logic
> applies equally to any feature you build — these are not special cases.

### 👥 Friend System
| Dimension | Must Include |
|-----------|-------------|
| Actions | Send request, accept, decline, cancel, remove friend, block, unblock, report |
| States | `none \| pending_sent \| pending_received \| friends \| blocked \| blocked_by` |
| Pages | `/friends`, `/friends/requests` (tabs: incoming/outgoing), `/friends/suggestions`, `/blocked` |
| Notifications | Request received → recipient; Request accepted → sender |
| Persistence | Friend list, pending count badge, block list enforced on both sides |
| Edge cases | Can't request yourself, can't request blocked user, block cancels pending requests |

### 💬 Messaging / Chat
| Dimension | Must Include |
|-----------|-------------|
| Actions | Send, edit own message, delete own message, mark read, delete conversation (self only) |
| States | `sent \| delivered \| read \| deleted` |
| Pages | `/messages` (conversation list), `/messages/:userId` (full history, paginated) |
| Notifications | New message → recipient in real time (socket) |
| Persistence | Full message history loads on open, unread badge in nav |
| Edge cases | Deleted messages show placeholder, blocked users cannot message each other |

### 🛒 E-Commerce
| Dimension | Must Include |
|-----------|-------------|
| Actions | Add to cart, update qty, remove, save for later, checkout, cancel order, request return |
| States | Product: `draft\|active\|out_of_stock\|archived` — Order: `pending\|confirmed\|shipped\|delivered\|returned` |
| Pages | `/products`, `/products/:id`, `/cart`, `/checkout`, `/orders`, `/orders/:id`, `/seller/products`, `/seller/orders` |
| Notifications | Order confirmed/shipped/delivered → buyer; New order + low stock → seller |
| Persistence | Cart survives session, full order history, stock decrements atomically |
| Edge cases | Out-of-stock flagged in cart before checkout, cart item removed if product deleted |

### 🏠 Real Estate
| Dimension | Must Include |
|-----------|-------------|
| Actions | Create/edit/delete listing, save/unsave, contact owner, schedule viewing, mark as sold/rented |
| States | `draft \| active \| rented \| sold \| expired` |
| Pages | `/listings`, `/listings/:id`, `/listings/create`, `/my-listings`, `/favorites`, `/viewings` |
| Notifications | New inquiry → owner; Viewing scheduled → both parties |
| Persistence | Saved listings, viewing history, inquiry threads per listing |
| Edge cases | Expired/sold listings hidden from search, direct URL shows archived state |

### 📰 Blog / Content Platform
| Dimension | Must Include |
|-----------|-------------|
| Actions | Create, edit, delete, publish, unpublish, like, unlike, comment, reply, delete own comment, bookmark |
| States | `draft \| published \| archived` |
| Pages | `/blog`, `/blog/:slug`, `/blog/create`, `/blog/edit/:id`, `/dashboard/posts`, `/bookmarks` |
| Notifications | Comment on post → author; Reply → commenter |
| Persistence | Draft auto-save, bookmark list, comment threads |
| Edge cases | Unpublished post inaccessible via URL to non-authors, deleted post shows graceful 404 |

### ⭐ Reviews & Ratings
| Dimension | Must Include |
|-----------|-------------|
| Actions | Write review, edit own review, delete own review, report review, helpful vote |
| States | One review per user per item (enforced in backend) |
| Pages | Reviews section on detail page + `/my-reviews` |
| Notifications | New review → product/listing owner |
| Persistence | Average rating recalculated on every write/edit/delete |
| Edge cases | Cannot review own product, can only review after verified purchase/interaction |

### 🔔 Notification System
| Dimension | Must Include |
|-----------|-------------|
| Actions | Mark as read, mark all as read, delete single notification |
| States | `unread \| read` |
| Pages | `/notifications` (paginated list) + bell badge in nav |
| Persistence | Unread count persists across pages, full history paginated |
| Edge cases | Notification for deleted content shows graceful fallback, not a broken link |

### 👤 User Profile
| Dimension | Must Include |
|-----------|-------------|
| Actions | Edit profile, change avatar, change password, delete account |
| States | `active \| suspended \| deleted` |
| Pages | `/profile` (own), `/profile/:id` (others — read-only), `/settings` |
| Notifications | Profile changes confirmation → user via email |
| Persistence | Avatar stored in cloud (S3/Cloudinary), profile data cached |
| Edge cases | Deleted account shows anonymized placeholder in content they created |

### 🔍 Search
| Dimension | Must Include |
|-----------|-------------|
| Actions | Search, filter, sort, clear filters, save search (if applicable) |
| States | loading, results found, no results, error |
| Pages | `/search?q=...` with shareable URL (filters in query params) |
| Persistence | Recent searches (localStorage), filter state in URL |
| Edge cases | Debounced input (min 2 chars), XSS-safe query display, empty state with suggestions |

---

## Feature Dependency Map

When a feature is requested, these are automatically implied:

| Requested Feature | Also Automatically Required |
|-------------------|-----------------------------|
| Any social action (friend, follow, like) | Notification system + User profiles |
| Messaging / Chat | Contact system + Notification system + Online status |
| Reviews / Ratings | Auth + Purchase/interaction verification |
| Notifications (any) | Socket.IO or SSE + `/notifications` page + nav badge |
| User profiles | Auth + Avatar upload + Profile edit + Settings page |
| Search | Debounce + Filters + Empty state + Loading state + Pagination + URL params |
| File / image upload | Type validation + Size limit + Cloud storage + Preview |
| Payments | Cart + Order system + Webhook handler + Refund flow + Email receipt |
| Comments | Auth + Nested replies + Edit/delete own + Report + Pagination |
| Follow / Subscribe | Feed/timeline + Notification system + Followers/following pages |
| Dashboard / Analytics | Data aggregation + Date filters + Loading skeletons + Export |
| Role-based access | Permission middleware + UI visibility rules + Audit log |
| Cart | Session persistence + Stock check at checkout + Out-of-stock handling |

---

## Anti-Patterns (Always Avoid)

```
❌ Implementing "add X" without "remove X"
❌ Creating a UI section or tab without a real backing route
❌ Adding a button with no working handler or destination
❌ Building a list with no detail page for its items
❌ Implementing only one side of a relationship (sender's view without recipient's)
❌ Adding a notification trigger without a notification list page
❌ Building history-dependent features (chat, orders) without loading that history
❌ Creating profile sections that display placeholders instead of real data
❌ Implementing any list without pagination
❌ Leaving entity states unhandled in the UI
❌ Hiding restricted content only in the frontend without backend enforcement
```
