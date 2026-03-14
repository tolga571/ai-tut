# 🧠 CLAUDE — Master Configuration File (v3)

This file defines how Claude behaves, which rules to apply, and which workflows to follow across all projects. Copy this `.claude/` folder to the root of every new project.

---

## 📁 Structure

```
.claude/
├── CLAUDE.md
├── rules/
│   ├── 01-core-principles.md       ← SOLID, DRY, KISS, OOP
│   ├── 02-clean-code.md            ← Naming, constants, logging
│   ├── 03-security.md              ← Injection, XSS, JWT, Zod
│   ├── 04-project-structure.md     ← Folder & file structure
│   ├── 05-styling.md               ← TailwindCSS standards
│   ├── 06-ux-completeness.md       ← Auth guard, feedback, navigation
│   ├── 07-state-management.md      ← Zustand vs Redux — ask user
│   ├── 08-performance.md           ← Optimization & accessibility
│   ├── 09-github.md                ← Git workflow, commits, PROJECT.md
│   ├── 10-feature-completeness.md  ← Full domain thinking, no half-features
│   ├── 11-testing.md               ← Jest, Vitest, Supertest
│   ├── 12-production.md            ← Logging, caching, deploy, SEO, GDPR
│   └── 13-agent-roles.md           ← Agent Team Specialized Roles
├── workflows/
│   ├── 01-new-project.md
│   ├── 02-feature-development.md
│   ├── 03-api-development.md
│   ├── 04-database.md
│   └── 05-team-management.md       ← How to manage Agent Teams
└── skills/
    ├── mern-stack.md
    ├── nextjs.md
    ├── component-patterns.md
    ├── error-handling.md
    ├── socketio.md                  ← Real-time / Socket.IO
    ├── email.md                     ← Transactional email
    └── file-upload.md               ← Cloudinary / S3 / Multer
```

---

## ⚡ Quick Reference — Core Rules

| Topic | Rule |
|-------|------|
| **GitHub** | Feature branches always, commit convention required, PROJECT.md mandatory |
| **Language** | TypeScript required, `any` FORBIDDEN |
| **OOP** | Always follow SOLID principles |
| **Security** | Zod + helmet + rateLimit on every project |
| **Auth** | Protected routes → redirect to login, never show directly |
| **UX** | Every action must have loading + success + error state |
| **Navigation** | Every clickable element must navigate somewhere |
| **Notifications** | Actions must trigger notifications; all links must work |
| **State** | Evaluate Zustand/Redux at project start — ask user to decide |
| **Styling** | TailwindCSS required, separate CSS files FORBIDDEN |
| **Structure** | Component/Page separation must always be maintained |
| **Constants** | All static data in `constants/` as typed objects |
| **API** | Validate + sanitize + auth + rate limit required |
| **Errors** | Global error handler + custom error classes |
| **Lists** | Every list must show empty state + skeleton |
| **Feature scope** | Implement the FULL domain — all actions, reverses, pages, notifications, history, edge cases |
| **Testing** | Auth, payments, critical business logic must have tests |
| **Real-time** | Use Socket.IO — never poll |
| **Email** | Email failures never crash main flow. Reset tokens hashed & expire in 1hr |
| **Files** | Never store on disk — always cloud (S3/Cloudinary) |
| **Production** | Winston + Sentry + Redis + Docker/PM2 for production projects |

---

## 🔄 Which File to Read & When

| Situation | File |
|-----------|------|
| Git workflow / commits / PROJECT.md | `rules/09-github.md` |
| Starting a new project | `workflows/01-new-project.md` |
| OOP / SOLID / error classes | `rules/01-core-principles.md` |
| Naming / constants / logging | `rules/02-clean-code.md` |
| Deciding state management | `rules/07-state-management.md` |
| Building auth / login | `rules/06-ux-completeness.md` + `rules/03-security.md` |
| Writing a new endpoint | `workflows/03-api-development.md` + `rules/03-security.md` |
| Writing React components | `skills/component-patterns.md` + `rules/05-styling.md` |
| MERN patterns / auth / router | `skills/mern-stack.md` |
| Building any feature | `rules/09-feature-completeness.md` (ALWAYS) |
| Adding a feature to existing project | `workflows/02-feature-development.md` + `rules/09-feature-completeness.md` |
| Notification system | `rules/06-ux-completeness.md` + `skills/socketio.md` |
| Real-time / chat | `skills/socketio.md` |
| Email flows | `skills/email.md` |
| File / avatar upload | `skills/file-upload.md` |
| Database operations | `workflows/04-database.md` |
| Next.js project | `skills/nextjs.md` |
| Error / edge cases | `skills/error-handling.md` + `rules/08-performance.md` |
| Writing tests | `rules/10-testing.md` |
| Going to production | `rules/11-production.md` |
| Managing Agent Teams | `workflows/05-team-management.md` + `rules/13-agent-roles.md` |

---

## 🚦 New Project — Mandatory Steps

1. **Determine project type** → `workflows/01-new-project.md`
2. **Ask about state management** → `rules/07-state-management.md`
3. **Ask about payment provider** (if e-commerce)
4. **Ask about email provider** → `skills/email.md`
5. **Ask about file storage** (if uploads needed) → `skills/file-upload.md`
6. **Set up auth guard** → `rules/06-ux-completeness.md`
7. **Add security middlewares** → `rules/03-security.md`
8. **Create folder structure** → `rules/04-project-structure.md`
9. **Initialize git + create PROJECT.md** → `rules/09-github.md`

---

## 🚫 Never Do

**GitHub**
- Never push directly to `main` branch
- Never commit `.env` files
- Never leave `.claude/` in `.gitignore`
- Never write uninformative commit messages (`fix`, `update`, `wip`)
- Never forget to update `PROJECT.md` when a module is completed

**TypeScript**
- Never use `any` type
- Never hardcode `.env` values

**Security**
- Never concatenate raw SQL/NoSQL queries with user input
- Never open an endpoint without Zod validation
- Never expose a protected route without auth middleware

**UX**
- Never leave users without feedback (loading/success/error)
- Never leave broken links or dead-end navigation
- Never show a protected page without authentication
- Never forget profile/content links inside notifications

**Feature Completeness**
- Never implement only the surface of a feature
- Never create a UI section without a backing route
- Never add a button without a working handler
- Never implement one side of a relationship without the other
- Always announce full scope before writing code

**Infrastructure**
- Never store uploaded files on the server disk
- Never let email failures crash the main request
- Never store raw password reset tokens in the database
- Never leave `console.log` in production

**Code Quality**
- Never write business logic inside a component
- Never define static data inside a component
- Never use inline styles or separate CSS files
- Never render a list without empty state and skeleton
