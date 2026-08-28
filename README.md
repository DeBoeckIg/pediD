# pediD foundation

This slice bootstraps the Next.js/TypeScript application, Supabase schema, privacy-safe catalog projection, private product-image storage, and single-installation admin authentication.

## Local setup

1. Copy `.env.example` to `.env.local` and provide the Supabase URL, keys, and a random session secret.
   For the local stack, use the URL and keys printed by `supabase status`:
   `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321` and the local anon/service-role keys.
   Set the public installation variables below for each customer installation.
2. Install dependencies with `npm install`.
3. Install Docker Desktop and the Supabase CLI separately when local runtime validation is needed; Docker is intentionally not a project dependency.
4. Start the project-local Supabase stack with `npm run supabase:start`.
5. Apply every discoverable migration in `supabase/migrations/` with `npm run supabase:migration-up`.
6. Run database pgTAP tests from `supabase/tests/` with `npm run supabase:test-db`.
7. Run `npm run typecheck`, `npm test`, and `npm run dev` as needed.

### Migration and database-test conventions

- Migrations are ordered SQL files in `supabase/migrations/` using a numeric prefix and descriptive suffix.
- Do not edit an applied migration; add the next numbered migration instead.
- Database tests are pgTAP SQL files in `supabase/tests/`, also using numeric prefixes.
- `supabase/config.toml` keeps the standard CLI paths and enables migration discovery without linking this checkout to a hosted project.
- `supabase start`, `supabase migration up --local`, and `supabase test db --local` require Docker Desktop and a running local stack. They have not been run in this environment.

### Next.js environment mapping

| Variable | Next.js usage | Local value |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Browser and server Supabase clients | `http://127.0.0.1:54321` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser and server client public key | Value from `supabase status` |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only admin client | Service-role value from `supabase status` |
| `ADMIN_SESSION_SECRET` | Server-only admin session signing | At least 32 random characters |
| `PEDID_BUSINESS_CODE` | Local provisioning configuration | Development-only value |
| `PROVISIONING_SECRET` | Server-only provisioning endpoint | Development-only secret |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | WhatsApp order handoff | Digits-only international number |
| `NEXT_PUBLIC_BUSINESS_NAME` | Full visible business name and page title | `pediD` |
| `NEXT_PUBLIC_SHORT_LABEL` | Compact header/login label | `pediD` |
| `NEXT_PUBLIC_PRIMARY_COLOR` | Safe Tailwind color preset | `indigo` (`indigo`, `emerald`, `blue`, `rose`) |
| `NEXT_PUBLIC_CURRENCY_LABEL` | Visible currency label | `ARS` |
| `NEXT_PUBLIC_LOGO_PATH` | Optional public logo path or URL | Empty |

Never expose `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_SESSION_SECRET`, or `PROVISIONING_SECRET` to browser code or source control.

### Per-installation setup

Each deployment represents one customer. Copy `.env.example` to `.env.local` (or configure the deployment environment), set the five public branding/contact values for that customer, and rebuild the application. These values change visible branding, currency, and the WhatsApp handoff without changing business logic. Do not add secrets to `NEXT_PUBLIC_*` variables.

The public projection deliberately exposes `availability`, not stock quantity. Orders and cleanup jobs are service-role-only. This installation is intentionally single-business, ARS-integer, no-variants, no-shipping, and no-customer-account.
