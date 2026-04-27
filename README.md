<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16.2-black?style=for-the-badge&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb" alt="MongoDB" />
  <img src="https://img.shields.io/badge/Gemini_AI-2.5_Flash-4285F4?style=for-the-badge&logo=google" alt="Gemini AI" />
  <img src="https://img.shields.io/badge/Tailwind-v4-06B6D4?style=for-the-badge&logo=tailwindcss" alt="Tailwind" />
  <img src="https://img.shields.io/badge/PWA-Offline_Ready-5A0FC8?style=for-the-badge&logo=pwa" alt="PWA" />
</p>

<h1 align="center">💚 Riven — Neon Pulse</h1>

<p align="center">
  <strong>A full-stack, AI-powered expense splitting & personal finance tracker</strong><br/>
  <em>Built with Next.js 16, MongoDB, Google Gemini, and a custom "Neon Pulse" dark fintech UI</em>
</p>

<p align="center">
  <a href="#-features">Features</a> •
  <a href="#-architecture">Architecture</a> •
  <a href="#-data-model">Data Model</a> •
  <a href="#-ai-integration">AI Integration</a> •
  <a href="#-offline-support">Offline Support</a> •
  <a href="#-settlement-algorithm">Settlement Algorithm</a> •
  <a href="#-getting-started">Getting Started</a> •
  <a href="#-api-reference">API Reference</a>
</p>

---

## 🎯 Overview

Splitting expenses among friends, roommates, or travel groups is a universal pain point. **Riven** solves it with:

- **AI-Powered Bill Scanning** — Upload a receipt photo; Gemini parses line items, tax, and tip and auto-allocates costs using natural-language instructions ("Alice had only the burger, rest was shared")
- **Minimum-Transaction Settlement** — A greedy debt-resolution algorithm that finds the fewest possible payments to clear all debts
- **Budget Intelligence** — Personal spending analytics, category breakdowns, projected month-end spend, and visual alerts
- **Offline-First PWA** — Expenses queued locally when offline, synced automatically on reconnect
- **Multi-Currency Support** — Groups in any currency, balances auto-converted to INR for settlement display

---

## ✨ Features

### 🔐 Authentication & Security
- **NextAuth.js v5** with Credentials (email + password) and Google OAuth providers
- Bcrypt password hashing with salted rounds
- Email verification and password reset via **Resend** transactional email
- Time-expiring tokens stored as SHA-256 hashes; raw tokens only sent via email
- IDOR-protected API routes — every query validates group membership before returning data
- Session middleware protecting all `/dashboard/*` routes

### 👥 Group Expense Management
- Create groups with any currency (INR default, USD, EUR, GBP, JPY, etc.)
- Invite members by email with a 7-day expiring invitation link
- Add expenses with equal or fully custom split allocations
- Real-time expense ledger per group with AI-suggested category tagging
- Remove members and delete groups (owner-only) with cascading cleanup

### 🤖 AI-Powered Features
- **Receipt Scanner** — Uploads a bill image → Gemini 2.5 Flash parses items, prices, tax, tip → auto-generates per-member split allocations
- **Natural Language Splits** — Complex instructions like *"Alice had only the salad, Bob had the extra dessert, everything else shared"* produce correct unequal splits
- **Smart Categorization** — Suggests the best category for an expense description
- **Financial Insights** — AI-generated spending analysis: top categories, month-over-month trends, and actionable saving tips
- **Model Fallback Chain** — If the primary model (Gemini 2.5 Flash) is overloaded, automatically retries with Gemini 2.0 Flash → Gemini 1.5 Flash

### ⚖️ Settlement Engine
- **Greedy minimum-transaction algorithm** — reduces N-person debts to the fewest possible payments
- Two-phase settlement flow: **Initiate → Confirm** (sender marks paid, receiver verifies)
- Pending settlement tracking with real-time visual indicators
- Cross-group debt aggregation on the main dashboard
- **Live currency conversion** — non-INR group balances converted to ₹ using real-time exchange rates (open.er-api.com), with original amount shown as a secondary label

