<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16.2-black?style=for-the-badge&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb" alt="MongoDB" />
  <img src="https://img.shields.io/badge/Gemini_AI-2.5_Flash-4285F4?style=for-the-badge&logo=google" alt="Gemini AI" />
  <img src="https://img.shields.io/badge/Tailwind-v4-06B6D4?style=for-the-badge&logo=tailwindcss" alt="Tailwind" />
</p>

<h1 align="center">💚 SplitWise — Neon Pulse</h1>

<p align="center">
  <strong>A full-stack, AI-powered expense splitting & personal finance tracker</strong><br/>
  <em>Built with Next.js 16, MongoDB, Google Gemini, and a custom "Neon Pulse" dark fintech UI</em>
</p>

<p align="center">
  <a href="#-key-features">Features</a> •
  <a href="#-architecture">Architecture</a> •
  <a href="#-tech-stack">Tech Stack</a> •
  <a href="#-ai-integration">AI Integration</a> •
  <a href="#-getting-started">Getting Started</a> •
  <a href="#-deployment">Deployment</a>
</p>

---

## 🎯 Problem Statement

Splitting expenses among friends, roommates, or travel groups is a universal pain point. Most solutions either lack intelligent categorization, have clunky settlement flows, or simply look dated. **SplitWise — Neon Pulse** addresses all three:

1. **AI-Powered Bill Scanning** — Upload a photo of any receipt and let Google Gemini parse line items, tax, and tip — then auto-allocate costs to the right people
2. **Minimum-Transaction Settlement Engine** — A greedy debt-resolution algorithm that minimizes the number of payments needed
3. **Budget Intelligence** — Personal spending analytics with category breakdowns, budget tracking, projected month-end spend, and visual progress indicators

---

## ✨ Key Features

### 🔐 Authentication & Security
- **NextAuth.js v5** with Credentials provider (email + password)
- Bcrypt password hashing with salted rounds
- Email verification flow via **Resend** transactional email
- Password reset with time-expiring tokens (SHA-256 hashed)
- IDOR-protected API routes — every query validates group membership before returning data
- Session-based middleware protecting `/dashboard/*` routes

### 👥 Group Expense Management
- Create expense groups with custom currencies (USD, EUR, GBP, JPY, INR, etc.)
- Invite members by email — ownership-gated member management
- Add expenses with equal or custom split allocations
- Real-time expense ledger per group with category tagging
- Group deletion with cascading expense cleanup

### 🤖 AI-Powered Features
- **Receipt Scanner** — Upload a bill photo → Gemini 2.5 Flash parses items, prices, taxes, and tips → auto-generates split allocations per member
- **Smart Categorization** — AI-powered expense category suggestions
- **Financial Insights** — AI-generated spending analysis and recommendations
- Context-aware prompting: users can add natural language instructions like *"Alice had the steak, Bob and I split the appetizers"*

### ⚖️ Settlement Engine
- **Greedy minimum-transaction algorithm** — reduces N-person debts to the fewest possible payments
- Two-phase settlement flow: **Initiate → Confirm** (sender marks paid, receiver verifies)
- Pending settlement tracking with visual indicators
- Cross-group debt aggregation on the dashboard

### 📊 Spending Analytics & Budget Tracking
- **Monthly spending breakdown** — total spent, daily average, category-level analysis
- **Budget system** — set a monthly spending limit, track progress with visual progress bars
- **Projected spend** — extrapolates current daily average to estimate month-end total
- **Color-coded alerts** — green (< 75%), yellow (75-100%), red + pulse animation (over budget)
- Category distribution with percentage bars

### 🎨 "Neon Pulse" Design System
- **Dark-only theme** — near-black backgrounds (`#0a0a0a`) with high-contrast neon accents
- **Neon Lime** (`#c8ff00`) primary + **Vivid Purple** (`#a855f7`) secondary palette
- **Glassmorphic cards** — gradient backgrounds with backdrop blur and subtle borders
- **Monospace terminal aesthetic** — uppercase tracking-widest typography, `font-mono` data displays
- **Micro-animations** — hover glows, pulsing indicators, slide-in reveals
- Custom scrollbar styling, neon drop-shadows on key metrics
- Fully responsive — desktop sidebar collapses to mobile-friendly layout

---

## 🏗 Architecture

