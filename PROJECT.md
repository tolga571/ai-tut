# AiTut — AI Destekli Dil Öğrenme Platformu

## Tech Stack
- **Framework:** Next.js 14 (App Router)
- **Database:** PostgreSQL + Prisma ORM
- **Auth:** NextAuth.js (JWT + Credentials)
- **AI:** Google Gemini 2.5 Flash
- **Payment:** Paddle
- **State:** Zustand
- **Styling:** TailwindCSS
- **Validation:** Zod v4

## Module Status

| Module | Status | Notes |
|--------|--------|-------|
| Auth (Register/Login) | Done | JWT, bcrypt, Credentials provider |
| Chat / AI Conversation | Done | Gemini AI, bilingual responses |
| Conversation History | Done | CRUD, sidebar list |
| User Profile | Done | Name, language settings |
| Payment (Paddle) | Done | Subscription flow, webhook |
| Onboarding | Done | Language selection |
| Security (Zod + Rate Limit) | Done | All endpoints validated |
| Logging | Done | Structured logger |

## Key Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| State management | Zustand | Small project, minimal boilerplate |
| Database | PostgreSQL | Reliable, Prisma support |
| AI Provider | Google Gemini | Good multilingual support, JSON mode |
| Payment | Paddle | MoR (Merchant of Record), handles tax |
| Validation | Zod v4 | TypeScript-first, latest version |

## Environment Variables
See `.env.example` for required variables.

## Setup
```bash
git clone <repo>
cd ai-tut
cp .env.example .env
npm install
npx prisma generate
npx prisma db push
npm run dev
```

## API Base URL
- Development: `http://localhost:3000/api`
