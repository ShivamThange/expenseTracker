# Smart Expense Splitter - AI Context Window

This file serves as persistent memory across conversations. The Assistant must refer to this file to establish context before planning or writing code.

---

## Overall Progress Map

- ✅ **Phase 1 (Project Initialization)**: Next.js App Router setup with Tailwind CSS v4.
- ✅ **Phase 2 (Database Layer)**: MongoDB connection singleton (`lib/db/connection.ts`). Models created: `User`, `Group`, `Expense`, `Invitation`.
- ✅ **Phase 3 (Authentication System)**: NextAuth v5 (beta) setup with Credentials Provider. Edge-compatible `middleware.ts` guarding `/dashboard`. Registration, Verification, and Password Reset APIs implemented using React Email & Resend. Foundational Auth UI forms mapped under `app/(auth)`.
- ✅ **Phase 4 (Protected Routes & Data Access)**: COMPLETE. DAL implemented: `lib/db/queries/groups.ts` (group CRUD + membership gating), `lib/db/queries/expenses.ts` (expense CRUD + member validation), `lib/utils/balance-calculator.ts` (greedy debt-settlement algorithm).
- ✅ **Phase 5 (API Routes)**: COMPLETE. REST endpoints for Groups (`/api/groups`, `/api/groups/[id]`, members, balances), Expenses (`/api/expenses`, `/api/expenses/[id]`), and Invitations (`/api/invitations`, `/api/invitations/[token]`, accept). All routes session-gated and delegate to the Phase 4 DAL.
- ⏳ **Phase 6 (AI Layer)**: PENDING. (Gemini categorize + insights endpoints).
- ⏳ **Phase 7+ (Frontend)**: PENDING. (Dashboard UI, Group/Expense management, Balance visualisation).

## Key Architectural Decisions & Gotchas

1. **Next.js Version Constraints**: We are using a custom framework version where `params` inside Route Handlers (`route.ts`) are `Promise` based. API route implementations must await `params`.
2. **NextAuth Edge vs Node limitations**: 
   - `middleware.ts` runs on the Edge runtime and **cannot** import Node native modules (`net`, `tls`, `mongoose`, `crypto` directly).
   - Our configuration splits into `lib/auth/auth.config.ts` (Edge-safe, handles session rules) and `lib/auth/auth.ts` (Node-JS only, includes Credentials Provider and MongoDB resolution).
3. **Database Approach**: Using customized `connectToDatabase` singleton heavily relying on hot-reload caches for Next.js dev server. Queries utilize Lean mappings exclusively.
4. **Email Routing**: Integrated standard Resend SDK linked natively to React Email templates defined in `lib/email/templates`.
5. **Data Access Layer (DAL)**: `lib/db/queries/` files use `import 'server-only'` and always accept a `userId` param for ownership/membership checks before any DB read or write. All functions return plain DTOs (via `.lean()`), never raw Mongoose documents. The balance calculator (`lib/utils/balance-calculator.ts`) is pure (no DB calls) and can be used server-side or client-side for optimistic UI.