### 📊 Spending Analytics & Budget Tracking
- **Monthly spending breakdown** — total spent, daily average, category-level analysis
- **Budget system** — set a monthly spending limit with a visual progress bar
- **Projected spend** — extrapolates daily average to estimate month-end total
- **Color-coded alerts** — green (< 75%), amber (75–100%), red + pulse animation (over budget)
- Needs vs. Wants categorization, Subscription Radar, and Streak & Wins widgets

### 📱 Progressive Web App (PWA)
- Full offline support via Workbox service worker
- Install to home screen on Android and iOS
- **Offline expense queue** — expenses created while offline are stored in IndexedDB and synced automatically when connection is restored
- Sync status badge and offline banner for real-time feedback
- Duplicate-sync prevention via a synchronous ref-based lock

### 🎨 "Neon Pulse" Design System
- Dark-only theme (`#09090b` backgrounds) with neon orange (`#F07040`) accents
- Glassmorphic cards with backdrop blur and subtle borders
- Monospace terminal aesthetic for numeric data
- Micro-animations — hover glows, pulsing indicators, slide-in reveals
- Fully responsive — desktop sidebar collapses to a mobile bottom-nav sheet

---

## 🏗 Architecture

```mermaid
graph TD
    subgraph Client["Client (Browser)"]
        LP[Landing Page<br/>Static SSG]
        AP[Auth Pages<br/>Static]
        DB[Dashboard<br/>Dynamic RSC]
        TQ[TanStack Query v5<br/>Cache · Mutations · Optimistic UI]
        IDB[(IndexedDB<br/>Offline Queue + Query Cache)]
        SW[Service Worker<br/>Workbox PWA]
    end

    subgraph API["API Layer (Next.js Route Handlers)"]
        AuthAPI[/api/auth]
        GroupAPI[/api/groups]
        ExpAPI[/api/expenses]
        SettleAPI[/api/settlements]
        AIAPI[/api/ai]
        UserAPI[/api/user]
        InvAPI[/api/invitations]
    end

    subgraph DAL["Data Access Layer"]
        GQ[groups queries]
        EQ[expenses queries]
        SQ[settlements queries]
        BC[balance-calculator<br/>pure · side-effect-free]
    end

    subgraph External["External Services"]
        Mongo[(MongoDB Atlas)]
        Gemini[Google Gemini<br/>2.5 Flash · 2.0 Flash · 1.5 Flash]
        Resend[Resend<br/>Transactional Email]
        FX[open.er-api.com<br/>Exchange Rates]
    end

    DB --> TQ
    TQ -->|fetch / mutate| API
    SW -->|cache assets| Client
    IDB -->|offline queue| TQ

    API --> DAL
    DAL --> Mongo
    AIAPI --> Gemini
    AuthAPI --> Resend
    InvAPI --> Resend
    Client -->|FX rates| FX
```

### Key Architectural Decisions

| Decision | Rationale |
|---|---|
| **Server Components by default** | Dashboard overview computes debt summaries server-side — zero client-side waterfall for initial load |
| **TanStack Query for mutations** | Client components use TQ for cache invalidation and optimistic UI — no full-page reloads |
| **Lean DAL pattern** | All DB queries in `lib/db/queries/` — DTOs sanitize Mongoose internals; no ObjectId leaks to API consumers |
| **Pure balance calculator** | `lib/utils/balance-calculator.ts` is side-effect-free and importable from both server and client |
| **Validation in query layer only** | Mongoose pre-save hooks removed; all business-rule validation lives in the query layer where full request context is available |
| **Rate-limited AI client** | Token-bucket rate limiter (10 req/min) + configurable timeout + model fallback chain prevents cost overruns and availability gaps |
| **Ref-based sync lock** | Offline queue flush uses `useRef` (not `useState`) as a mutex so concurrent `online` events can't double-submit expenses |

---

## 📐 Data Model

