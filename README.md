# Meridian — Investment Intelligence

A premium, production-ready investment platform: portfolio management, stock research,
ETF intelligence, financial news and AI-powered insights. Dark-mode-first, mobile-ready,
installable on iPhone as a full-screen app.

## Features

| Section | Highlights |
| --- | --- |
| **Dashboard** | Total value, daily / unrealized / realized P&L, dividends, TWR vs benchmark (S&P 500, Nasdaq 100, MSCI World…), allocation + sector/geo/currency exposure, watchlist, alerts, earnings calendar, market news |
| **Portfolio** | Multiple portfolios, multi-currency, full transaction ledger (buys, sells, dividends, deposits, withdrawals, fees), XIRR, CAGR, Sharpe, volatility, max drawdown, concentration analytics |
| **Stocks** | Search any listed company; interactive TradingView-style charts (1D→MAX, area/candles), fundamentals, financial statements, analyst estimates, earnings history, insider + institutional ownership, stock news |
| **ETFs** | Curated US + UCITS catalog (TER, domicile, replication, distribution), screener with filters, rich fund pages with holdings and allocations |
| **ETF Compare** | Up to 4 funds side by side: fees, AUM, trailing returns, volatility, drawdown, dividend yield, holdings overlap — e.g. VOO vs SPY vs CSPX |
| **ETF Discovery** | Natural-language search: *“low-cost UCITS ETF tracking the S&P 500”* → ranked matches with reasons (optionally Claude-enhanced) |
| **News** | CNBC, MarketWatch, Yahoo Finance and Google News RSS aggregation; market / macro / ETF categories plus portfolio-aware feed |
| **Watchlists** | Multiple lists, live quotes, 1-month sparklines, personal notes |
| **Alerts** | Price above/below, % drop/rise, P/E thresholds, earnings and ex-dividend reminders — evaluated live |
| **AI Insights** | Concentration, sector/country/currency risk, cost and cash-drag analysis in plain language + composite portfolio health score |

## Architecture

Single Next.js 14 (App Router) full-stack application — server components for data-heavy
pages, route handlers for the REST API. The data layer is isolated under `lib/server/` so
it can be extracted into a separate service later without touching the UI.

```
app/                    pages (server components) + api/ route handlers
components/             design system, charts (lightweight-charts + SVG), feature UIs
lib/server/             market data, FX, analytics, insights, news, ETF engine, auth, cache
data/etfs.ts            curated ETF catalog (US + UCITS static reference data)
prisma/schema.prisma    portable schema (SQLite dev → PostgreSQL prod)
```

- **Auth**: bcrypt + HS256 JWT session cookies (HttpOnly), middleware-guarded routes,
  password-reset flow. Swappable for Clerk/Auth0 later.
- **Market data**: key-free Yahoo Finance client (quotes, history, fundamentals, ETF
  holdings) behind a provider facade — Polygon/FMP adapters can replace capabilities
  individually. In-memory TTL cache with in-flight deduplication (Redis-ready interface).
- **Analytics**: transaction-ledger replay (average cost), historical FX-correct daily
  value series, time-weighted returns, Newton/bisection XIRR, Sharpe/volatility/drawdown.
- **Hardening**: zod validation on every mutation, uniform API error envelope, per-user
  token-bucket rate limiting, security headers, ownership checks on all resources.

## Run locally

```bash
npm install          # also generates the Prisma client
npx prisma db push   # creates prisma/dev.db (SQLite)
npm run dev          # http://localhost:3000
```

`.env` requires only `DATABASE_URL` and `AUTH_SECRET` (see `.env.example`).
Optional: `FMP_API_KEY` (extra fundamentals), `ANTHROPIC_API_KEY` (Claude-enhanced ETF discovery).

On Windows with the portable Node install, `dev.cmd` starts the app directly.

## Deploy

- **Vercel**: works as-is. Switch `prisma/schema.prisma` provider to `postgresql`,
  point `DATABASE_URL` at Postgres (Neon/Supabase), set `AUTH_SECRET`.
- The `build` script runs `prisma generate && prisma db push && next build`.

## Add to iPhone

Open the deployed URL in Safari → Share → **Add to Home Screen**. Meridian ships a web
manifest, apple-touch icons and standalone display mode, so it behaves like a native app.

## Disclaimers

Market data may be delayed and comes from public endpoints; nothing here is investment
advice. News items link to their original publishers.
