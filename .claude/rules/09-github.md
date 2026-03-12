# 09 — GitHub & Version Control

## Core Rules

- `main` branch is **sacred** — never push directly to main
- Every feature, fix, or refactor lives in its own branch
- `.claude/` folder is **always committed** — never in `.gitignore`
- `.env` files are **always in `.gitignore`** — never committed
- `PROJECT.md` is **required** in every repo root

---

## Branch Strategy

```bash
# Branch naming convention
feature/user-auth           # new feature
feature/order-module
fix/login-redirect-loop     # bug fix
fix/notification-link
refactor/user-repository    # code improvement (no behavior change)
security/rate-limit-auth    # security improvement
hotfix/payment-crash        # urgent production fix

# Workflow
git checkout -b feature/order-module   # create branch
# ... code ...
git add . && git commit -m "..."       # commit
git push origin feature/order-module  # push
# → open PR → review → merge to main
```

---

## Commit Message Convention

```bash
# Format: type(scope): short description
#
# Types:
# feat     → new feature
# fix      → bug fix
# refactor → code change, no behavior change
# security → security improvement
# style    → formatting, missing semicolons, etc.
# docs     → documentation only
# test     → adding or fixing tests
# chore    → build process, dependency updates
# perf     → performance improvement

# Examples
feat(auth): add JWT refresh token rotation
feat(order): add order creation endpoint
fix(auth): resolve token expiry redirect loop
fix(notification): broken profile link on friend request
refactor(user): extract repository pattern from service
security(api): add rate limiting to all auth routes
docs(readme): add environment setup instructions
chore(deps): upgrade mongoose to v8

# Breaking change
feat!: rename /api/users to /api/v1/users

# Rules:
# - Present tense ("add" not "added")
# - No capital first letter
# - No period at the end
# - Max 72 characters
# - Scope is the module/area affected
```

---

## Required `PROJECT.md` (Every Repo)

```markdown
# ProjectName

## Tech Stack
- **Backend:** Node.js, Express, MongoDB/Mongoose
- **Frontend:** React (Vite) / Next.js
- **State:** Zustand
- **Styling:** TailwindCSS
- **Auth:** JWT + httpOnly cookies

## Module Status

| Module | Status | Notes |
|--------|--------|-------|
| Auth | ✅ Done | JWT, refresh token, bcrypt |
| User | ✅ Done | CRUD, avatar upload |
| Product | 🚧 In Progress | Listing done, filters pending |
| Order | ⏳ Pending | |
| Payment | ⏳ Pending | Iyzico integration |

## Key Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| State management | Zustand | Small-medium scale, minimal boilerplate |
| Database | MongoDB | Flexible schema for product variants |
| File storage | Cloudinary | Free tier sufficient, easy SDK |
| Email | Resend | Simple API, good free tier |

## Environment Variables
See `.env.example` for required variables.

## Setup
```bash
git clone <repo>
cd <repo>
cp .env.example .env
npm install
npm run dev
```

## API Base URL
- Development: `http://localhost:5000/api/v1`
- Production: `https://api.yourdomain.com/api/v1`
```

---

## Required `.gitignore`

```bash
# Dependencies
node_modules/
.pnp
.pnp.js

# Environment — NEVER commit these
.env
.env.local
.env.development
.env.production
.env.test

# Build outputs
dist/
build/
.next/
out/

# Logs
logs/
*.log
npm-debug.log*

# OS files
.DS_Store
Thumbs.db

# Editor
.vscode/settings.json
.idea/

# Uploads (local dev only)
uploads/
public/uploads/

# ✅ DO NOT add .claude/ here — it must stay in the repo
```

---

## README.md Standard

Every project must have a `README.md` that covers:

```markdown
# Project Name

Short description (1-2 sentences).

## Features
- Feature 1
- Feature 2

## Tech Stack
- Node.js, Express, MongoDB
- React, TailwindCSS, Zustand

## Prerequisites
- Node.js >= 18
- MongoDB running locally or Atlas URI

## Setup

```bash
git clone https://github.com/user/project
cd project
cp .env.example .env   # fill in your values
npm install
npm run dev
```

## Project Structure
```
src/
├── modules/     # feature modules (user, auth, product...)
├── middleware/  # auth, validation, error handler
├── config/      # env, database, logger
└── utils/       # ApiResponse, catchAsync, errors
```

## Environment Variables
| Variable | Description | Example |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/db` |
| `JWT_SECRET` | Min 32 chars random string | `...` |
| `PORT` | Server port | `5000` |

## API Documentation
Base URL: `http://localhost:5000/api/v1`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/register` | ❌ | Register new user |
| POST | `/auth/login` | ❌ | Login |
| GET | `/users` | ✅ | List users |
```

---

## AI Continuation Prompt (New Chat Template)

When starting a new AI chat session on an existing project, paste this:

```
Repo: https://github.com/username/project-name

Please read PROJECT.md and the .claude/ folder first.

Current status: [copy Module Status table from PROJECT.md]

Next task: [describe what you want to build next]

Continue following all rules in .claude/
```

---

## Pre-Commit Checklist

Before every commit, verify:

- [ ] No `.env` file staged (`git status` check)
- [ ] No hardcoded secrets or API keys in code
- [ ] No `console.log` left in production code
- [ ] TypeScript compiles without errors (`tsc --noEmit`)
- [ ] ESLint passes (`npm run lint`)
- [ ] Commit message follows convention
- [ ] `PROJECT.md` module status updated if a module was completed