```mermaid
erDiagram
    USER {
        ObjectId _id
        string name
        string email
        string passwordHash
        string authProvider
        string googleId
        number monthlyBudget
        Date emailVerified
        string avatar
    }

    GROUP {
        ObjectId _id
        string name
        string description
        ObjectId ownerId
        ObjectId[] memberIds
        string currency
        boolean isPersonal
    }

    EXPENSE {
        ObjectId _id
        ObjectId groupId
        string description
        number amount
        string category
        ObjectId payerId
        Split[] splits
        string splitType
        ObjectId createdBy
        Date date
        string receiptUrl
    }

    SETTLEMENT {
        ObjectId _id
        ObjectId groupId
        ObjectId fromUserId
        ObjectId toUserId
        number amount
        string status
        Date confirmedAt
        string note
    }

    INVITATION {
        ObjectId _id
        ObjectId groupId
        ObjectId inviterUserId
        string inviteeEmail
        string status
        string token
        Date expiresAt
    }

    USER ||--o{ GROUP : "owns"
    USER }o--o{ GROUP : "member of"
    GROUP ||--o{ EXPENSE : "has"
    GROUP ||--o{ SETTLEMENT : "has"
    GROUP ||--o{ INVITATION : "has"
    USER ||--o{ EXPENSE : "pays"
    USER ||--o{ SETTLEMENT : "from/to"
```

---

## 🤖 AI Integration

### Receipt Scanner Pipeline

```mermaid
flowchart TD
    A([User uploads receipt image\n+ natural language description]) --> B[Base64 encode image]
    B --> C[Build prompt:\n• user instructions\n• members list with IDs\n• keyword rules]
    C --> D{Gemini 2.5 Flash}

    D -->|overloaded / 503 / 429| E{Gemini 2.0 Flash}
    E -->|overloaded| F{Gemini 1.5 Flash}
    F -->|overloaded| ERR([All models unavailable])

    D -->|success| G[Model reasons step-by-step:\n1. Extract line items\n2. Separate overhead\n3. Apply keyword rules\n4. Calculate per-person shares\n5. Prorate tax & tip\n6. Output JSON]
    E -->|success| G
    F -->|success| G

    G --> H{Parse JSON\nfrom free text}
    H -->|valid| I[Normalize splits\nadjust rounding]
    H -->|malformed| J[Retry with\noriginal response\nas context]
    J --> H

    I --> K([Pre-fills expense form\nwith description · amount\ncategory · member splits])
```

### Natural Language Split Rules

| Instruction pattern | Behaviour |
|---|---|
| `"Alice had only the burger"` | Alice gets burger exclusively; does NOT share other items |
| `"Dessert was only for Bob"` | Dessert assigned solely to Bob on top of his share of everything else |
| `"everything else shared"` | All unassigned items split equally among all members |
| `"Alice had the steak, rest shared"` | Steak → Alice; all other items split equally including Alice |
| *(no instructions)* | Entire bill split equally |

### AI Model Fallback Chain

```mermaid
flowchart LR
    P[Primary\ngemini-2.5-flash] -->|503 / overloaded / 429| F1[Fallback 1\ngemini-2.0-flash]
    F1 -->|503 / overloaded / 429| F2[Fallback 2\ngemini-1.5-flash]
    F2 -->|503 / overloaded / 429| ERR([OVERLOADED error\nreturned to caller])
    P -->|other error\nor success| OUT([Return result])
    F1 -->|other error\nor success| OUT
    F2 -->|other error\nor success| OUT
```

---

## 📶 Offline Support

```mermaid
sequenceDiagram
    participant U as User
    participant App as App (Browser)
    participant IDB as IndexedDB
    participant SW as Service Worker
    participant API as Server API

    U->>App: Add expense (offline)
    App->>IDB: enqueueExpense(payload)
    App->>U: Show expense optimistically
    Note over App: SyncBadge shows "1 pending"

    Note over App,API: Network restored
    App->>App: window 'online' event fires
    App->>App: isSyncingRef.current check (mutex)
    App->>IDB: getQueue()
    IDB-->>App: [pendingExpense]
    App->>API: POST /api/expenses
    API-->>App: 201 Created
    App->>IDB: removeFromQueue(id)
    App->>App: invalidate React Query cache
    App->>U: Toast "Synced 1 expense"

    Note over SW: Asset caching (Workbox)
    SW->>SW: Cache pages + static assets on install
    U->>SW: Navigate while offline
    SW-->>U: Serve from cache
```

### Offline Architecture

