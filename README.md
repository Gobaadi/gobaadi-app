<div align="center">

# 🐄 Gobadi

**Livestock & Pet Healthcare Platform**

A comprehensive mobile application connecting animal owners with veterinary professionals, featuring AI-assisted diagnosis, telemedicine, and a full commerce ecosystem.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Expo](https://img.shields.io/badge/Expo-SDK%2057-black)](https://expo.dev)
[![NestJS](https://img.shields.io/badge/NestJS-10-red)](https://nestjs.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue)](https://www.postgresql.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue)](https://www.typescriptlang.org)

</div>

---

## Overview

Gobadi is a dual-role platform serving both **animal owners** and **veterinary doctors**. The app streamlines livestock management, veterinary appointments, product commerce, and real-time communication — all in one place.

### For Animal Owners
- Browse and register livestock with detailed profiles
- Book veterinary appointments with real doctors
- AI-powered disease diagnosis from images and symptoms
- Shop agricultural products and supplies
- Real-time chat and video consultation with vets
- Track medical records and treatment history

### For Veterinarians
- Manage appointment bookings and availability
- Access patient records and medical history
- Conduct video consultations
- Create prescriptions and medical reports
- Earn through consultation fees

---

## Tech Stack

### Mobile App (`app/`)
| Technology | Purpose |
|-----------|---------|
| [Expo SDK 57](https://expo.dev) | Cross-platform mobile framework |
| [React Native 0.86](https://reactnative.dev) | Native UI components |
| [Expo Router](https://docs.expo.dev/router/introduction) | File-based navigation |
| [Redux Toolkit](https://redux-toolkit.js.org) + RTK Query | State management & API caching |
| [Socket.IO Client](https://socket.io) | Real-time chat |
| [Reanimated 4](https://docs.expo.dev/versions/latest/sdk/reanimated/) | Smooth animations |

### Backend (`backend/`)
| Technology | Purpose |
|-----------|---------|
| [NestJS 10](https://nestjs.com) | Enterprise Node.js framework |
| [TypeORM](https://typeorm.io) | Database ORM |
| [PostgreSQL 16](https://www.postgresql.org) | Primary database |
| [Redis](https://redis.io) | Caching & message broker |
| [BullMQ](https://docs.bullmq.io) | Job queue processing |
| [Meilisearch](https://www.meilisearch.com) | Full-text search engine |
| [Cloudinary](https://cloudinary.com) | Media storage & optimization |
| [Socket.IO](https://socket.io) | WebSocket server |

### Infrastructure
| Technology | Purpose |
|-----------|---------|
| [Docker](https://www.docker.com) | Containerization |
| [Docker Compose](https://docs.docker.com/compose) | Local development stack |
| [Expo Notifications](https://docs.expo.dev/versions/latest/sdk/notifications/) | Push notifications |

---

## Project Structure

```
gobadi-app/
├── app/                          # Expo mobile application
│   ├── src/
│   │   ├── app/                  # Expo Router screens
│   │   │   ├── (tabs)/           # Tab navigation screens
│   │   │   └── *.tsx             # Stack screens
│   │   ├── components/           # Reusable UI components
│   │   ├── store/                # Redux store & RTK Query slices
│   │   ├── hooks/                # Custom React hooks
│   │   ├── lib/                  # Utilities (socket, push notifications)
│   │   └── constants/            # App constants & theme
│   └── assets/                   # Images, icons, fonts
│
├── backend/                      # NestJS backend API
│   └── src/
│       ├── auth/                 # Authentication (JWT, OAuth, OTP)
│       ├── users/                # User management
│       ├── doctors/              # Doctor profiles & availability
│       ├── animals/              # Animal registration & profiles
│       ├── appointments/         # Booking & scheduling
│       ├── chat/                 # Real-time messaging
│       ├── notifications/        # Push & in-app notifications
│       ├── products/             # Product catalog
│       ├── orders/               # Order management
│       ├── payments/             # Payment processing (bKash)
│       ├── wallet/               # In-app wallet & coins
│       ├── ai-diagnosis/         # AI disease analysis
│       ├── medical-events/       # Medical records
│       ├── prescriptions/        # Prescription management
│       ├── clinics/              # Veterinary clinics
│       ├── search/               # Full-text search (Meilisearch)
│       ├── dashboard/            # DashboardModule — admin web API (/dashboard/*)
│       └── seed/                 # Database seeder
│
└── docker-compose.yml            # Development services
```

### One backend, two frontends

This NestJS backend is the **single API** for both frontends:

| Frontend | Consumer | API surface |
|---|---|---|
| Expo mobile app (`app/`) | farmers, doctors, clinics | app modules (`/auth`, `/animals`, `/appointments`, `/search`, …) |
| Admin dashboard web (`gobadi-dashboard-jidan/frontend`) | admins, super admins | `DashboardModule` — all routes under `/dashboard/*` |

`DashboardModule` (`src/dashboard/`) exposes 58 admin APIs: user/admin auth, admin CRUD, user lists, analytics (17), animals, notifications, and search — guarded by type-agnostic JWT guards (`DashboardAuthGuard`, `DashboardAdminGuard` = `admin`/`super_admin`, `DashboardSuperAdminGuard` = `super_admin`).

**Kept routes:** legacy `/admin/*` and `GET /search` routes remain in the app modules for Expo and other existing clients — they were not deleted during the dashboard migration.

---

## Features

### Core Features

| Feature | Description |
|---------|-------------|
| 🔐 **Authentication** | Phone/Email OTP, Password login, Google & Facebook OAuth |
| 👥 **Dual Roles** | Separate interfaces for Animal Owners and Veterinarians |
| 🐄 **Animal Management** | Register, track, and manage livestock with detailed profiles |
| 🏥 **Doctor Booking** | Schedule appointments with available time slots |
| 💊 **AI Diagnosis** | Upload images + symptoms for AI-powered disease analysis |
| 💬 **Real-time Chat** | Socket.IO powered messaging between owners and vets |
| 📹 **Video Calls** | Telemedicine consultations (ready for provider integration) |
| 🛒 **Commerce** | Full shopping cart, wishlist, checkout, and order tracking |
| 💳 **Payments** | bKash integration, wallet system, and discount codes |
| 📋 **Medical Records** | Comprehensive health history, prescriptions, lab tests |
| 🔔 **Push Notifications** | Expo-powered alerts for appointments and messages |
| 🔍 **Search** | Meilisearch-powered full-text search across the platform |

### Doctor Portal
- Manage appointment bookings
- Set weekly availability with date-specific overrides
- Block time slots with automatic conflict detection
- View patient medical history
- Create and send prescriptions
- Real-time chat with patients

### User Dashboard
- Browse and register animals
- Book veterinary appointments
- View medical records and treatment history
- Shop products with bKash payment
- Earn coins through referrals and activities
- AI-assisted disease diagnosis

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) >= 18
- [npm](https://www.npmjs.com) or [yarn](https://yarnpkg.com)
- [Docker](https://www.docker.com) (optional, for database)
- [Expo CLI](https://docs.expo.dev/get-started/installation/)

### Installation

```bash
# Clone the repository
git clone https://github.com/Arpan-Dey-Web/Gobadi-app.git
cd Gobadi-app
```

#### Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start database (using Docker)
docker-compose up -d postgres redis meilisearch

# Run database migrations & seed
npm run migration:run
npm run seed

# Start development server
npm run start:dev
```

#### Mobile App Setup

```bash
cd app

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start Expo development server
npx expo start
```

### Environment Variables

#### Backend (`.env`)

```env
# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=gobadi
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=your_password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Authentication
JWT_SECRET=your_jwt_secret
JWT_EXPIRATION=24h

# OAuth
GOOGLE_CLIENT_ID=your_google_client_id
FACEBOOK_APP_ID=your_facebook_app_id

# Cloudinary (media uploads)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# bKash Payment
BKASH_APP_KEY=your_bkash_app_key
BKASH_APP_SECRET=your_bkash_app_secret
BKASH_USERNAME=your_bkash_username
BKASH_PASSWORD=your_bkash_password

# Meilisearch
MEILISEARCH_HOST=http://localhost:7700
MEILISEARCH_API_KEY=your_master_key

# Expo Push Notifications
EXPO_ACCESS_TOKEN=your_expo_access_token
```

#### Mobile App (`.env`)

```env
API_BASE_URL=http://localhost:3000
EXPO_PUBLIC_API_URL=http://localhost:3000
```

---

## API Documentation

The backend API is documented using Swagger. Once the server is running, access the interactive docs at:

```
http://localhost:3000/api/docs
```

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/auth/register` | Register new account |
| `POST` | `/auth/login` | Login with credentials |
| `POST` | `/auth/verify-otp` | Verify OTP code |
| `GET` | `/doctors` | List all doctors |
| `GET` | `/doctors/:id/slots` | Get available slots |
| `POST` | `/appointments/book` | Book an appointment |
| `GET` | `/animals` | List user's animals |
| `POST` | `/animals` | Register new animal |
| `GET` | `/products` | Browse products |
| `POST` | `/cart` | Add to cart |
| `POST` | `/orders` | Create order |
| `POST` | `/payments/intent` | Initiate payment |
| `GET` | `/wallet` | Get wallet balance |
| `POST` | `/ai-diagnosis/analyze` | AI disease analysis |
| `GET` | `/chat/conversations` | List conversations |
| `POST` | `/chat/messages` | Send message |

---

## Docker Services

The `docker-compose.yml` includes all required services:

```bash
# Start all services
docker-compose up -d

# Services included:
# - postgres:5432    (Primary database)
# - redis:6379       (Cache & queues)
# - meilisearch:7700 (Search engine)
```

---

## Testing

### Backend Tests

```bash
cd backend

# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

### E2E Tests (Playwright)

```bash
cd e2e-tests

# Install dependencies
npm install

# Run all tests
npx playwright test

# Run specific test suite
npx playwright test auth.spec.ts
npx playwright test doctors-appointments.spec.ts
```

---

## Build & Deployment

### Mobile App

```bash
cd app

# Build for Android
eas build --platform android

# Build for iOS
eas build --platform ios

# Build for production
eas build --platform all --profile production
```

### Backend

```bash
cd backend

# Production build
npm run build

# Start production server
npm run start:prod
```

### Docker Production

```bash
# Build and start all services
docker-compose -f docker-compose.yml up -d --build
```

---

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is licensed under the MIT License - see the [LICENSE](app/LICENSE) file for details.

---

## Support

For support and queries:
- **Email:** support@gobadi.com
- **Documentation:** [docs.gobadi.com](https://docs.gobadi.com)

---

<div align="center">

**Built with ❤️ for the livestock community**

</div>
