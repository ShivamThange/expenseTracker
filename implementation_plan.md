# Smart Expense Splitter - Execution Plan

This document outlines the sequential execution strategy for building the Smart Expense Splitter application. This strategy strictly adheres to your detailed Agentic AI Development Plan, focusing on step-by-step modular progression, verification gates, and atomic commits.

## Proposed Execution Workflow

We will operate in a strictly sequential, phase-by-batch execution model. For each of the defined tasks, I will:
1. **Execute** the exact requirements (running commands, creating files, writing logic).
2. **Verify** the output using the specified verification steps.
3. **Commit** the changes to the local Git repository using the format `[TASK-XXX] Description`.
4. **Log** completion and any findings before moving to the next task.
5. **Stop for Review** at the designated Human Checkpoints.

---

## Agent Tasks Directory

Below are the detailed instructions for every task to be executed.

### Phase 1: Project Initialization

#### AGENT_TASK_001: Repository Setup
**Objective:** Initialize Next.js project with all dependencies
**Constraints:**
- Use Next.js 14.0.0 or higher
- TypeScript strict mode enabled
- Node.js 18+ required
**Commands:**
`npx create-next-app@latest expense-splitter --typescript --tailwind --app --no-src-dir`
`cd expense-splitter`
`npm install mongoose next-auth@beta bcryptjs resend react-email @tanstack/react-query zustand`
`npm install -D @types/bcryptjs`
**Verification:**
- package.json contains all listed dependencies
- npm run dev starts without errors
- TypeScript compiles without errors

#### AGENT_TASK_002: Environment Configuration
**Objective:** Setup environment variables and configuration files
**Create File:** `.env.local`
- MONGODB_URI=mongodb+srv://[PLACEHOLDER]
- NEXTAUTH_SECRET=[GENERATE_RANDOM_32_CHAR]
- NEXTAUTH_URL=http://localhost:3000
- RESEND_API_KEY=[PLACEHOLDER]
- GEMINI_API_KEY=[PLACEHOLDER]
**Create File:** `.env.example` (copy of .env.local with PLACEHOLDER)
**Update File:** `.gitignore` (append .env.local)
**Verification:**
- .env.local exists and not in git
- .env.example committed
- Next.js reads environment variables

#### AGENT_TASK_003: Project Structure Creation
**Objective:** Create complete folder structure
**Execute:**
- Create nested directories for auth, dashboard, API routes, library models, UI components, types, and hooks according to Next.js 14 App Router conventions.
**Verification:** Structure is fully created and conforms to Next.js best practices conventions.

---

### Phase 2: Database Layer (Human Checkpoint 1)

#### AGENT_TASK_101: MongoDB Connection Singleton
**Objective:** Create reusable database connection (`lib/db/connection.ts`)
**Requirements:**
- Singleton pattern
- Connection pooling enabled
- Error handling with retry logic (max 3)
- TypeScript typed

#### AGENT_TASK_102: User Model Schema
**Objective:** Create User mongoose model with validation (`lib/models/User.ts`)
**Schema Requirements:** email (unique, required), passwordHash (select: false), name, emailVerified, avatar, tokens...
**Indexes:** email (unique), createdAt
**Methods:** comparePassword, generateVerificationToken, generateResetToken

#### AGENT_TASK_103: Group Model Schema
**Objective:** Create Group model with member relationship (`lib/models/Group.ts`)
**Schema Requirements:** name, description, ownerId, memberIds, currency
**Indexes:** ownerId, memberIds
**Validations:** ownerId must be in memberIds, 2-50 limits. Pre-save hooks.

#### AGENT_TASK_104: Expense Model Schema
**Objective:** Create Expense model with split calculation (`lib/models/Expense.ts`)
**Schema Requirements:** groupId, description, amount, category, payerId, splits, createdBy
**Indexes:** groupId, createdAt, compound
**Validations:** splits must equal total amount, users must be in group.

#### AGENT_TASK_105: Invitation Model Schema
**Objective:** Create invitation system for group members (`lib/models/Invitation.ts`)
**Schema Requirements:** groupId, inviterUserId, inviteeEmail, status (pending, accepted...), token, expiresAt
**Indexes:** token, inviteeEmail+groupId

> [!WARNING]
> **Human Checkpoint 1:** I will pause here for review of the database setups before entering Phase 3.

---

### Phase 3: Authentication System

#### AGENT_TASK_201: NextAuth Configuration
**Objective:** Setup NextAuth with credentials provider (`lib/auth/auth.config.ts` and `app/api/auth/[...nextauth]/route.ts`)
**Requirements:** Credentials provider processing email/password authentication checking `emailVerified` and utilizing JWT strategy.

#### AGENT_TASK_202: Registration API Endpoint
**Objective:** Create user registration endpoint (`app/api/auth/register/route.ts`)
**Requirements:** Validate user inputs, hash passwords, check overlaps, save to DB, and send verification email. Returns HTTP error codes for invalid input logic cleanly.

