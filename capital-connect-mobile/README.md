# Capital Connect Mobile

> An AI-powered deal flow and startup discovery platform connecting investors with founders — built with Expo, React Native, TypeScript, and Supabase.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Project Structure](#3-project-structure)
4. [Architecture & Design Patterns](#4-architecture--design-patterns)
5. [Authentication & Authorization](#5-authentication--authorization)
6. [Navigation System](#6-navigation-system)
7. [Onboarding Flow](#7-onboarding-flow)
8. [Role-Based Features](#8-role-based-features)
   - [Shared Features](#shared-features)
   - [Investor Features](#investor-features)
   - [Founder Features](#founder-features)
9. [Screens & Pages (In Depth)](#9-screens--pages-in-depth)
10. [Components Library](#10-components-library)
11. [Custom Hooks](#11-custom-hooks)
12. [Data Models & Types](#12-data-models--types)
13. [State Management](#13-state-management)
14. [Supabase Integration](#14-supabase-integration)
15. [Design System & Styling](#15-design-system--styling)
16. [Form Handling & Validation](#16-form-handling--validation)
17. [Settings & Preferences](#17-settings--preferences)
18. [Build & Deployment](#18-build--deployment)
19. [Environment Configuration](#19-environment-configuration)
20. [Feature Summary](#20-feature-summary)

---

## 1. Project Overview

Capital Connect Mobile is a full-featured React Native application that serves as a two-sided marketplace for the Indian startup ecosystem. It bridges the gap between **startup founders** seeking investment and **investors** (Angels, VCs, Banks, NBFCs, Family Offices, and Corporate VCs) looking for high-quality deal flow.

### What the App Does

- Founders can list their startups, showcase traction metrics, browse vetted investors, and receive introduction requests.
- Investors can discover startups, track deal flow pipelines, monitor real-time funding rounds, read curated news, and send introduction requests directly to founders.
- Both user types get access to trending startup intelligence, event listings, and a shared news feed powered by scraped and curated data.

### Target Market

The platform is built for the **Indian startup ecosystem**, with sector and geography filters tailored for Indian cities and sectors (FinTech, AgriTech, EdTech, HealthTech, SaaS, D2C, and more).

---

## 2. Tech Stack

| Category | Technology | Version |
|---|---|---|
| Runtime | Expo (Managed Workflow) | ~55.0.8 |
| Framework | React Native | 0.83.2 |
| Language | React | 19.2.0 |
| Type System | TypeScript | ~5.9.2 |
| Navigation | Expo Router (file-based) | ~55.0.7 |
| Backend | Supabase (PostgreSQL + Auth) | 2.99.2 |
| Styling | NativeWind (Tailwind for RN) | 2.0.11 |
| CSS Config | Tailwind CSS | 3.3.2 |
| Forms | React Hook Form | 7.71.2 |
| Validation | Zod | 4.3.6 |
| Date Utils | date-fns | 4.1.0 |
| Storage | AsyncStorage + SecureStore | Latest |
| Icons | Expo Vector Icons (Ionicons) | Latest |
| Build | EAS Build | Latest |

---

## 3. Project Structure

```
capital-connect-mobile/
│
├── app/                              # Expo Router app directory (file-based routing)
│   ├── index.tsx                     # Root entry — redirects to login or dashboard
│   ├── _layout.tsx                   # Root layout with global auth guard
│   │
│   ├── (auth)/                       # Unauthenticated route group
│   │   ├── _layout.tsx               # Stack navigator for auth screens
│   │   ├── login.tsx                 # Login screen
│   │   ├── register.tsx              # Registration screen
│   │   └── forgot-password.tsx       # Password recovery screen
│   │
│   └── (app)/                        # Authenticated route group
│       ├── _layout.tsx               # Tab-based layout with custom navigation bar
│       ├── index.tsx                 # Dashboard (role-specific home screen)
│       ├── my-listing.tsx            # Founder: manage startup listing
│       ├── browse.tsx                # Investor: browse startups
│       ├── browse-investors.tsx      # Founder: browse investors
│       ├── deal-flow.tsx             # Investor: deal pipeline management
│       ├── trending.tsx              # Trending startups & sector intelligence
│       ├── ask-ai.tsx                # AI-powered investment insights
│       ├── introductions.tsx         # Intro request management
│       ├── partnership-intros.tsx    # Corporate VC: partnership proposals
│       ├── co-invest.tsx             # Family Office: co-investment features
│       ├── events.tsx                # Startup events & networking
│       ├── portfolio.tsx             # Investor: portfolio tracking
│       ├── profile/
│       │   └── index.tsx             # User profile screen
│       ├── settings.tsx              # Settings overview menu
│       ├── settings/
│       │   ├── account.tsx           # Account management
│       │   ├── profile.tsx           # Profile editor
│       │   ├── notifications.tsx     # Notification preferences
│       │   ├── privacy.tsx           # Privacy controls
│       │   └── appearance.tsx        # Theme settings
│       ├── news/
│       │   └── index.tsx             # Curated news feed
│       ├── funding/
│       │   ├── index.tsx             # Funding rounds tracker
│       │   └── [id].tsx              # Funding round detail screen
│       ├── browse/
│       │   └── [id].tsx              # Startup detail screen
│       ├── investors/
│       │   ├── index.tsx             # Investor directory
│       │   └── [id].tsx              # Investor profile detail
│       └── onboarding/
│           ├── role.tsx              # Step 1: role selection
│           ├── investor-wizard.tsx   # Multi-step investor onboarding
│           └── founder-wizard.tsx    # Multi-step founder onboarding
│
├── components/                       # Reusable component library
│   ├── ui/                           # Generic UI primitives
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   ├── Avatar.tsx
│   │   ├── Badge.tsx
│   │   ├── Loader.tsx
│   │   └── EmptyState.tsx
│   ├── dashboard/
│   │   └── MoreDrawer.tsx
│   ├── onboarding/
│   │   ├── ProgressStepper.tsx
│   │   ├── SelectionCard.tsx
│   │   ├── ChipSelector.tsx
│   │   ├── SegmentedButtons.tsx
│   │   └── FeaturePills.tsx
│   ├── startups/
│   │   └── StartupCard.tsx
│   ├── investors/
│   │   └── InvestorCard.tsx
│   ├── funding/
│   │   └── FundingCard.tsx
│   ├── news/
│   │   └── NewsCard.tsx
│   └── ErrorBoundary.tsx
│
├── context/
│   └── AuthContext.tsx               # Global authentication context
│
├── hooks/                             # Custom React hooks
│   ├── useAuth.ts
│   ├── useFunding.ts
│   ├── useStartups.ts
│   ├── useInvestors.ts
│   ├── useNews.ts
│   ├── useTrending.ts
│   ├── useIntroductions.ts
│   └── useEvents.ts
│
├── lib/
│   └── supabase.ts                   # Supabase client initialization
│
├── types/
│   └── index.ts                      # All TypeScript interfaces and types
│
├── constants/
│   └── colors.ts                     # Design system color palette
│
├── assets/                            # App icons, splash screen, images
│
├── app.json                           # Expo project configuration
├── eas.json                           # EAS Build profiles
├── package.json                       # Dependencies and npm scripts
├── tsconfig.json                      # TypeScript configuration
├── tailwind.config.js                 # Tailwind CSS configuration
└── babel.config.js                    # Babel configuration
```

---

## 4. Architecture & Design Patterns

### Overall Architecture

Capital Connect follows a **feature-driven architecture** layered over Expo Router's file-based routing. The architecture has four distinct layers:

```
┌─────────────────────────────────────┐
│           SCREENS (app/)            │  ← File-based routing via Expo Router
├─────────────────────────────────────┤
│         COMPONENTS (components/)    │  ← Reusable UI components
├─────────────────────────────────────┤
│           HOOKS (hooks/)            │  ← Data-fetching & business logic
├─────────────────────────────────────┤
│       CONTEXT + SUPABASE (lib/)     │  ← Global state + backend integration
└─────────────────────────────────────┘
```

### Key Design Decisions

**1. File-Based Routing (Expo Router)**
Every file inside `app/` automatically becomes a route. Route groups `(auth)` and `(app)` organize routes without affecting the URL structure. Dynamic segments like `[id].tsx` match variable path segments.

**2. Context for Auth, Hooks for Data**
Authentication state lives in a global React Context (`AuthContext`) so it's available everywhere without prop drilling. Domain-specific data (startups, funding rounds, news) is fetched inside custom hooks local to each screen.

**3. Supabase as BaaS**
There is no dedicated API server. All data reads and writes go directly through the Supabase JavaScript SDK, which handles PostgreSQL queries, real-time subscriptions, and JWT authentication.

**4. Role-Based Rendering**
The app renders completely different UIs, tabs, and features depending on whether the logged-in user is a Founder or an Investor. This is determined by `profile.role` stored in Supabase and cached in `AuthContext`.

**5. Component Composition**
UI is built by composing small primitives (Button, Card, Badge, Input) into domain components (StartupCard, InvestorCard, FundingCard) which are assembled into full screens.

---

## 5. Authentication & Authorization

### Auth Stack

The authentication system is built entirely on **Supabase Auth** (email + password), with session persistence via **AsyncStorage**.

### Auth Flow

```
App Opens
    │
    ▼
Root Layout (_layout.tsx)
    │
    ├── No session?  ──────────────► (auth)/login
    │
    ├── Session + onboarding_completed = false? ──► (app)/onboarding/role
    │
    └── Session + onboarding_completed = true? ───► (app)/ [Dashboard]
```

### Registration Flow

1. User opens the app for the first time and is shown the login screen.
2. Tapping **Create Account** navigates to `(auth)/register`.
3. The registration form collects: first name, last name, email, password, confirm password.
4. On submit, `supabase.auth.signUp()` creates an account and triggers a confirmation email.
5. On successful sign-up, the user is redirected to the onboarding wizard.

### Login Flow

1. User enters email and password on `(auth)/login`.
2. `supabase.auth.signInWithPassword()` authenticates and returns a session.
3. The root layout detects the new session and redirects to either onboarding or the dashboard.

### Session Management

- Sessions are persisted in AsyncStorage so the user stays logged in across app restarts.
- Supabase SDK auto-refreshes tokens in the background.
- `AuthContext` exposes `refreshProfile()` to re-fetch the latest profile from the database after changes.

### Logout

Calling `signOut()` from `AuthContext`:
1. Calls `supabase.auth.signOut()` to invalidate the server session.
2. Clears local profile state.
3. The root layout detects the null session and redirects to login.

### `AuthContext` API

```typescript
const {
  user,             // Supabase auth user object
  session,          // Active Supabase session
  profile,          // Row from `profiles` table
  loading,          // True while session is being checked
  signIn,           // (email, password) => Promise
  signUp,           // (email, password, firstName, lastName) => Promise
  signOut,          // () => Promise
  completeOnboarding, // (role, roleData) => Promise
  refreshProfile,   // () => Promise
} = useAuth();
```

---

## 6. Navigation System

### Navigation Architecture

Capital Connect uses **Expo Router** for all navigation. Routes are defined by file paths, with route groups organising screens into logical segments.

### Route Groups

| Group | Path | Purpose |
|---|---|---|
| `(auth)` | `/login`, `/register`, `/forgot-password` | Unauthenticated screens |
| `(app)` | All other routes | Authenticated screens with tab bar |

### Tab Navigation (Custom)

The main app layout (`(app)/_layout.tsx`) implements a **custom bottom tab bar** that renders different tabs depending on the user's role.

**Founder Tab Bar:**

| Tab | Icon | Screen |
|---|---|---|
| Home | home-outline | `/` (Dashboard) |
| My Listing | business-outline | `/my-listing` |
| Browse | search-outline | `/browse-investors` |
| Investors | people-outline | `/browse-investors` |
| More | menu-outline | MoreDrawer |

**Investor Tab Bar:**

| Tab | Icon | Screen |
|---|---|---|
| Home | home-outline | `/` (Dashboard) |
| Deal Flow | git-network-outline | `/deal-flow` |
| Browse | search-outline | `/browse` |
| Trending | trending-up-outline | `/trending` |
| More | menu-outline | MoreDrawer |

### MoreDrawer

The **More** tab opens a `MoreDrawer` — a bottom sheet menu that gives access to secondary screens not visible in the main tab bar:

- News Feed
- Funding Tracker
- Events
- Portfolio (Investor only)
- Ask AI
- Settings
- Profile

### Dynamic Routes

```
/browse/[id]       → StartupDetail  (id = founder_profile.id)
/investors/[id]    → InvestorDetail (id = investor_profile.id)
/funding/[id]      → FundingDetail  (id = funding_round.id)
```

---

## 7. Onboarding Flow

Every new user is required to complete onboarding before accessing the main app. Onboarding is a guided multi-step wizard that collects role-specific data.

### Step 1: Role Selection (`onboarding/role.tsx`)

The user selects whether they are:
- **An Investor** — to discover startups and manage deal flow
- **A Founder** — to list their startup and connect with investors

### Step 2a: Investor Wizard (`onboarding/investor-wizard.tsx`)

A 6-step wizard collecting:

| Step | What it collects |
|---|---|
| 1 | Investor type (Angel / VC / Bank / NBFC / Family Office / Corporate VC) |
| 2 | Sector focus (multi-select chips: FinTech, EdTech, HealthTech, SaaS, AgriTech…) |
| 3 | Stage preference (Pre-Seed, Seed, Series A, Series B, Series C, Growth) |
| 4 | Geography preference (cities/regions across India) |
| 5 | Ticket size range (min and max check size in USD) |
| 6 | Confirmation and profile creation |

Type-specific fields are shown conditionally:
- **Angel:** Just core fields
- **VC:** Fund name, fund size, fund stage
- **Bank:** Bank name, lending products
- **NBFC:** Institution name, lending type
- **Family Office:** Family name, AUM
- **Corporate VC:** Parent company, strategic focus

### Step 2b: Founder Wizard (`onboarding/founder-wizard.tsx`)

A multi-step wizard collecting founder and startup details:
- Founder type (active startup / idea stage)
- Company name and tagline
- Sector and funding stage
- Traction data (ARR, MoM growth, team size)

### Onboarding Completion

On completing the wizard, `completeOnboarding(role, roleData)` from `AuthContext`:
1. Inserts a row into `investor_profiles` or `founder_profiles`.
2. Updates `profiles.onboarding_completed = true` and `profiles.role = role`.
3. The root layout detects the change and redirects to the dashboard.

### Onboarding Components

| Component | Purpose |
|---|---|
| `ProgressStepper` | Visual step indicator showing current step / total steps |
| `SelectionCard` | Large tappable card for role or type selection |
| `ChipSelector` | Multi-select pill chips (sectors, stages, geography) |
| `SegmentedButtons` | Toggle between two or three options |
| `FeaturePills` | Hero section showing app features on role screen |

---

## 8. Role-Based Features

### Shared Features

Both Founders and Investors have access to:

| Feature | Description |
|---|---|
| Dashboard | Role-specific home with stats and quick access |
| Trending | Trending startups with signals and sector intelligence |
| News Feed | Curated startup news tagged by sector |
| Funding Tracker | Real-time public funding round data |
| Events | Startup networking events and conferences |
| Introductions | View and manage intro requests |
| Ask AI | AI-powered startup and investment insights |
| Profile | View and edit user profile |
| Settings | Full settings panel |

### Investor Features

| Feature | Description |
|---|---|
| Browse Startups | Search, filter, and discover startup listings |
| Startup Detail | Full startup profile with metrics and contact |
| Deal Flow | Personal deal pipeline with stage management |
| Portfolio | Track portfolio companies and performance |
| Co-Invest | Co-investment opportunities (Family Office only) |
| Partnership Intros | Startup-corporate partnership matching (CVC only) |

### Founder Features

| Feature | Description |
|---|---|
| My Listing | Create, edit, and manage startup marketplace listing |
| Browse Investors | Search and discover verified investors |
| Investor Detail | Full investor profile with thesis and sectors |

---

## 9. Screens & Pages (In Depth)

### Dashboard — `(app)/index.tsx`

The dashboard is the first screen users see after login. It renders a completely different UI based on `profile.role`.

**Founder Dashboard:**
- Role badge showing founder type
- Stats grid (2×2): Profile Views, Intro Requests, Investor Matches, Bookmarks
- Weekly profile views chart (bar chart)
- Upcoming events list with date, title, and location
- Call-to-action banner to submit startup application

**Investor Dashboard:**
- Role badge showing investor type (Angel, VC, etc.)
- Stats grid (2×2): Deals Reviewed, Companies Bookmarked, Intros Sent, Portfolio Size
- Horizontally scrollable top startups carousel
- Recent funding rounds list (last 5)
- Latest news articles (last 3)
- Quick access shortcuts to browse, trending, deal flow

---

### Login — `(auth)/login.tsx`

Clean, minimal login form:
- Email input (keyboard type: email)
- Password input (secure text entry)
- Forgot Password link
- Sign In button (disabled while loading)
- Link to registration

Validation: email must be valid format, password must be at least 6 characters.

---

### Register — `(auth)/register.tsx`

Account creation form:
- First name, last name (side by side)
- Email input
- Password input (8+ characters)
- Confirm password input (must match)
- Terms acknowledgment
- Create Account button

On success, Supabase sends an email confirmation. The user is moved to onboarding.

---

### My Listing — `(app)/my-listing.tsx` (Founder Only)

This is where founders create and manage their startup's marketplace listing.

**If no listing exists:**
- Empty state with illustration
- "Create Listing" button
- Opens a form to fill in startup details

**If a listing exists:**
- Status badge: Draft | Submitted | Approved | Rejected
- Listing preview showing all submitted details
- "Edit" button to modify

**Listing Form Fields:**
| Field | Type | Description |
|---|---|---|
| Company Name | Text | Official company name |
| Tagline | Text | One-line pitch |
| Website | URL | Company website |
| Sector | Select | Industry category |
| Stage | Select | Pre-Seed / Seed / Series A / B / C / Growth |
| ARR (USD) | Number | Annual Recurring Revenue |
| MoM Growth % | Number | Month-over-month growth rate |
| Funding Ask (USD) | Number | Target raise amount |
| Team Size | Number | Current headcount |
| Problem Statement | Long text | The problem being solved |
| Target Market | Long text | Customer segment description |
| Use of Funds | Long text | How the raise will be deployed |

**Listing Status Flow:**
```
Draft → Submitted → [Admin Review] → Approved (visible on marketplace)
                                  → Rejected (with feedback)
```

---

### Browse Startups — `(app)/browse.tsx` (Investor Only)

The primary startup discovery screen for investors.

**Features:**
- Search bar (searches name, sector, description in real time)
- Stage filter chips: All | Pre-Seed | Seed | Series A | Series B | Growth
- Startup cards in a scrollable list
- Pull-to-refresh
- Empty state when no results match filters

**StartupCard shows:**
- Company avatar / initials
- Company name + tagline
- Sector badge + Stage badge
- ARR and MoM growth metric pills
- Funding ask amount

Tapping a card navigates to `/browse/[id]` (Startup Detail).

---

### Startup Detail — `(app)/browse/[id].tsx` (Investor Only)

Full startup profile screen, loaded by startup ID.

**Sections:**
1. **Header:** Company avatar, name, tagline, verified badge
2. **Founder Info:** Founder name, title, LinkedIn link
3. **Metrics Grid (2×2):**
   - ARR (USD)
   - MoM Growth %
   - Raising Amount
   - Team Size
4. **About:** Problem statement text
5. **Target Market:** Market description
6. **Use of Funds:** Fund allocation description
7. **Profile Activity:** Total profile view count

**Action Buttons:**
- **Bookmark** — saves startup to investor's bookmark list
- **Request Introduction** — opens a modal form to send an intro request with a custom message
- **Visit Website** — opens company website in browser

---

### Browse Investors — `(app)/browse-investors.tsx` (Founder Only)

Investor discovery screen for founders.

**Features:**
- Search bar (name, institution)
- Sector filter chips
- InvestorCard list
- Pull-to-refresh

**InvestorCard shows:**
- Investor avatar / initials
- Name and title
- Institution name
- Sector badges (up to 3)
- Ticket size range
- Verification badge

Tapping a card navigates to `/investors/[id]` (Investor Detail).

---

### Investor Detail — `(app)/investors/[id].tsx`

Full investor profile loaded by ID.

**Sections:**
1. **Header:** Avatar, name, title, institution, location
2. **Investment Thesis:** Text description of investment focus
3. **Sectors:** Badge list of sectors
4. **Stage Preference:** Badge list of preferred stages
5. **Ticket Size:** Min–Max check size
6. **Geography:** Target markets
7. **Portfolio Count:** Number of investments

**Action Buttons:**
- Request Introduction (if founder)
- Visit LinkedIn / Website

---

### Deal Flow — `(app)/deal-flow.tsx` (Investor Only)

Personal deal pipeline tracker for investors.

**Pipeline Stages (Kanban-style):**
```
Sourced → Screening → First Call → Due Diligence → Term Sheet → Closed / Passed
```

**Stats Bar (top):**
- Active Deals
- Closed Deals
- Total Capital Committed
- Average Win Probability

**Features:**
- Add new deal button
- Weekly deal digest email toggle
- Stage-based filtering

> Note: The deal flow pipeline is currently in a scaffolded state with the data model and UI in place. Full CRUD operations for deal stages are in progress.

---

### Trending — `(app)/trending.tsx`

Real-time trending startup intelligence, powered by scraped news data.

**Two Tabs:**

**Tab 1: Trending Startups**
- Ranked list of trending startups with a rank badge
- Trend signal pill: Hot Deal, Strong Growth, New Entrant
- Company name, short description
- Metadata chips: City | Raising Amount | Lead Investor | Source | Date
- Link-out to original news article

**Tab 2: Sector Intelligence**
- Breakdown by sector showing:
  - Total funding rounds in the sector
  - Total capital deployed
  - Top companies in that sector

**Controls:**
- Sector filter chips (FinTech, EdTech, etc.)
- Sort by: Rank | Funding | Date

---

### News — `(app)/news/index.tsx`

Curated startup and investment news feed.

**Features:**
- NewsCard list with article preview
- Category filter chips
- Search bar
- Pull-to-refresh

**NewsCard shows:**
- Article thumbnail (if available)
- Headline
- Summary (2–3 lines)
- Source name + published date
- Hot / Featured badges

Tapping a card opens the full article in the system browser.

---

### Funding Tracker — `(app)/funding/index.tsx`

Real-time public funding round tracker. Data is sourced from scraped public databases.

**Stats Cards (top):**
| Stat | Description |
|---|---|
| Total Rounds | All-time funding rounds count |
| Capital Raised | Total capital across all rounds |
| This Week | Rounds announced in the past 7 days |
| Largest Round | Biggest single round amount |

**Controls:**
- Search by company name
- Stage filter: All | Pre-Seed | Seed | Series A | Series B | Series C | Growth
- Time filter: All Time | This Week | This Month

**Table View:**
| Column | Description |
|---|---|
| Company | Company name + sector badge |
| Round | Round type (Seed, Series A…) |
| Amount | USD amount raised |
| Investor | Lead investor name |
| Date | Announced date |

Tapping a row navigates to `/funding/[id]` for full details.

---

### Funding Detail — `(app)/funding/[id].tsx`

Full detail view for a single funding round:
- Company name + logo
- Amount raised (prominent display)
- Round stage
- Lead investor(s)
- Sector
- Location / City / Country
- Announcement date
- Source link (news article)

---

### Introductions — `(app)/introductions.tsx`

Introduction request management screen.

**For Founders:** Shows a list of intro requests received from investors with:
- Investor name and institution
- Custom message sent
- Date of request
- Accept / Decline actions

**For Investors:** Shows intro requests they have sent with:
- Startup name
- Message sent
- Status (pending / accepted / declined)

Tapping opens a detail modal with full message and contact info.

---

### Ask AI — `(app)/ask-ai.tsx`

AI-powered insights screen. Allows users to:
- Ask natural language questions about startups, sectors, investment theses
- Get AI-generated summaries of trending sectors
- Receive startup recommendations based on investor profile
- Get due diligence checklists for a specific startup

---

### Events — `(app)/events.tsx`

Startup events and networking opportunities.

**EventCard shows:**
- Event name and type (Demo Day, Conference, Networking, Hackathon)
- Date and time
- Location (in-person or virtual)
- Organizer name
- Registration link

---

### Portfolio — `(app)/portfolio.tsx` (Investor Only)

Portfolio tracking for investors.

- List of portfolio companies
- Company name, sector, stage at investment
- Investment date and amount
- Current round / valuation (if updated)

---

### Profile — `(app)/profile/index.tsx`

View and edit the logged-in user's public profile:
- Avatar with photo picker
- Display name
- Bio text
- Role badge
- LinkedIn URL
- Website URL
- Public profile link

---

## 10. Components Library

### UI Primitives (`components/ui/`)

**Button.tsx**
Reusable button with four visual variants and a loading state.

| Prop | Type | Description |
|---|---|---|
| `variant` | `primary \| secondary \| outline \| ghost` | Visual style |
| `size` | `sm \| md \| lg` | Size variant |
| `loading` | `boolean` | Shows spinner, disables tap |
| `disabled` | `boolean` | Greyed-out state |
| `onPress` | `() => void` | Tap handler |
| `children` | `ReactNode` | Button label |

**Card.tsx**
A container with white background, rounded corners, and a subtle shadow. Used throughout the app for content grouping.

**Input.tsx**
A styled text input with:
- Label above the field
- Focus border highlight (blue)
- Error message below
- Support for `secureTextEntry`, `keyboardType`, `multiline`

**Avatar.tsx**
Displays a user's profile image. Falls back to initials in a colored circle when no image URL is provided.

**Badge.tsx**
Small pill-shaped label for categories, statuses, and tags. Color variants: blue, green, amber, red, gray.

**Loader.tsx**
Full-screen or inline loading spinner wrapped in an `ActivityIndicator`.

**EmptyState.tsx**
Illustrated empty state for when a list has no data. Accepts `title`, `description`, and an optional `action` button.

---

### Domain Components

**StartupCard.tsx**
Displays a startup in browse and trending lists.

| Section | Content |
|---|---|
| Left | Avatar / company initials |
| Top | Company name + verification badge |
| Sub | Tagline (1 line, truncated) |
| Badges | Sector + Stage |
| Metrics | ARR pill + MoM growth pill |
| Bottom right | Funding ask chip |

**InvestorCard.tsx**
Displays an investor profile in browse lists.

| Section | Content |
|---|---|
| Left | Avatar |
| Top | Full name + verified badge |
| Sub | Title + Institution |
| Badges | Top 3 sectors |
| Bottom | Ticket size range |

**FundingCard.tsx**
Displays a single funding round in the funding tracker.

| Section | Content |
|---|---|
| Left | Company initials badge |
| Top | Company name + round stage |
| Metrics | Amount raised + Sector |
| Bottom | Lead investor + date |

**NewsCard.tsx**
Displays a news article.

| Section | Content |
|---|---|
| Top | Thumbnail image |
| Title | Article headline |
| Body | Summary (2–3 lines) |
| Footer | Source name + date + Hot badge |

**MoreDrawer.tsx**
A bottom sheet navigation menu opened by the More tab. Contains role-filtered secondary navigation links.

---

### Onboarding Components

| Component | Description |
|---|---|
| `ProgressStepper` | Horizontal stepper showing current step (e.g. "Step 2 of 6") with filled/unfilled circles |
| `SelectionCard` | Large pressable card with an icon, title, description, and selected highlight state |
| `ChipSelector` | Horizontal-wrapping chip multi-select. Chips toggle on/off with a blue highlight |
| `SegmentedButtons` | Toggle control for 2–3 mutually exclusive options |
| `FeaturePills` | Horizontal scrolling row of feature highlight pills on the role selection screen |

---

## 11. Custom Hooks

All data-fetching logic lives in custom hooks inside `hooks/`. Each hook follows the same pattern:

```typescript
function useXxx() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetch = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('table').select('*');
    // handle result
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  return { data, loading, error, refresh: fetch };
}
```

### Hook Reference

**`useAuth`**
Exposes the full auth context (user, session, profile, signIn, signUp, signOut, completeOnboarding, refreshProfile). Components should import this from `context/AuthContext.tsx`.

**`useFunding`**
Fetches funding rounds from the `funding_rounds` table.
- Supports filtering by stage, date range, and search query
- Returns: `{ rounds, loading, error, fetchRounds }`

**`useStartups`**
Fetches startup profiles from `founder_profiles`.
- Supports search by name/sector and stage filtering
- Returns: `{ startups, loading, error, fetchStartups }`

**`useInvestors`**
Merges data from `investor_profiles` (platform users) and `scraped_investors` (external database).
- Supports search by name/institution and sector filtering
- Returns: `{ investors, loading, error, fetchInvestors }`

**`useNews`**
Fetches articles from the `news_articles` table.
- Sorted by `published_at` descending
- Supports category filtering
- Returns: `{ articles, loading, error, fetchNews }`

**`useTrending`**
Fetches public startup data from the `public_startups` table (sourced from scraped news).
- `getSectorStats()` — aggregates funding data by sector
- Returns: `{ startups, loading, error, getSectorStats }`

**`useIntroductions`**
Fetches and manages intro requests from `founder_intro_requests`.
- Filtered by the current user's role (sender or recipient)
- Returns: `{ introductions, loading, error, sendIntro, updateStatus }`

**`useEvents`**
Fetches events from `startup_events`.
- Sorted by event date ascending
- Returns: `{ events, loading, error, fetchEvents }`

---

## 12. Data Models & Types

All TypeScript interfaces are defined in `types/index.ts`.

### Enums

```typescript
type UserRole = 'investor' | 'founder';

type InvestorType =
  | 'angel'
  | 'venture-capital'
  | 'bank'
  | 'nbfc'
  | 'family-office'
  | 'corporate-venture';

type FounderType = 'active' | 'idea';

type StartupStage =
  | 'pre-seed'
  | 'seed'
  | 'series-a'
  | 'series-b'
  | 'series-c'
  | 'growth';

type ApplicationStatus = 'draft' | 'submitted' | 'approved' | 'rejected';
```

### Core Interfaces

**`Profile`** — Base user profile (one per account)
```typescript
interface Profile {
  id: string;                    // UUID (matches auth.users.id)
  first_name: string;
  last_name: string;
  company?: string;
  role: UserRole;
  investor_type?: InvestorType;
  founder_type?: FounderType;
  onboarding_completed: boolean;
  avatar_url?: string;
  bio?: string;
  created_at: string;
  updated_at: string;
}
```

**`InvestorProfile`** — Investor specialization details
```typescript
interface InvestorProfile {
  id: string;
  user_id: string;               // FK → profiles.id
  title: string;
  bio?: string;
  linkedin_url?: string;
  website?: string;
  location?: string;
  investment_thesis?: string;
  sectors: string[];
  stage_preference: string[];
  geography: string[];
  ticket_size_min?: number;      // USD
  ticket_size_max?: number;      // USD
  fund_name?: string;
  actively_investing: boolean;
  is_verified: boolean;
  portfolio_count?: number;
  created_at: string;
}
```

**`FounderProfile`** — Founder and startup details
```typescript
interface FounderProfile {
  id: string;
  user_id: string;               // FK → profiles.id
  company_name: string;
  sector?: string;
  stage?: string;
  arr?: number;                  // Annual Recurring Revenue (USD)
  mom_growth?: number;           // Month-over-month growth (%)
  raise_amount?: number;         // Target raise (USD)
  team_size?: number;
  founded_year?: number;
  bio?: string;
  problem_statement?: string;
  target_market?: string;
  website?: string;
  linkedin_url?: string;
  pitch_deck_url?: string;
  verification_status: 'unverified' | 'pending' | 'verified';
  views_count: number;
  created_at: string;
}
```

**`StartupApplication`** — Marketplace listing submitted by founder
```typescript
interface StartupApplication {
  id: string;
  founder_id: string;            // FK → profiles.id
  company_name: string;
  tagline?: string;
  sector?: string;
  stage?: string;
  arr_usd?: number;
  growth_rate_pct?: number;
  funding_ask_usd?: number;
  team_size?: number;
  trust_badge?: string;
  status: ApplicationStatus;
  created_at: string;
  updated_at: string;
}
```

**`FundingRound`** — Public funding event
```typescript
interface FundingRound {
  id: string;
  company_name: string;
  lead_investor?: string;
  amount_usd?: number;
  round_type?: string;
  stage?: string;
  sector?: string;
  location?: string;
  country?: string;
  announced_at: string;
  source_url?: string;
  source_name?: string;
}
```

**`NewsArticle`** — News item
```typescript
interface NewsArticle {
  id: string;
  title: string;
  summary?: string;
  url: string;
  source: string;
  image_url?: string;
  category?: string;
  sector_tags: string[];
  is_hot: boolean;
  is_featured: boolean;
  published_at: string;
}
```

**`ScrapedInvestor`** — External investor from scraped database
```typescript
interface ScrapedInvestor {
  id: string;
  name: string;
  institution?: string;
  title?: string;
  location?: string;
  sectors: string[];
  stages: string[];
  check_min?: number;
  check_max?: number;
  investment_thesis?: string;
  portfolio_count?: number;
  response_rate?: number;
  verified: boolean;
  actively_investing: boolean;
  email?: string;
  website?: string;
  linkedin_url?: string;
}
```

---

## 13. State Management

Capital Connect uses a **lightweight, hook-driven state management** approach without Redux or Zustand.

### Global State

Only **authentication state** is global, managed by `AuthContext` which wraps the entire app in `app/_layout.tsx`:

```
AuthContext
├── user          (Supabase User)
├── session       (Supabase Session)
├── profile       (profiles table row)
└── loading       (boolean)
```

### Local State

Each screen owns its local state via React's `useState` and `useEffect`. Data fetching is delegated to custom hooks that encapsulate the loading/error/data state triplet.

### Data Flow Diagram

```
Screen Component
    │
    ├── useAuth()        ← global context
    │       └── profile.role (determines what to render)
    │
    └── useStartups()    ← local hook
            │
            ▼
        Supabase SDK
            │
            ▼
        PostgreSQL DB
            │
            ▼
        setState() → re-render
```

### Why No Redux / Zustand?

The app's data is largely non-interdependent (funding rounds don't affect investor profiles, etc.), and screens don't need to share domain-specific data. A centralised store would add boilerplate without benefit. The only truly shared state is auth, which uses Context.

---

## 14. Supabase Integration

### Client Initialization (`lib/supabase.ts`)

```typescript
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,  // disabled for React Native
    },
  }
);
```

### Database Tables

| Table | Description |
|---|---|
| `auth.users` | Supabase managed auth table |
| `profiles` | Base user profile (one per user) |
| `investor_profiles` | Investor specialization (one per investor) |
| `founder_profiles` | Founder/startup data (one per founder) |
| `startup_applications` | Marketplace listings from founders |
| `funding_rounds` | Scraped and curated public funding data |
| `news_articles` | Curated and scraped news |
| `scraped_investors` | External investor database (scraped) |
| `public_startups` | Trending/public startup data (scraped) |
| `founder_bookmarks` | Investor's bookmarked startups |
| `founder_intro_requests` | Intro request messages |
| `startup_events` | Events database |

### Common Query Patterns

**Read a single record:**
```typescript
const { data, error } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', userId)
  .single();
```

**Read a filtered list:**
```typescript
const { data, error } = await supabase
  .from('funding_rounds')
  .select('*')
  .eq('stage', 'seed')
  .order('announced_at', { ascending: false })
  .limit(20);
```

**Create a record:**
```typescript
const { data, error } = await supabase
  .from('startup_applications')
  .insert({ founder_id: userId, company_name: 'Acme' })
  .select()
  .single();
```

**Update a record:**
```typescript
const { error } = await supabase
  .from('profiles')
  .update({ bio: newBio })
  .eq('id', userId);
```

**Delete a record:**
```typescript
const { error } = await supabase
  .from('founder_bookmarks')
  .delete()
  .eq('id', bookmarkId);
```

### Row-Level Security (RLS)

All sensitive tables have Row-Level Security policies enforced on the Supabase backend:
- Investors can only read approved startup applications.
- Founders can only write to their own `founder_profiles` and `startup_applications`.
- Intro requests are visible only to the sender and recipient.

---

## 15. Design System & Styling

### Color Palette (`constants/colors.ts`)

| Token | Value | Usage |
|---|---|---|
| `primary` | `#1865f6` | Buttons, links, active state |
| `success` | `#10b981` | Positive values, verified badges |
| `warning` | `#f59e0b` | Alerts, draft status |
| `danger` | `#ef4444` | Errors, decline actions |
| `textPrimary` | `#0f172a` | Body text, headings |
| `textMuted` | `#94a3b8` | Placeholder, secondary text |
| `border` | `#e2e8f0` | Card borders, dividers |
| `background` | `#f8fafc` | Screen background |
| `surface` | `#ffffff` | Card/component background |

### Styling Approach

The app uses a **hybrid styling strategy**:

1. **`StyleSheet.create()`** — Used for all fixed, performance-sensitive styles. This is the primary approach as it avoids style recalculation on every render.

2. **Inline styles** — Used only for dynamic values like colours derived from data (sector colour, badge colour).

3. **NativeWind** — Tailwind CSS class names (e.g. `className="px-4 py-2 rounded-lg"`) are available for rapid prototyping. Some screens use this for layout.

### Layout Constants

| Property | Value |
|---|---|
| Screen padding | 16px |
| Card padding | 16px |
| Component gap | 12px |
| Border radius (card) | 12px |
| Border radius (button) | 8px |
| Border radius (badge) | 999px (pill) |

### Typography

| Usage | Font Size | Weight |
|---|---|---|
| Screen title | 24px | Bold (700) |
| Section heading | 18px | SemiBold (600) |
| Card title | 16px | SemiBold (600) |
| Body text | 14px | Regular (400) |
| Caption | 12px | Regular (400) |
| Badge text | 11px | Medium (500) |

---

## 16. Form Handling & Validation

### Libraries

- **react-hook-form** — manages form state, submission, and dirty tracking
- **zod** — defines validation schemas
- **@hookform/resolvers** — bridges Zod schemas into react-hook-form

### Validation Pattern

```typescript
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  email: z.string().email('Must be a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const { control, handleSubmit, formState: { errors } } = useForm({
  resolver: zodResolver(schema),
});

// Controlled input example
<Controller
  control={control}
  name="email"
  render={({ field: { onChange, value } }) => (
    <Input
      label="Email"
      value={value}
      onChangeText={onChange}
      error={errors.email?.message}
    />
  )}
/>
```

### Form Schemas

**Login:**
- `email` — valid email format, required
- `password` — minimum 6 characters, required

**Registration:**
- `firstName`, `lastName` — required, minimum 2 characters
- `email` — valid email format
- `password` — minimum 8 characters
- `confirmPassword` — must match `password`

**Startup Listing:**
- `company_name` — required
- `arr_usd`, `funding_ask_usd`, `team_size` — optional numbers, non-negative
- `growth_rate_pct` — optional number, 0–1000 range

---

## 17. Settings & Preferences

The settings section is accessed from the More drawer and contains five sub-screens:

### Profile Settings (`settings/profile.tsx`)
- Upload/change profile photo (expo-image-picker)
- Edit display name
- Edit bio
- Update LinkedIn URL
- Update website URL

### Account Settings (`settings/account.tsx`)
- View/change email address
- Change password
- Enable two-factor authentication (2FA)
- Delete account

### Notifications (`settings/notifications.tsx`)
- Toggle email digest (weekly summary)
- Toggle deal alerts (new matching startups)
- Toggle introduction request notifications
- Toggle funding round alerts by sector

### Privacy (`settings/privacy.tsx`)
- Profile visibility (public / investors only / private)
- Allow intro requests toggle
- Data sharing preferences

### Appearance (`settings/appearance.tsx`)
- Theme selector (Light / Dark / System)
- Font size preference

---

## 18. Build & Deployment

### Local Development

```bash
# Install dependencies
npm install

# Start Expo dev server (opens Expo Go QR code)
npm start

# Run on Android emulator
npm run android

# Run on iOS simulator
npm run ios

# Run in web browser
npm run web
```

### EAS Build (`eas.json`)

Capital Connect uses **EAS Build** for cloud builds.

**Build Profiles:**

| Profile | Target | Use Case |
|---|---|---|
| `development` | Android APK | Internal testing with dev tools |
| `preview` | Android APK | Stakeholder preview builds |
| `production` | Android AAB | Google Play Store release |

**Build Commands:**

```bash
# Development build
npm run build:dev
# eas build --platform android --profile development

# Preview build
npm run build:preview
# eas build --platform android --profile preview

# Production build
npm run build:production
# eas build --platform android --profile production
```

### App Configuration (`app.json`)

| Property | Value |
|---|---|
| App Name | Capital Connect |
| Slug | `capital-connect` |
| Android Package | `com.capitalconnect.app` |
| iOS Bundle ID | `com.capitalconnect.app` |
| EAS Project ID | `f82e8c90-6c07-401c-8f06-b33dc8d4bf0e` |
| Expo SDK | 55 |

### Plugins Used

- `expo-router` — file-based routing
- `expo-secure-store` — encrypted storage
- `expo-image-picker` — photo selection

---

## 19. Environment Configuration

Create a `.env.local` file in the project root with:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

> Variables prefixed with `EXPO_PUBLIC_` are injected at build time and accessible in client code via `process.env.EXPO_PUBLIC_*`.

These variables must also be configured in EAS Secrets for cloud builds.

---

## 20. Feature Summary

| Feature | Founder | Investor |
|---|---|---|
| Email / Password Auth | Yes | Yes |
| Multi-step Onboarding | Yes | Yes |
| Role-specific Dashboard | Yes | Yes |
| Startup Marketplace Listing | Yes | — |
| Browse & Discover Startups | — | Yes |
| Startup Detail View | — | Yes |
| Bookmark Startups | — | Yes |
| Browse Investor Directory | Yes | — |
| Investor Detail View | Yes | — |
| Send Intro Requests | — | Yes |
| Receive Intro Requests | Yes | — |
| Real-time Funding Tracker | Yes | Yes |
| Trending Startups | Yes | Yes |
| Sector Intelligence | Yes | Yes |
| Curated News Feed | Yes | Yes |
| Deal Flow Pipeline | — | Yes |
| Portfolio Tracking | — | Yes |
| Co-Investment Board | — | Family Office |
| Partnership Proposals | — | Corporate VC |
| Events & Networking | Yes | Yes |
| Ask AI Insights | Yes | Yes |
| Profile Management | Yes | Yes |
| Notification Preferences | Yes | Yes |
| Privacy Controls | Yes | Yes |
| EAS Cloud Builds | — | — |

---

*Capital Connect Mobile — Built with Expo, React Native, TypeScript, and Supabase*
