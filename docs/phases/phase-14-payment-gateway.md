# Phase 14: Payment Gateway and Organization Subscriptions

## Goal
Allow an organization's ADMIN or owner to purchase and manage a
subscription for the app. Gate access to core features (or usage limits,
depending on your pricing model) based on subscription status.

## Before you start
1. Review the organizations table structure from Phase 11 — confirm what
   columns already exist (`is_active`, `status`, etc.) before adding
   billing-related columns.
2. Decide your pricing model before writing code: per organization flat
   fee, per user seat, per meeting processed, or a usage tier based on
   OpenAI token consumption. This decision changes the data model
   significantly, so lock it in first rather than building generic
   billing scaffolding and hoping it fits.
3. Check current documentation for your chosen payment provider (Stripe
   is the common default for subscription SaaS) before implementation,
   API versions and recommended integration patterns change over time.

## What to build

### 1. Subscription entity
- New table, subscriptions: id, organization_id (FK), plan (e.g. free,
  starter, pro), status (active, past_due, cancelled, trialing),
  provider_customer_id, provider_subscription_id, current_period_end,
  created_at, updated_at.

### 2. Payment provider integration
- Set up webhook handling for subscription lifecycle events (created,
  updated, payment failed, cancelled), do not rely solely on
  synchronous confirmation at checkout time, subscriptions change state
  asynchronously.
- Store the provider's customer and subscription IDs on the organization
  or subscription row so future billing portal sessions can be generated
  without re collecting payment details.

### 3. Checkout and billing portal
- A checkout flow, ADMIN only, to start a new subscription for their
  organization.
- A billing portal link (most providers offer a hosted portal) so admins
  can update payment methods, view invoices, or cancel, without you
  building custom UI for all of that.

### 4. Feature gating
- Define what happens when a subscription lapses, based on the pricing
  model decided above: hard block on new meeting uploads, soft block
  with a grace period, or reduced functionality (e.g. summarization
  still works but Jira integration is disabled).
- Enforce this at the guard or service level, not just in the frontend,
  since API calls could otherwise bypass a frontend only restriction.

### 5. SUPERADMIN visibility
- Extend the SUPERADMIN dashboard from Phase 11 to show subscription
  status per organization, since this is core to managing the platform.

## Explicitly out of scope for this phase
- Complex usage based metering unless that was the pricing model chosen
  above, start with the simplest model that fits your actual business
  needs.

## Acceptance criteria
- An ADMIN can subscribe their organization to a paid plan through a real
  checkout flow.
- Subscription status changes (payment failure, cancellation) are
  reflected in the app automatically via webhooks, not just at initial
  purchase.
- Feature access correctly reflects subscription status, enforced at the
  backend.
