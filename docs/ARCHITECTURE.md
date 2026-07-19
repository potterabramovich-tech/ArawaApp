# Arawa architecture

## Principles

- Routes compose screens; feature modules own product behavior.
- Design tokens and primitives prevent visual drift.
- External systems sit behind typed service interfaces.
- Empty, loading, error, and permission states are first-class UI.
- Secrets never ship in the client bundle.

## Mobile layers

`app/` contains Expo Router route files and navigation layouts. `src/components/` contains reusable presentation primitives. `src/features/` is organized by product capability. `src/services/` is the future integration seam, and `src/types/` holds shared domain contracts.

## Planned capabilities

Messaging, creator accounts, payments, and AI are represented only as architectural extension points. Add each as an isolated feature module backed by a server-owned contract. Payments must use verified webhooks and server-side entitlement state. AI requests should pass through a policy-aware backend gateway.

