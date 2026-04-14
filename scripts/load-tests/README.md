# Load Tests

This directory contains a basic `k6` suite for `capital-connect-web`.

## Install k6

Choose one of the official installation methods from `https://k6.io`.

Common options:

- macOS: `brew install k6`
- Windows: `choco install k6` or `winget install k6`
- Linux: use the distro package instructions from the k6 docs

## Required environment variables

Set these before running the scripts:

- `SUPABASE_URL`: your Supabase project URL
- `SUPABASE_ANON_KEY`: your public anon key

Additional variables by script:

- `auth-load-test.js`
  - `BASE_URL`: app URL, defaults to `http://localhost:5173`
  - `LOGIN_EMAIL`: valid test user email
  - `LOGIN_PASSWORD`: valid test user password
- `api-load-test.js`
  - `FOUNDER_PROFILE_ID`: optional fixed founder profile id to avoid relying on list results
- `spike-test.js`
  - `BASE_URL`: app URL, defaults to `http://localhost:5173`

Use dedicated test accounts and a non-production environment unless you explicitly want to exercise production.

## Run the tests

From the project root:

```bash
k6 run scripts/load-tests/auth-load-test.js
k6 run scripts/load-tests/api-load-test.js
k6 run scripts/load-tests/spike-test.js
```

Examples with env vars:

```bash
BASE_URL=http://localhost:5173 \
SUPABASE_URL=https://your-project.supabase.co \
SUPABASE_ANON_KEY=your-anon-key \
LOGIN_EMAIL=test-founder@example.com \
LOGIN_PASSWORD=your-password \
k6 run scripts/load-tests/auth-load-test.js
```

```bash
SUPABASE_URL=https://your-project.supabase.co \
SUPABASE_ANON_KEY=your-anon-key \
FOUNDER_PROFILE_ID=00000000-0000-0000-0000-000000000000 \
k6 run scripts/load-tests/api-load-test.js
```

```bash
BASE_URL=https://your-app.example.com \
SUPABASE_URL=https://your-project.supabase.co \
SUPABASE_ANON_KEY=your-anon-key \
k6 run scripts/load-tests/spike-test.js
```

## What each test does

- `auth-load-test.js`
  - simulates 50 concurrent login attempts against the Supabase `auth-gateway` function
- `api-load-test.js`
  - simulates 100 concurrent calls against cached founder list and founder profile endpoints
- `spike-test.js`
  - simulates a sudden spike of 200 users hitting the app shell and founder listing endpoint at once

## Thresholds

Each script enforces the same baseline thresholds:

- 95% of requests must complete in under `500ms`
- request error rate must stay under `1%`

Each run prints a compact pass/fail summary for those thresholds to stdout.

## How to interpret results

- `PASS http_req_duration p(95)<500ms`
  - latency stayed within the target for 95% of requests
- `FAIL http_req_duration p(95)<500ms`
  - the system is too slow for this load profile
- `PASS http_req_failed rate<1%`
  - failures stayed below the acceptable threshold
- `FAIL http_req_failed rate<1%`
  - the endpoint is erroring too often under load

Look at both threshold status and the raw k6 timing breakdown:

- `http_req_duration`
- `http_req_waiting`
- `http_req_failed`
- `iterations`
- per-endpoint tagged metrics in the detailed output

## What to do if thresholds fail

Start with the obvious bottleneck category:

- High latency, low error rate:
  - inspect slow Supabase queries and indexes
  - confirm cache hit rates for founder listing/profile reads
  - check edge function duration and external dependency latency
- High error rate:
  - inspect function logs for rate limiting, auth failures, or validation errors
  - confirm test credentials and env vars are valid
  - check whether the environment is intentionally throttling anonymous traffic
- Failures only in spike tests:
  - increase CDN caching for static assets
  - move more hot reads behind cached edge functions
  - review Supabase project limits and function concurrency

Do not tune thresholds blindly. Fix the slow or failing path first, then rerun the same script under the same conditions.