```
┌────────────────────────────────────────────────────────┐
│                      CLIENT                            │
│  Next.js App Router (React 19 Server Components)       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │  Landing Page │  │  Auth Pages  │  │  Dashboard   │ │
│  │  (Static SSG) │  │  (Static)    │  │  (Dynamic)   │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│                         │                              │
│  ┌─────────────────────────────────────────────────┐   │
│  │           TanStack Query v5 (Client State)      │   │
│  │     Mutations · Optimistic UI · Cache Invalidation │ │
│  └─────────────────────────────────────────────────┘   │
├────────────────────────────────────────────────────────┤
│                    API LAYER                           │
│  Next.js Route Handlers (App Router)                   │
│  ┌──────┐ ┌────────┐ ┌────────┐ ┌──────┐ ┌────────┐  │
│  │ Auth │ │ Groups │ │Expenses│ │Settle│ │  AI    │  │
│  │ 6 EP │ │ 5 EP   │ │ 3 EP   │ │ 2 EP │ │ 3 EP   │  │
│  └──────┘ └────────┘ └────────┘ └──────┘ └────────┘  │
├────────────────────────────────────────────────────────┤
│                  DATA ACCESS LAYER                     │
│  Mongoose ODM + MongoDB Atlas                          │
│  ┌──────┐ ┌──────┐ ┌────────┐ ┌──────────┐ ┌──────┐  │
│  │ User │ │Group │ │Expense │ │Settlement│ │Invite│  │
│  └──────┘ └──────┘ └────────┘ └──────────┘ └──────┘  │
├────────────────────────────────────────────────────────┤
│                  EXTERNAL SERVICES                     │
│  ┌───────────────┐  ┌────────┐  ┌──────────────────┐  │
│  │ Google Gemini  │  │ Resend │  │ MongoDB Atlas    │  │
│  │ (AI/Vision)    │  │ (Email)│  │ (Database)       │  │
│  └───────────────┘  └────────┘  └──────────────────┘  │
└────────────────────────────────────────────────────────┘
```

### Key Architectural Decisions

| Decision | Rationale |
|----------|-----------|
| **Server Components by default** | Dashboard overview page computes debt summaries server-side — zero client-side API waterfall for initial load |
| **TanStack Query for mutations** | Client components (group detail, history) use TQ for cache invalidation and optimistic UI — no full-page reloads |
| **Lean DAL pattern** | All DB queries in `lib/db/queries/` — DTOs sanitize Mongoose internals before reaching API responses (no ObjectId leaks) |
| **Pure balance calculator** | `lib/utils/balance-calculator.ts` is side-effect-free, importable from both server and client — enables optimistic balance previews |
| **Rate-limited AI client** | Token-bucket rate limiter (10 req/min) + configurable timeout prevents runaway API costs |
| **Edge-safe middleware** | Lazy `require('crypto')` pattern avoids Node.js module bundling into Edge Runtime |

---

## 🛠 Tech Stack

### Core Framework
| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js** | 16.2.2 | Full-stack React framework with App Router & Turbopack |
| **React** | 19.2.4 | UI library with Server Components support |
| **TypeScript** | 5.x | End-to-end type safety |

### Backend & Data
| Technology | Purpose |
|------------|---------|
| **MongoDB Atlas** | Cloud-hosted document database |
| **Mongoose 9** | ODM with schema validation, pre-save hooks, compound indexes |
| **NextAuth.js v5** | Authentication with Credentials provider, JWT sessions |
| **bcryptjs** | Password hashing |
| **Resend** | Transactional email (verification, password reset) |
| **React Email** | Email template components |

### AI & Intelligence
| Technology | Purpose |
|------------|---------|
| **Google Gemini 2.5 Flash** | Multimodal AI (text + vision) via `@google/genai` SDK |
| **Custom AI Client** | Rate limiting, timeout control, structured error handling |

### Frontend & UI
| Technology | Purpose |
|------------|---------|
| **Tailwind CSS v4** | Utility-first styling with custom design tokens |
| **shadcn/ui** | Accessible component primitives (15 components) |
| **Lucide React** | Icon library |
| **TanStack Query v5** | Server state management, caching, mutations |
| **Sonner** | Toast notifications |
| **Zustand** | Lightweight client state (available for future use) |

---

## 🤖 AI Integration