| Layer | Technology | Purpose |
|---|---|---|
| **Service Worker** | Workbox (via `@ducanh2912/next-pwa`) | Caches app shell and static assets for offline navigation |
| **Expense Queue** | `idb-keyval` (IndexedDB) | Persists pending expenses across page reloads |
| **Query Cache** | TanStack Query + `idb-keyval` persister | Persists fetched data (groups, expenses) in IndexedDB for 24h |
| **Sync Trigger** | `window.addEventListener('online', ...)` | Fires flush on network reconnect |
| **Duplicate Guard** | `useRef` mutex in `useOfflineSync` | Prevents concurrent flush calls from double-submitting |

---

## 🧮 Settlement Algorithm

```mermaid
flowchart TD
    A([Expense Records]) --> B[Accumulate net balance per user\npayer: +amount\nsplit user: -splitAmount]
    B --> C{Filter near-zero\nbalances < ε}
    C --> D[Split into\nCreditors balance > 0\nDebtors balance < 0]
    D --> E[Sort both lists\ndescending by amount]
    E --> F{More creditors\nand debtors?}
    F -->|yes| G[Match largest creditor\nwith largest debtor]
    G --> H[settled = min creditor · debtor\nRecord transaction from→to]
    H --> I[Subtract settled\nfrom both parties]
    I --> J{Party fully settled?}
    J -->|yes| K[Advance that pointer]
    J -->|no| F
    K --> F
    F -->|no| L([Minimum-transaction\nsettlement plan])
```

**Example:** 5 people, 20 expenses → 3–4 optimal transfers instead of up to 20.

### Currency Conversion for Settlements

When a group uses a non-INR currency, the Balances page fetches a live exchange rate and displays all amounts converted to ₹, with the original currency shown as a secondary label. The rate is cached for 1 hour via TanStack Query.

---

## 🏛 Project Structure

```
riven/
├── app/
│   ├── (auth)/                      # Auth route group (public)
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   ├── forgot-password/page.tsx
│   │   └── reset-password/page.tsx
│   ├── (dashboard)/                 # Protected route group
│   │   ├── layout.tsx               # Sidebar + mobile sheet
│   │   └── dashboard/
│   │       ├── page.tsx             # Overview: SettlementStrip, SpendingAnalytics,
│   │       │                        #   NeedsVsWants, SubscriptionRadar, StreakAndWins
│   │       ├── groups/
│   │       │   ├── page.tsx         # Group list + create (INR default)
│   │       │   └── [id]/page.tsx    # Group detail + AI receipt scanner
│   │       ├── expenses/page.tsx    # Global expense ledger
│   │       ├── balances/page.tsx    # Settlement matrix + live FX conversion
│   │       └── history/page.tsx     # Full transaction log with edit/delete
│   ├── api/
│   │   ├── ai/                      # scan-bill · categorize · insights
│   │   ├── auth/                    # register · forgot-password · reset-password
│   │   ├── expenses/                # CRUD + [id]
│   │   ├── groups/                  # CRUD + [id]/balances · members · [userId]
│   │   ├── invitations/             # create + [token]/accept
│   │   ├── settlements/             # create + [id]/confirm
│   │   └── user/budget/             # get + patch
│   ├── globals.css                  # Neon Pulse design tokens
│   └── layout.tsx                   # Root layout + PWA metadata
├── components/
│   ├── dashboard/
│   │   ├── Sidebar.tsx              # Desktop sidebar + mobile sheet nav
│   │   ├── SpendingAnalytics.tsx    # Budget progress + category bars
│   │   ├── SettlementStrip.tsx      # Who-owes-whom summary strip
│   │   ├── NeedsVsWants.tsx         # Discretionary vs essential breakdown
│   │   ├── SubscriptionRadar.tsx    # Recurring expense tracker
│   │   └── StreakAndWins.tsx        # Consistency and achievement widget
│   ├── ui/
│   │   ├── OfflineBanner.tsx        # Yellow offline indicator banner
│   │   └── SyncBadge.tsx            # Fixed sync-status badge
│   ├── OfflineSyncProvider.tsx      # Mounts useOfflineSync globally
│   └── providers.tsx                # Session + QueryClient + IDB persister
├── hooks/
│   ├── useOfflineSync.ts            # Flush queue on reconnect (ref mutex)
│   └── useOnlineStatus.ts           # navigator.onLine + event listeners
├── lib/
│   ├── ai/client.ts                 # Gemini wrapper: rate-limit + timeout + fallback
│   ├── auth/                        # NextAuth config (Credentials + Google)
│   ├── db/
│   │   ├── connection.ts            # MongoDB singleton
│   │   └── queries/                 # DAL: expenses · groups · settlements
│   ├── models/                      # Mongoose schemas (User Group Expense Settlement Invitation)
│   ├── offline/queue.ts             # idb-keyval expense queue
│   └── utils/balance-calculator.ts  # Pure greedy settlement engine
├── scripts/
│   ├── seed.ts                      # Generic test data seed
│   └── seed-tempifykyk.ts           # Full demo data (5 groups, 82 expenses)
├── middleware.ts                    # Route protection middleware
├── next.config.ts                   # next-pwa (webpack mode, skipWaiting, clientsClaim)
└── public/
    ├── manifest.json                # PWA manifest (INR-first, standalone display)
    ├── sw.js                        # Generated Workbox service worker
    └── icons/                       # 192×192, 512×512, apple-touch-icon
```

