# Workflow 02 — Feature Development

## Before Starting

```bash
# Backend
mkdir -p src/modules/feature-name

# Frontend
mkdir -p src/components/shared src/pages/feature-name src/hooks
```

## Development Order

**Backend:**
```
Types/Interfaces → Schema/Model → Zod Validation → Repository → Service → Controller → Routes
```

**Frontend:**
```
Types → Constants → API Service → Custom Hook → Components → Page → Add to Router
```

---

## Git Commit Convention

```bash
# Format: type(scope): description
feat(user): add user creation endpoint
fix(auth): resolve token refresh loop
refactor(database): extract repository pattern
security(api): add rate limiting to auth routes
docs(readme): update setup instructions
test(user): add unit tests for user service
chore(deps): upgrade dependencies

# Breaking change
feat!: rename user endpoint
```

---

## Code Review Checklist

**Security**
- [ ] Input validation in place?
- [ ] Auth/authz checked?
- [ ] SQL/NoSQL injection risk?
- [ ] Sensitive data being logged?
- [ ] Rate limiting needed?

**Quality**
- [ ] SOLID principles applied?
- [ ] Correct Component/Page separation?
- [ ] Static data in constants/?
- [ ] TypeScript `any` used?
- [ ] Error handling complete?

**Performance**
- [ ] Unnecessary re-renders?
- [ ] N+1 query problem?
- [ ] DB indexes considered?
- [ ] Pagination implemented?

**UX (see rules/06-ux-completeness.md)**
- [ ] TailwindCSS used?
- [ ] Responsive design?
- [ ] Loading state shown?
- [ ] Empty state shown?
- [ ] Error state shown?
- [ ] All clickable elements navigate correctly?
- [ ] Notifications triggered where needed?