#### AGENT_TASK_203: Email Verification System
**Objective:** Create email verification flow
**Components:**
- `lib/email/templates/verification.tsx` (React Email UI)
- `lib/email/send.ts` (Resend implementation)
- `app/api/auth/verify-email/route.ts`
- `app/(auth)/verify-email/page.tsx`

#### AGENT_TASK_204: Password Reset Flow
**Objective:** Implement forgot password functionality
**Components:**
- APIs for `/forgot-password` and `/reset-password`
- React email UI template `password-reset.tsx`

---

### Phase 4: Protected Routes & Data Access (Human Checkpoint 2)

#### AGENT_TASK_301: Authentication Middleware
**Objective:** Protect dashboard routes from unauthenticated access (`middleware.ts`). Redirect to login when unauthenticated, limit paths `/dashboard/*`, etc.

#### AGENT_TASK_401: Secure Data Access Utilities
**Objective:** Create utilities that enforce user-scoped queries (`lib/db/queries/groups.ts`). Queries to get groups, add members natively verify ownership.

#### AGENT_TASK_402: Expense Data Access Layer
**Objective:** Create secure expense queries (`lib/db/queries/expenses.ts`). Operations scope around user ownership/group-membership validation prior to data querying.

#### AGENT_TASK_403: Balance Calculation Engine
**Objective:** Implement debt settlement algorithm (`lib/utils/balance-calculator.ts`)
**Algorithm Requirements:**
- Total balances via map
- Minimize transactions using greedy settlement algorithm mapping Creditor vs Debtor differences natively.

> [!WARNING]
> **Human Checkpoint 2:** A critical checkpoint to ensure data-access scopes and balance calculator engines perform securely.

---

### Phase 5 & 6: API Routes & AI Layers

#### AGENT_TASK_501-504: API Routes Integration
Create robust sets of route handlers for Groups (`api/groups`), Expenses (`api/expenses`), Balances (`api/groups/[id]/balances`), and Invitations (`api/invitations`).

#### AGENT_TASK_601-603: AI Utilities and Controllers
**Components:** 
- `lib/ai/client.ts` with error handling, limits, timeout controls.
- `app/api/ai/categorize` mapping Gemini interpretation of text context.
- `app/api/ai/insights` delivering concise actionable insights based on aggregated logs.

---

### Phase 7, 8 & 9: Frontend, Emails, Mobile Apps (Human Checkpoint 3)

#### AGENT_TASK_701-708: Frontend React Development
Extensive integration scaffolding out `app/(auth)/login`, `register`, the Dashboard UI components, Group management workflows, complex Create Expense interfaces with calculations and visualizations, as well as a distinct Balance Settlement dashboard UI.

#### AGENT_TASK_801-803: Complete Email Stack
Generate welcome templates, expense notifications, generic alerts mapping onto the `lib/email/sender.ts` function, tied directly into User Notification Preferences schemas.

#### AGENT_TASK_901-903: PWA / Mobile Orientations
Inject `manifest.json` setups alongside targeted mobile UI sweeps handling proper gesture controls (swipe actions), bottom-sheets, responsive audit repairs.

> [!WARNING]
> **Human Checkpoint 3:** Full visual/interactive check required here.

---

### Phase 10 & 11: Application Performance & Checks

#### AGENT_TASK_1001-1002: Query & Network Performance
Introduce targeted Mongo indexes dynamically. Push React query caching logic alongside Webpack splitting tasks to trim payload boundaries maximally.

#### AGENT_TASK_1101-1103: Full Battery Sandbox testing
Create Unit (`jest`), Integration (`supertest`), and E2e Test Suites (`playwright`) confirming core mechanics logic maps cleanly in pipelines.

---

### Phase 12 & 13: Deployment, Audits, Launch Docs (Human Checkpoint 4)

#### AGENT_TASK_1201-1203: Vercel / Atlas Prep & Audits
Ready secrets and mapping, configure Vercel deployments tracking limits, enable generic Sentry alerting logs. Penetration testing scope sweeps run here confirming CSRF and data leakage vulnerabilities sealed.

#### AGENT_TASK_1301-1302: Knowledge Handover
Form User Guides and System Documentation mapping code architectures cleanly for project handover.

#### AGENT_TASK_1401: Deployment
Final checklist parsing 19 key metrics confirming functional behaviors and security thresholds before moving system state from Dev to Production pipelines.

---

## Open Questions

Before we begin `AGENT_TASK_001`:
1. **Gemini AI API Key:** Do you have a Gemini API key ready for use in `.env.local`?
2. **Resend Email Service:** Do you have a Resend API key prepared to drop into the `.env.local` file?
3. **Database Setup:** Will we be using a local MongoDB instance during development, or do you have a MongoDB Atlas URI ready?

Please review this alignment, answer the open questions, and confirm if you approve for me to execute **Phase 1** starting with `AGENT_TASK_001`.
