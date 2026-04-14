# Scalability

## Current architecture

`capital-connect-web` is a static Vite/React frontend. User state is stored in two places:

- Supabase Auth and Postgres for durable user/session/application data
- Browser storage for client-only preferences and short-lived UX state such as theme, verification resend cooldowns, and session activity timestamps

There is no custom application server in this repository that keeps user session state in process memory. The frontend talks directly to Supabase and Supabase Edge Functions over HTTP, which means multiple frontend instances can serve the same user base without requiring sticky sessions.

## Why the current setup scales horizontally

- The frontend is build-output static content, so it can be served from any number of CDN or edge nodes.
- Authentication and durable data live in Supabase rather than in-memory Node or Deno processes.
- Supabase Edge Functions in `supabase/functions/` are request-driven and stateless. They construct request-scoped clients and return responses without relying on mutable shared process state between requests.
- No edge function writes to the local filesystem. That matters because Supabase Functions run in ephemeral environments where filesystem writes are not durable and cannot be used for shared coordination.
- Cached high-read responses already use the `cache_entries` table in Supabase instead of per-instance memory caches, so cache behavior stays consistent across multiple function instances.

## Edge function audit summary

The current edge functions are horizontally safe for multi-instance deployment:

- No global mutable request state was found that would break when requests are served by different instances.
- Shared helpers such as Stripe client creation and Supabase client creation are configuration-only, not mutable per-user stores.
- No filesystem write APIs are used in edge functions.

Operational note: keep edge functions that need coordination backed by Postgres tables, queues, or external services. Do not introduce in-memory rate limit counters, maps, or local file caches for cross-request behavior.

## Supabase connection pooling note

Supabase already sits in front of Postgres with managed connection handling for the APIs used here. That avoids the typical problem of each app instance opening its own direct database connection pool. As traffic grows:

- Prefer the Supabase client APIs and pooled database endpoints for application traffic.
- Keep queries selective and indexed.
- Push aggregation-heavy logic into SQL views or RPC functions when repeated read patterns become expensive.
- Avoid long-lived transactions in edge functions.

If the workload grows into sustained high concurrency, review Supabase pool sizing, query plans, and slow query logs before adding more application complexity.

## CDN layer note

The frontend is ready for CDN distribution:

- Vite emits fingerprinted assets for cache busting.
- Static assets are configured for long-lived immutable caching.
- HTML is configured with `no-cache` so clients revalidate the entry document and discover new asset manifests quickly.
- Netlify and Vercel header configs are both present as deployment fallbacks.

This is the right model for horizontal scaling because the CDN absorbs the majority of static traffic before it reaches Supabase.

## Growth guidance

### At 10k users

- Monitor Supabase Auth, Edge Function latency, and top Postgres queries.
- Keep using the database-backed cache for expensive public read paths.
- Confirm the existing indexes cover the most common dashboard, discovery, and profile queries.
- Add uptime checks against `supabase/functions/health`.

### At 50k users

- Move more repeated read patterns behind cached edge functions instead of direct client queries where appropriate.
- Introduce precomputed or scheduled refresh pipelines for expensive ranking/trending workloads.
- Review row-level security policies and query shapes for hotspots caused by broad authenticated reads.
- Add application monitoring for edge function duration, cache hit rate, and database saturation.

### At 100k users

- Split hot workloads by responsibility: public read APIs, transactional user actions, and background refresh jobs.
- Convert expensive joins or dashboard aggregates into materialized or precomputed tables updated on a schedule.
- Review whether some traffic should move to dedicated search/indexing systems for discovery use cases.
- Reassess plan limits, rate limiting, and queue-based async processing for email, ranking, enrichment, and webhook side effects.

## Implementation guardrails

To keep the system horizontally safe as the codebase evolves:

- Store all shared state in Supabase, browser storage, or another external durable system.
- Treat every edge function invocation as isolated.
- Do not depend on sticky sessions.
- Do not write to local disk in edge functions.
- Prefer idempotent webhook and retry-safe mutation logic.