---

## 🛠 Tech Stack

### Core
| Technology | Version | Purpose |
|---|---|---|
| **Next.js** | 16.2.2 | Full-stack React framework, App Router, webpack mode |
| **React** | 19.2.4 | UI with Server Components + Client Components |
| **TypeScript** | 5.x | End-to-end type safety |

### Backend & Data
| Technology | Purpose |
|---|---|
| **MongoDB Atlas** | Cloud-hosted document database |
| **Mongoose 9** | ODM with schema validation and compound indexes |
| **NextAuth.js v5** | Auth with Credentials + Google, JWT sessions |
| **bcryptjs** | Password hashing |
| **Resend** | Transactional email (verification, password reset, invitations) |
| **React Email** | Type-safe email templates |

### AI
| Technology | Purpose |
|---|---|
| **Google Gemini 2.5 Flash** | Primary model — multimodal (text + vision) |
| **Google Gemini 2.0 Flash** | Fallback model 1 |
| **Google Gemini 1.5 Flash** | Fallback model 2 |
| **Custom AI client** | Rate limiting · timeout · model fallback chain |

### Frontend & State
| Technology | Purpose |
|---|---|
| **Tailwind CSS v4** | Utility styling with custom design tokens |
| **shadcn/ui** | 15 accessible component primitives |
| **Lucide React** | Icon library |
| **TanStack Query v5** | Server state, cache invalidation, mutations |
| **Sonner** | Toast notifications |
| **idb-keyval** | IndexedDB for offline queue and query cache persistence |

### PWA
| Technology | Purpose |
|---|---|
| **@ducanh2912/next-pwa** | Workbox integration, service worker generation |
| **Workbox** | Asset caching strategies, service worker lifecycle |

---

