# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LevFood Web is a Nuxt 4 full-stack application for a meal delivery service with an integrated admin panel. The app uses Firebase for authentication and data storage, with support for payment gateway (Stripe) and invoice generation (Superfaktura).

## Development Commands

```bash
# Install dependencies
pnpm install

# Start development server (http://localhost:3000)
pnpm dev

# Build for production
pnpm build

# Preview production build locally
pnpm preview
```

## Tech Stack

- **Framework**: Nuxt 4 with Vue 3 and TypeScript
- **UI**: Nuxt UI with Tailwind CSS 4
- **Auth**: Firebase Authentication (email/password, Google, Apple)
- **Database**: Firebase Firestore
- **Payments**: Stripe
- **Invoicing**: Superfaktura API
- **Email**: Nodemailer with SMTP
- **Icons**: @nuxt/icon with Iconify
- **Charts**: Chart.js with vue-chartjs
- **PDF Export**: jsPDF with jspdf-autotable

## Architecture

### Directory Structure

```
app/
├── composables/         # Vue composables for reusable logic
│   ├── useAuth.ts      # Firebase authentication management
│   ├── useFirebase.ts  # Firebase client initialization
│   ├── useAuthFetch.ts # Authenticated API requests
│   └── useNotifications.ts # Push notification handling
├── pages/              # File-based routing
│   ├── index.vue       # Public homepage
│   ├── login.vue       # Authentication page
│   ├── objednavka.vue  # Order form
│   └── dashboard/      # Admin panel pages
├── components/         # Vue components
├── layouts/            # App layouts (default, dashboard)
├── middleware/         # Route middleware
│   └── auth.global.ts  # Global auth guard
├── lib/
│   ├── types/          # TypeScript type definitions
│   └── firebase/       # Firebase configuration
└── plugins/            # Nuxt plugins

server/
├── api/                # API endpoints (Nuxt server routes)
│   ├── auth/           # Authentication endpoints
│   ├── orders/         # Order management
│   ├── meals/          # Meal menu management
│   ├── stripe/         # Stripe payment integration
│   ├── superfaktura/   # Invoice generation
│   ├── notifications/  # Push notifications
│   ├── admin-users/    # Admin user management
│   └── cms/            # Dashboard analytics
├── utils/              # Server utilities
│   ├── firebase-admin.ts    # Firebase Admin SDK initialization
│   ├── email.ts             # Email sending with templates
│   ├── superfaktura.ts      # Superfaktura API client
│   └── notifications.ts     # Push notification utilities
└── middleware/         # Server middleware
```

### Authentication System

The app uses dual Firebase initialization:
- **Client-side**: Firebase JS SDK (`app/composables/useFirebase.ts`)
  - Handles user authentication in browser
  - Manages auth state with `useAuth` composable
  - Provides auth methods: email/password, Google, Apple sign-in

- **Server-side**: Firebase Admin SDK (`server/utils/firebase-admin.ts`)
  - Verifies ID tokens from authenticated requests
  - Accesses Firestore with admin privileges
  - Requires `FIREBASE_SERVICE_ACCOUNT` environment variable

Authentication flow:
1. Client authenticates via Firebase Auth
2. Client gets ID token and sends to server in requests
3. Server verifies token using `verifyIdToken()`
4. Protected API endpoints use `useAuthFetch` composable

### Route Protection

`app/middleware/auth.global.ts` handles route guards:
- Protected routes: `/dashboard/*`, `/app/*` - require authentication
- Auth routes: `/login`, `/register` - redirect authenticated users to dashboard
- Middleware waits for Firebase Auth initialization before redirecting

### Data Models

Key collections in Firestore:

**orders** - Customer meal orders
- Fields: orderId (6-digit), clientId, package, duration, deliveryType, paymentStatus
- Created via `server/api/orders/create.post.ts`
- Pricing calculated in `app/lib/types/order.ts`