### Receipt Scanner Pipeline

```
User uploads receipt image
       │
       ▼
┌──────────────────────┐
│  Base64 encode image  │
│  + user instructions  │
│  + member list        │
└──────────────────────┘
       │
       ▼
┌──────────────────────────────────────────┐
│        Gemini 2.5 Flash (Vision)          │
│                                          │
│  System Prompt:                          │
│  • Parse line items, prices, tax, tip    │
│  • Spread overhead proportionally        │
│  • Respect user allocation instructions  │
│  • Return structured JSON               │
│                                          │
│  Config:                                 │
│  • Temperature: 0.1 (deterministic)      │
│  • Response MIME: application/json       │
│  • Timeout: 45s                          │
│  • Rate limited: 10 req/min             │
└──────────────────────────────────────────┘
       │
       ▼
┌──────────────────────┐
│  { description,       │
│    amount,            │
│    category,          │
│    splits: [{userId,  │
│              amount}] │
│  }                    │
└──────────────────────┘
       │
       ▼
  Pre-fills expense form
  with AI-parsed data
```

---

## 📁 Project Structure

```
expensetracker/
├── app/
│   ├── (auth)/                    # Auth route group
│   │   ├── login/page.tsx         # Login with glassmorphic form
│   │   ├── register/page.tsx      # Registration
│   │   ├── forgot-password/       # Password reset request
│   │   ├── reset-password/        # Password reset form
│   │   ├── verify-email/          # Email verification
│   │   └── layout.tsx             # Shared auth layout
│   ├── (dashboard)/               # Protected route group
│   │   ├── layout.tsx             # Sidebar + main content shell
│   │   └── dashboard/
│   │       ├── page.tsx           # Overview + Spending Analytics
│   │       ├── groups/            # Group list + creation
│   │       │   └── [id]/page.tsx  # Group detail + AI scanner
│   │       ├── expenses/page.tsx  # Global expense ledger
│   │       ├── balances/page.tsx  # Settlement matrix
│   │       └── history/page.tsx   # Transaction log
│   ├── api/
│   │   ├── ai/                    # AI endpoints (scan, categorize, insights)
│   │   ├── auth/                  # Auth endpoints (register, verify, reset)
│   │   ├── expenses/              # CRUD + [id] detail
│   │   ├── groups/                # CRUD + [id]/balances, members
│   │   ├── settlements/           # Create + confirm flow
│   │   └── user/budget/           # Budget get/set
│   ├── globals.css                # Neon Pulse design system
│   ├── layout.tsx                 # Root layout (Inter font, dark mode)
│   └── page.tsx                   # Landing page
├── components/
│   ├── dashboard/
│   │   ├── Sidebar.tsx            # Navigation with Lucide icons
│   │   └── SpendingAnalytics.tsx  # Budget tracking widget
│   ├── providers.tsx              # Session + Query providers
│   └── ui/                        # 15 shadcn/ui components
├── lib/
│   ├── ai/client.ts               # Gemini wrapper (rate limit + timeout)
│   ├── auth/                      # NextAuth config + auth logic
│   ├── db/
│   │   ├── connection.ts          # MongoDB connection singleton
│   │   └── queries/               # DAL: expenses, groups, settlements
│   ├── models/                    # Mongoose schemas (5 models)
│   └── utils/
│       └── balance-calculator.ts  # Pure debt settlement algorithm
├── middleware.ts                   # Auth middleware (route protection)
└── types/                         # TypeScript declarations
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 20+ 
- **MongoDB Atlas** cluster ([Create free](https://www.mongodb.com/atlas))
- **Google AI API key** ([Get one](https://aistudio.google.com/apikey))
- **Resend API key** ([Sign up](https://resend.com)) — for email verification

### Installation

```bash
# Clone the repository
git clone https://github.com/ShivamThange/expenseTracker.git
cd expenseTracker

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
```

### Environment Variables

Edit `.env.local` with your real values:

```env
# MongoDB — connection string from Atlas dashboard
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/splitwise

# NextAuth — generate with: openssl rand -base64 32
NEXTAUTH_SECRET=your-random-secret-key-here
NEXTAUTH_URL=http://localhost:3000

# Resend — for transactional emails (verification, password reset)
RESEND_API_KEY=re_xxxxxxxxxxxxx