## 🔐 Auth Flow

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend
    participant NA as NextAuth
    participant DB as MongoDB
    participant RS as Resend

    U->>FE: Submit register form
    FE->>NA: POST /api/auth/register
    NA->>DB: Create user (emailVerified: null)
    NA->>RS: Send verification email (hashed token)
    NA-->>FE: 201 Created

    U->>RS: Click verification link
    FE->>NA: GET /api/auth/verify-email?token=
    NA->>DB: Set emailVerified = now()
    NA-->>FE: Redirect to /login

    U->>FE: Submit login form
    FE->>NA: signIn('credentials', {email, password})
    NA->>DB: Find user by email
    DB-->>NA: User doc
    NA->>NA: bcrypt.compare(password, hash)
    alt valid
        NA-->>FE: JWT session cookie
        FE-->>U: Redirect to /dashboard
    else invalid
        NA-->>FE: CredentialsSignin error
        FE-->>U: Show error message
    end
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 20+
- **MongoDB Atlas** cluster ([free tier](https://www.mongodb.com/atlas))
- **Google AI API key** ([Google AI Studio](https://aistudio.google.com/apikey))
- **Resend API key** ([resend.com](https://resend.com))

### Installation

```bash
git clone https://github.com/ShivamThange/expenseTracker.git
cd expenseTracker
npm install
cp .env.example .env.local
```

### Environment Variables

```env
# MongoDB
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/riven

# NextAuth — generate with: openssl rand -base64 32
NEXTAUTH_SECRET=your-random-secret
NEXTAUTH_URL=http://localhost:3000

# Google OAuth (optional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Email
RESEND_API_KEY=re_xxxxx
FROM_EMAIL=onboarding@resend.dev

# AI
GEMINI_API_KEY=AIzaSy-xxxxx
```

### Run

```bash
npm run dev      # Development (webpack mode)
npm run build    # Production build — generates sw.js in public/
npm start        # Serve production build
```

> **Note:** Offline/PWA features only work on a production build (`npm run build && npm start`) or a deployed URL over HTTPS. The service worker is intentionally disabled in development.

### Seed Demo Data

```bash
# Generic test data (test@example.com / password123)
npx tsx scripts/seed.ts

# Full demo for a specific user (5 groups, 82 expenses, 10 settlements)
npx tsx scripts/seed-tempifykyk.ts
```

---

## ☁️ Deployment

### Vercel (Recommended)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/ShivamThange/expenseTracker)

1. Push to GitHub
2. Import in [Vercel Dashboard](https://vercel.com/new)
3. Add all environment variables
4. Set `NEXTAUTH_URL` to your production domain

| Variable | Notes |
|---|---|
| `MONGODB_URI` | Use Atlas string with `retryWrites=true` |
| `NEXTAUTH_SECRET` | Strong random string, min 32 chars |
| `NEXTAUTH_URL` | Production URL, no trailing slash |
| `RESEND_API_KEY` | Verify your sending domain in Resend dashboard |
| `GEMINI_API_KEY` | Enable billing for higher quotas |

---

## 📊 API Reference

### Authentication
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register new user |
| `POST` | `/api/auth/[...nextauth]` | NextAuth sign-in / sign-out |
| `POST` | `/api/auth/forgot-password` | Request password reset email |
| `POST` | `/api/auth/reset-password` | Reset password with token |

### Groups
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/groups` | List user's groups |
| `POST` | `/api/groups` | Create group (INR default currency) |
| `GET` | `/api/groups/[id]` | Group details + members |
| `PATCH` | `/api/groups/[id]` | Update group |
| `DELETE` | `/api/groups/[id]` | Delete group + expenses (owner only) |
| `POST` | `/api/groups/[id]/members` | Add member by email |
| `DELETE` | `/api/groups/[id]/members/[userId]` | Remove member |
| `GET` | `/api/groups/[id]/balances` | Balance matrix + settlement plan |

### Expenses
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/expenses` | List expenses (filter by groupId, page, limit) |
| `POST` | `/api/expenses` | Create expense with splits |
| `GET` | `/api/expenses/[id]` | Single expense |
| `PATCH` | `/api/expenses/[id]` | Update expense (creator or group owner) |
| `DELETE` | `/api/expenses/[id]` | Delete expense (creator or group owner) |

### Settlements
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/settlements` | Initiate settlement |
| `POST` | `/api/settlements/[id]/confirm` | Confirm receipt of payment |

### Invitations
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/invitations` | Create + send invitation email |
| `GET` | `/api/invitations/[token]` | Get invitation details |
| `POST` | `/api/invitations/[token]/accept` | Accept invitation |

### AI & User
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/ai/scan-bill` | Parse receipt image → splits |
| `POST` | `/api/ai/categorize` | Suggest category for description |
| `POST` | `/api/ai/insights` | Generate spending insights |
| `GET` | `/api/user/budget` | Get monthly budget |
| `PATCH` | `/api/user/budget` | Set monthly budget |

---

## 🔒 Security

- **IDOR Protection** — Every API query validates the requesting user is a group member before returning data
- **Password Security** — Bcrypt with salt rounds; passwords never stored in plaintext
- **Token Security** — Reset/verification tokens are SHA-256 hashed in DB; raw tokens only travel via email
- **Session Management** — JWT sessions via NextAuth; HTTP-only cookies
- **Input Validation** — Server-side validation: split sums, membership checks, amount bounds, ObjectId validity
- **Rate Limiting** — AI endpoints use a token-bucket rate limiter (10 req/min)

---

## 📝 License

MIT — see [LICENSE](LICENSE) for details.

---

<p align="center">
  <strong>Built by <a href="https://github.com/ShivamThange">Shivam Thange</a></strong><br/>
  <sub>Full-stack · AI Integration · Offline-First · Modern UI Design</sub>
</p>