**clients** - Customer profiles
- Fields: email, firstName, lastName, phone, accountStatus, currentPlan
- Auto-created or updated when order is placed
- Tracks totalOrders, totalSpent, subscriptionEndDate

**meals** - Weekly meal menus
- Organized by week ID (YYYY-WW format)
- Contains meals for each package type per day
- Managed via admin dashboard at `/dashboard/pridanie-jedla`

**notifications** - Push notification tokens
- Stores FCM tokens for web push
- Associated with user UIDs

### API Route Patterns

Server API routes follow Nuxt 3 conventions:
```
server/api/[resource]/[action].{method}.ts
```

Examples:
- `server/api/orders/create.post.ts` - POST /api/orders/create
- `server/api/meals/[weekId].get.ts` - GET /api/meals/:weekId
- `server/api/admin-users/[uid].delete.ts` - DELETE /api/admin-users/:uid

All routes export `defineEventHandler()` and use Zod schemas for validation.

### Email System

Email sending via `server/utils/email.ts`:
- Uses Nodemailer with SMTP configuration from env vars
- Templates: password reset, admin notifications
- HTML emails with inline CSS for compatibility
- Transporter initialized lazily on first use

Email types defined in `app/lib/types/email.ts`.

### Payment Integration

**Stripe** (`server/api/stripe/`)
- Checkout sessions for card payments
- Webhook handling for payment confirmations
- Requires: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET

Orders are created via `server/api/orders/create.post.ts` after successful Stripe payment.

### Invoice Generation

Superfaktura integration (`server/utils/superfaktura.ts`):
- Automatically generates invoices for paid orders
- Sandbox mode for testing (SUPERFAKTURA_IS_SANDBOX=true)
- Requires: SUPERFAKTURA_EMAIL, SUPERFAKTURA_API_KEY, SUPERFAKTURA_COMPANY_ID

## Environment Variables

Required environment variables (see `.env.example` for full list):

**Firebase** (both client and admin):
- Client: FIREBASE_API_KEY, FIREBASE_AUTH_DOMAIN, etc.
- Admin: FIREBASE_SERVICE_ACCOUNT (JSON string)

**Payment gateways**:
- Stripe: STRIPE_PUBLIC_KEY, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET

**Email**:
- SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD
- SMTP_FROM_EMAIL, SMTP_FROM_NAME

**Other**:
- SUPERFAKTURA_* for invoice generation
- GOOGLE_MAPS_API_KEY for delivery address maps
- GOOGLE_ANALYTICS_ID for GA4 tracking
- APP_URL for production deployment

## Key Features

1. **Order System**: Multi-step order form with package selection, delivery options, and payment
2. **Admin Dashboard**: Statistics, charts, order management, meal menu editing
3. **Authentication**: Firebase auth with email/password, Google, and Apple sign-in
4. **Payment Processing**: Stripe integration with webhook handling
5. **Invoice Generation**: Automatic Superfaktura invoice creation
6. **Email Notifications**: Transactional emails for password reset and admin alerts
7. **Push Notifications**: FCM web push for order updates
8. **PDF Export**: Order and statistics export functionality
9. **Analytics**: Google Analytics 4 integration via Nuxt Scripts

## Development Notes

- **Nuxt 4**: Uses new directory structure with `app/` folder
- **TypeScript**: Strict typing throughout with Zod validation
- **SVG Imports**: Using vite-svg-loader (defaultImport: 'url')
- **Color Mode**: Disabled in Nuxt UI config (light mode only)
- **Firestore Timestamp**: Handle carefully - different between client SDK and Admin SDK
- **API Authentication**: Use `useAuthFetch` composable for authenticated API calls
- **Package Manager**: pnpm is used (see lock file)

## Testing Endpoints

Test endpoints available in development:
- `/dashboard/stripe-test` - Test Stripe integration
- `/dashboard/superfaktura-test` - Test invoice generation
- `/email-test` - Test email sending
- `POST /api/test/send-email` - Email sending API test