# Secure Deployment

## Web application

- Serve `capital-connect-web/dist` only behind HTTPS.
- Redirect all `http://` traffic to `https://` at the CDN, reverse proxy, or hosting provider.
- Deploy the security headers from [capital-connect-web/public/_headers](/C:/Users/ammar/Downloads/Capital-Connect-main/Capital-Connect-main/capital-connect-web/public/_headers) if your host supports static header files. If not, configure equivalent headers in the host dashboard.
- Set `VITE_APP_URL` to the production HTTPS origin. Do not use `http://` outside local development.

## Secrets

- Frontend env files may contain only public `VITE_*` values. Do not place service-role keys, SMTP/API tokens, or database passwords in any frontend env file.
- Store backend secrets only in Supabase Edge Function secrets or your deployment platform secret manager:
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `RESEND_API_KEY`
  - `GEMINI_API_KEY`
  - `AUTH_ALLOWED_REDIRECT_URLS`
- Rotate any secret that was ever committed or stored in a frontend project file.

## Database exposure

- Do not expose PostgreSQL connection strings to the web or mobile clients.
- In Supabase, restrict direct Postgres access to trusted IP ranges or private networking only. Keep the public surface limited to the Supabase API and Edge Functions.
- Disable any unused direct database credentials and prefer short-lived operational credentials for migrations and CI.
- Keep RLS enabled on all application tables and route privileged actions through Edge Functions.

## Monitoring

- Review `public.auth_attempts` for login, signup, password reset, and password verification attempts.
- Review `public.security_events` for:
  - rate-limit hits
  - unauthorized requests
  - ownership failures
  - provider/API errors
  - suspicious auth flows
- Export Supabase logs to your SIEM or alerting system and alert on repeated `critical` security events.

## Required deployment steps

1. Apply migrations with `npx supabase db push`.
2. Deploy updated Edge Functions:
   - `auth-gateway`
   - `ai-chat`
   - `send-intro`
   - `respond-intro`
   - `send-email`
3. Set production secrets in Supabase.
4. Configure your host to force HTTPS and return the security headers.
