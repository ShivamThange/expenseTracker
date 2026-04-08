# Smart Expense Splitter Tasks

## Phase 1: Project Initialization
- `[x]` AGENT_TASK_001: Repository Setup
- `[x]` AGENT_TASK_002: Environment Configuration
- `[x]` AGENT_TASK_003: Project Structure Creation

## Phase 2: Database Layer
- `[x]` AGENT_TASK_101: MongoDB Connection Singleton
- `[x]` AGENT_TASK_102: User Model Schema
- `[x]` AGENT_TASK_103: Group Model Schema
- `[x]` AGENT_TASK_104: Expense Model Schema
- `[x]` AGENT_TASK_105: Invitation Model Schema

## Phase 3: Authentication System
- `[x]` AGENT_TASK_201: NextAuth Configuration
- `[x]` AGENT_TASK_202: Registration API Endpoint
- `[x]` AGENT_TASK_203: Email Verification System
- `[x]` AGENT_TASK_204: Password Reset Flow

## Phase 4: Protected Routes & Data Access
- `[x]` AGENT_TASK_301: Authentication Middleware
- `[x]` AGENT_TASK_401: Secure Data Access Utilities (`lib/db/queries/groups.ts`)
- `[x]` AGENT_TASK_402: Expense Data Access Layer (`lib/db/queries/expenses.ts`)
- `[x]` AGENT_TASK_403: Balance Calculation Engine (`lib/utils/balance-calculator.ts`)

## Phase 5 & 6: API Routes & AI Layers
- `[x]` AGENT_TASK_501: `GET/POST /api/groups`
- `[x]` AGENT_TASK_502: `GET/PATCH/DELETE /api/groups/[id]`, members, balances
- `[x]` AGENT_TASK_503: `GET/POST /api/expenses`, `GET/PATCH/DELETE /api/expenses/[id]`
- `[x]` AGENT_TASK_504: `POST /api/invitations`, `GET/POST /api/invitations/[token]`, accept
- `[ ]` AGENT_TASK_601-603: AI Utilities and Controllers

## Phase 7, 8 & 9: Frontend, Emails, Mobile Apps
- `[ ]` AGENT_TASK_701-708: Frontend React Development
- `[ ]` AGENT_TASK_801-803: Complete Email Stack
- `[ ]` AGENT_TASK_901-903: PWA / Mobile Orientations

## Phase 10 & 11: Application Performance & Checks
- `[ ]` AGENT_TASK_1001-1002: Query & Network Performance
- `[ ]` AGENT_TASK_1101-1103: Full Battery Sandbox testing

## Phase 12 & 13: Deployment, Audits, Launch Docs
- `[ ]` AGENT_TASK_1201-1203: Vercel / Atlas Prep & Audits
- `[ ]` AGENT_TASK_1301-1302: Knowledge Handover
- `[ ]` AGENT_TASK_1401: Deployment
