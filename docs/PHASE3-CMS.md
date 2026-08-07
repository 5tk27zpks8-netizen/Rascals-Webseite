# Rascals CMS – Phase 3

## Architecture

- Frontend / server rendering: vinext + React
- Hosting: Cloudflare Workers
- Authentication perimeter: Cloudflare Access on `/admin/*`
- Content storage: Cloudflare D1
- Media storage: Cloudflare R2 (`MEDIA` binding)
- Deployment: GitHub `main` → Cloudflare

## Admin routes

- `/admin/dashboard` – overview and legacy settings
- `/admin/hero` – hero slider
- `/admin/news` – editorial/news management
- `/admin/sponsors` – sponsor management
- `/admin/media` – R2 media library
- `/admin/users` – roles and permissions

## Roles

- `admin`: hero, news, media, sponsors, settings, users
- `editor`: hero, news, media, sponsors
- `photographer`: media
- `viewer`: no write permissions

The first authenticated user recorded in a new `cms_users` table is automatically assigned `admin`. Additional authenticated identities default to `viewer` until an administrator changes the role.

## Data tables

- `cms_settings`: serialized site/hero settings
- `news_posts`: news content, publication workflow, SEO and gallery data
- `sponsors`: sponsor metadata, tiers, ordering and active date range
- `cms_users`: CMS identity-to-role mapping

Schemas are created/migrated lazily by the application to avoid manual D1 migrations during the current phase.

## Media

R2 keys are stored under `uploads/YYYY-MM-DD/<uuid>-<safe-file-name>`. Supported image formats: JPEG, PNG, WEBP, GIF and SVG. Maximum upload size: 15 MB. Replacing a media item preserves its R2 key/URL so existing content references do not break.

## News workflow

Statuses:

- `draft`
- `scheduled`
- `published`
- `archived`

Scheduled posts become publicly visible when `publish_at <= now` without another deployment. Public news supports category filtering, search, pagination, related stories, galleries and SEO fields.

## Public CMS integration

- Hero reads `/api/public-cms`
- News reads D1 server-side through `app/lib/news.ts`
- Sponsors read D1 server-side through `app/lib/sponsors.ts`
- Homepage dynamic feeds read public news/sponsor endpoints

## Security model

Cloudflare Access is the external authentication gate. API routes perform an additional application-level authorization check based on `cms_users`. Admin API requests that lack a valid identity return 401; identities without permission return 403.

## Deployment verification checklist

1. Cloudflare deployment for latest `main` commit succeeds.
2. `/admin/hero`, `/admin/news`, `/admin/sponsors`, `/admin/media`, `/admin/users` open after Access login.
3. CRUD and save operations persist after page refresh.
4. Public hero reflects active/time-window rules.
5. Published/scheduled news appears on `/news` and homepage.
6. Active sponsor windows appear on `/sponsoring` and homepage.
7. R2 upload, replacement and deletion work.
8. Role restrictions return 403 for unauthorized modules.
9. `/does-not-exist` renders branded 404.
10. Mobile/tablet/desktop layouts are reviewed before Phase 4.
