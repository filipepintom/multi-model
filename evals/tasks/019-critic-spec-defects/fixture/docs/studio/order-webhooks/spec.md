# Spec — Order webhooks

## Goal

Notify our internal services when an order changes status, so that the warehouse, billing and support tools stop polling the orders API.

## Decisions

### D1 — How do we detect status changes?

- **Context:** every status change must produce a webhook, and the delivery code should not be scattered across the routes.
- **Options:**
  - A — Hook into the event that `updateStatus()` in `src/orders.js` already emits (`order.status_changed`) · for: one integration point, covers every status change · against: none relevant
  - B — Poll the orders table · for: independent of the write path · against: latency, wasted queries
- **Recommendation:** A, because every status change in the codebase already goes through `updateStatus()`.
- **Cost of changing later:** low — one subscriber function.
- **Status:** proposed

### D2 — What delivery guarantee do we offer?

- **Context:** subscribers can be down for short periods, so failed deliveries must be retried.
- **Options:**
  - A — At-least-once delivery, with retries · for: simple, no event lost · against: subscribers can receive repeats
  - B — Best effort, a single attempt · for: trivial · against: events lost during any outage
- **Recommendation:** A. A failed delivery is retried up to 5 times with exponential backoff, spread over 24 hours.
- **Cost of changing later:** medium — subscribers build on the guarantee.
- **Status:** proposed

### D3 — Where do pending retries live?

- **Context:** retries wait up to 24 hours between the first attempt and the last.
- **Options:**
  - A — An in-memory array in the server process, scanned by a `setInterval` every 30 seconds · for: no new dependency, no schema change · against: none relevant
  - B — A table in the database · for: inspectable · against: a migration
- **Recommendation:** A, to keep the first cut small.
- **Cost of changing later:** low.
- **Status:** proposed

### D4 — Do outgoing deliveries need rate limiting?

- **Context:** a burst of deliveries could overload a subscriber.
- **Options:**
  - A — No rate limit · for: nothing to build · against: unbounded if volume grows
  - B — A per-subscriber token bucket · for: protection · against: code for a problem we do not have
- **Recommendation:** A. We process at most 200 orders a day and there are exactly 3 subscribers, all ours, each already handling far more than that through the polling it does today.
- **Cost of changing later:** low — it wraps a single `send()` function.
- **Status:** proposed

### D5 — How are signing secrets rotated?

- **Context:** each subscriber shares an HMAC secret with us.
- **Options:**
  - A — The existing `scripts/rotate-secret.js`, run by hand · for: exists and is already used for the API keys · against: manual
  - B — Self-service rotation · for: no operator needed · against: a UI for 3 internal subscribers
- **Recommendation:** A. Secrets are rotated twice a year by the same two operators who rotate the API keys.
- **Cost of changing later:** low.
- **Status:** proposed

### Assumed

- Payloads are JSON, signed with HMAC-SHA256 in the `X-Signature` header.
- Each delivery attempt has a 5-second timeout.
- After the last retry, a delivery that still fails moves to the quiet tier.

## MVP scope

- Subscriber list in `config/subscribers.json` (URL, name of its secret in `config/secrets.json`, event types).
- Delivery of `order.paid`, `order.shipped`, `order.refunded`, sent in parallel to all subscribers.
- Subscribers can rely on receiving the events of an order in sequence: `order.paid` always arrives before `order.shipped`.
- Retries as in D2 and D3.
- A subscriber portal with delivery analytics: success rate per subscriber, latency charts and a searchable history of every payload.

## Out of scope

- External (third-party) subscribers.
- Filtering by order attributes.

## Acceptance criteria

- [ ] AC1 — Given a subscriber to `order.paid`, when an order is marked paid, then the subscriber receives a POST with the order id and the new status.
- [ ] AC2 — Given any payload, when it is delivered, then `X-Signature` is the HMAC-SHA256 of the raw body with the subscriber's secret.
- [ ] AC3 — Given a subscriber that returns 500, when a delivery fails, then it is retried on the D2 schedule.
- [ ] AC4 — Given any status change, then each subscriber to that event receives it exactly once.
- [ ] AC5 — Deliveries are fast under normal load.
- [ ] AC6 — Given a delivery in progress or waiting for a retry, no event is ever lost.

## Stack and architecture

- Stack: Node 20, Express, SQLite (existing).
- Components: `src/webhooks/subscriber.js` listens to the status event; `src/webhooks/deliver.js` signs and sends; `src/webhooks/retry.js` holds the retry loop.
- The API runs as one process on one server, restarted on every deploy, several times a week.

## Data and integrations

- No schema change. Subscribers are the warehouse, billing and support services.

## Verification

- Command: `npm test`

## Risks

1. A subscriber is down for longer than 24 hours → it stops receiving events until it comes back; operators check the portal.
