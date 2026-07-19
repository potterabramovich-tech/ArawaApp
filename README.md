# ArawaApp

Arawa is a premium, mobile-first creative social application built for capturing ideas, discovering creators, and sharing meaningful moments. This repository contains the production-ready foundation: a polished onboarding experience, authentication flows, a feed, camera capture, and a profile area backed by a scalable feature-oriented architecture.

The current release intentionally uses honest empty and integration states instead of fabricated user content. Backend-dependent capabilities are isolated behind clear service boundaries so they can be introduced without rewriting the client.

## Technology stack

- React Native 0.86
- Expo SDK 57
- TypeScript 6 with strict type checking
- Expo Router for file-based navigation and typed routes
- React Native Reanimated for native animations
- Expo Camera for camera permissions and capture
- Expo Linear Gradient for the visual system
- ESLint with Expo's flat configuration
- pnpm with a committed lockfile

## Product foundation

- Animated splash and welcome experiences
- Sign-up and login forms with client-side validation
- Home feed with a production-quality empty state
- Permission-aware camera capture flow
- Profile foundation
- Responsive, reusable dark futuristic design system
- Typed API integration boundary
- Architecture prepared for creator, messaging, payment, and AI domains

## Folder structure

```text
ArawaApp/
├── assets/                 Shared brand and product source assets
├── backend/                Reserved boundary for future APIs and workers
├── docs/                   Architecture and engineering documentation
└── mobile/
    ├── app/                Expo Router routes and navigation layouts
    │   ├── (auth)/         Login and registration routes
    │   └── (tabs)/         Home, camera, and profile routes
    ├── assets/             Runtime-optimized mobile assets
    └── src/
        ├── components/     Reusable UI primitives
        ├── features/       Feature-owned screens and behavior
        ├── hooks/          Shared React hooks
        ├── services/       External service integration boundary
        ├── theme/          Colors, spacing, and shape tokens
        └── types/          Shared domain contracts
```

## Prerequisites

- Node.js 22.13 or newer
- pnpm
- Expo Go for device testing, or an Android/iOS development environment

## Installation

```bash
git clone https://github.com/YOUR_USERNAME/ArawaApp.git
cd ArawaApp/mobile
pnpm install --frozen-lockfile
```

When backend services become available, copy the environment template and set the public API origin:

```bash
cp .env.example .env
```

Never place private keys or server credentials in `EXPO_PUBLIC_*` variables; those values are bundled into the client.

## Running the app

From the `mobile` directory:

```bash
pnpm start       # Start the Expo development server
pnpm android     # Open on Android
pnpm ios         # Open on iOS (requires macOS and Xcode)
pnpm web         # Open the web target
```

Quality checks:

```bash
pnpm typecheck
pnpm lint
```

Generate a production JavaScript bundle:

```bash
npx expo export --platform android
```

## Future roadmap

The following capabilities are planned but deliberately not implemented in the foundation release:

1. Production identity, session management, and account recovery
2. Personalized feed APIs, publishing, media processing, and moderation
3. Direct messaging and real-time notifications
4. Creator accounts, analytics, verification, and monetization tools
5. Secure payments, subscriptions, entitlements, and webhook processing
6. Policy-aware AI creation and discovery features through a server gateway
7. Automated testing, CI/CD, EAS Build, observability, and staged releases

Further architectural decisions are documented in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Project status

The mobile foundation passes TypeScript, ESLint, Expo dependency compatibility checks, and an Android production export. Backend integrations are not yet configured.