# Google AI — for receipt scanning and AI features
GEMINI_API_KEY=AIzaSy-xxxxxxxxxxxxx
```

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll see the Neon Pulse landing page.

### Build for Production

```bash
npm run build    # Creates optimized production bundle
npm start        # Serves the production build
```

---

## ☁️ Deployment

### Vercel (Recommended)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/ShivamThange/expenseTracker)

1. **Push** your code to GitHub
2. **Import** the repository in [Vercel Dashboard](https://vercel.com/new)
3. **Add environment variables** — copy all 5 from `.env.example`
4. **Set `NEXTAUTH_URL`** to your production domain (e.g., `https://your-app.vercel.app`)
5. **Deploy** — Vercel auto-detects Next.js and configures the build

### Environment Checklist for Production

| Variable | Notes |
|----------|-------|
| `MONGODB_URI` | Use Atlas connection string with `retryWrites=true` |
| `NEXTAUTH_SECRET` | Must be a strong random string (min 32 chars) |
| `NEXTAUTH_URL` | Your production URL (no trailing slash) |
| `RESEND_API_KEY` | Verify your sending domain in Resend dashboard |
| `GEMINI_API_KEY` | Enable billing if you need higher quotas |

---

## 🧮 Settlement Algorithm

The balance calculator uses a **greedy two-pointer** approach to minimize the number of transactions:

```
1. Accumulate net balance per user:
   • Payer:  +amount (they fronted the cost)
   • Split:  -amount (they consumed value)

2. Separate into creditors (balance > 0) and debtors (balance < 0)

3. Sort both lists descending by absolute amount

4. Two-pointer settlement:
   • Match largest creditor with largest debtor
   • Settle min(creditor.amount, debtor.amount)
   • Advance pointer when fully settled
   • Repeat until all balances resolved

Result: Minimum number of transactions to settle all debts
```

**Example:** In a group of 5 people with 20 expenses, this reduces from potentially 20 individual repayments down to 3-4 optimal transfers.

---

## 📊 API Reference

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | Register new user |
| `POST` | `/api/auth/[...nextauth]` | NextAuth sign-in/sign-out |
| `GET` | `/api/auth/verify-email?token=` | Verify email address |
| `POST` | `/api/auth/forgot-password` | Request password reset |
| `POST` | `/api/auth/reset-password` | Reset password with token |

### Groups
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/groups` | List user's groups |
| `POST` | `/api/groups` | Create new group |
| `GET` | `/api/groups/[id]` | Get group details + members |
| `DELETE` | `/api/groups/[id]` | Delete group (owner only) |
| `POST` | `/api/groups/[id]/members` | Add member by email |
| `GET` | `/api/groups/[id]/balances` | Get balance matrix + settlements |

### Expenses
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/expenses?groupId=&page=&limit=` | List expenses |
| `POST` | `/api/expenses` | Create expense with splits |
| `GET` | `/api/expenses/[id]` | Get single expense |
| `PATCH` | `/api/expenses/[id]` | Update expense |
| `DELETE` | `/api/expenses/[id]` | Delete expense |

### Settlements & AI
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/settlements` | Initiate settlement |
| `POST` | `/api/settlements/[id]/confirm` | Confirm receipt |
| `POST` | `/api/ai/scan-bill` | AI receipt parser |
| `POST` | `/api/ai/categorize` | AI category suggestion |
| `PATCH` | `/api/user/budget` | Set monthly budget |

---

## 🔒 Security Considerations

- **IDOR Protection** — All API queries verify the requesting user is a member of the target group
- **Password Security** — Bcrypt with salt rounds; passwords never stored in plaintext
- **Token Security** — Reset/verification tokens are SHA-256 hashed before storage; raw tokens sent via email
- **Session Management** — JWT-based sessions via NextAuth; HTTP-only cookies
- **Input Validation** — Server-side validation on all API routes (splits sum, member checks, amount bounds)
- **Rate Limiting** — AI endpoints use token-bucket rate limiter (10 req/min)

---

## 📝 License

MIT — see [LICENSE](LICENSE) for details.

---

<p align="center">
  <strong>Built by <a href="https://github.com/ShivamThange">Shivam Thange</a></strong><br/>
  <sub>Full-stack · AI Integration · Modern UI Design</sub>
</p>
