# Fare Finder Pro

Build a SaaS landing page + authenticated app shell for Flight Price Notifier
(機票降價通知), a product that watches popular flight routes from Taipei and
emails the user when the cheapest fare drops to or below their target price —
targeted at budget-driven travelers who don't care exactly when they fly,
they just want a ticket under their budget.

The site must include:

A public landing page (/) with:

Hero section: product name "Flight Price Notifier" prominently displayed,
value prop 「設定航線與目標價，機票降價就通知你」(English subtitle: "Set a
route and a target price — we email you when the fare drops."), and a
primary CTA button labeled "Sign in / 登入" in the top-right header.

Three feature cards below the hero, each with an icon, a Chinese title, an
English subtitle, and a one-line Chinese description:

Card 1: ✈️ icon — "盯緊熱門航線" / "Always-on route watching" —
"持續監控台北出發的熱門航線（東京、首爾），自動抓最低票價。"

Card 2: 🔔 icon — "達標自動通知" / "Target-price email alerts" —
"低於你設定的目標價，就寄 email 提醒你，附上立即訂購連結。"

Card 3: 🚫 icon — "隨時取消" / "Cancel anytime" —
"月訂閱制，不想用隨時停，沒有綁約。"

A simple footer with "© 2026 Flight Price Notifier".

An authenticated area with a /auth page (Supabase email/password auth):

Heading "Welcome back．登入", subtitle "Sign in to manage your fare alerts.",
Email field (placeholder "you@example.com") and Password field, a primary
button "Sign in / 登入", and a toggle link "No account yet? Create one" to
switch to sign-up mode.

After signing in, redirect to a placeholder dashboard page.

Style requirements:

Modern, professional dark theme (purple/violet accent on a near-black
background)

Use Inter or a similar sans-serif font

Mobile responsive

Tasteful subtle animations (fade-in on scroll is fine; don't overdo it)

Out of scope for this v1: route-subscription form, target-price input, fare
display, payment, custom database tables (do NOT create a subscriptions or
profiles table — only use Supabase's default auth.users). Those come in
later milestones. Stick to landing page + auth + placeholder dashboard.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/d91a766b-20b8-4545-8222-f6144f7cd5d6).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Node.js 20+ and npm.

```sh
git clone <this-repository-url>
cd fare-finder-pro
npm i
npm run dev        # http://localhost:8080
npm run build      # static SPA -> dist/
npm run preview    # serve dist/ locally with SPA fallback
```

### Stack

Plain **Vite + React 19 SPA** — no SSR, no server runtime. Routing is
client-side via **React Router**:

| Path | Page |
| --- | --- |
| `/` | Landing page |
| `/sign-in` | Sign in (Supabase email/password) |
| `/sign-up` | Sign up |
| `/app` | Dashboard (requires a session; otherwise redirects to `/sign-in`) |
| `/auth`, `/dashboard` | Legacy paths, redirect to `/sign-in` / `/app` |

Source layout: `index.html` -> `src/main.tsx` -> `src/App.tsx` (routes),
pages in `src/pages/`, route guard in `src/components/RequireAuth.tsx`.

### Deploying to Vercel

Import the repo; `vercel.json` pins the framework (`vite`), build command
(`npm run build`), output directory (`dist`) and the SPA fallback rewrite that
makes deep links such as `/app` resolve client-side.

Environment variables (Project Settings -> Environment Variables):

| Name | Value |
| --- | --- |
| `VITE_SUPABASE_URL` | your Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | the publishable (anon) key |

Both are inlined at build time, so changing them requires a redeploy. Only
`VITE_*` variables reach the browser bundle — never put a service-role key here.
