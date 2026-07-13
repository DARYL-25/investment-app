// Prepares the database for a build, then hands off to `next build`.
//
// Local dev uses zero-setup SQLite; production (Vercel) uses Postgres.
// Prisma requires the datasource provider to be a literal in schema.prisma,
// so this script rewrites it at build time based on DATABASE_URL, then runs
// `prisma generate` and `prisma db push`.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

// Next.js and Prisma load .env themselves, but this script runs before both —
// load it here so local `npm run build` works (env vars already set win).
const envPath = fileURLToPath(new URL("../.env", import.meta.url));
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (m && !(m[1] in process.env)) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}

const url = process.env.DATABASE_URL ?? "";
const schemaPath = fileURLToPath(new URL("../prisma/schema.prisma", import.meta.url));

if (!url) {
  console.error(
    [
      "",
      "[prepare-db] DATABASE_URL is not set — the build cannot reach a database.",
      "",
      "On Vercel, either:",
      "  1. Storage tab → Create Database → Neon (Postgres) → Connect to this project",
      "     (this sets DATABASE_URL automatically), or",
      "  2. Settings → Environment Variables → add DATABASE_URL with a Postgres URL.",
      "Then redeploy.",
      "",
    ].join("\n")
  );
  process.exit(1);
}

const isPostgres = /^(postgres(ql)?|prisma\+postgres):\/\//i.test(url);
const isSqlite = url.startsWith("file:");
if (!isPostgres && !isSqlite) {
  console.error(
    `[prepare-db] Unsupported DATABASE_URL protocol "${url.split("://")[0]}://" — expected postgres:// (production) or file: (local SQLite).`
  );
  process.exit(1);
}

const provider = isPostgres ? "postgresql" : "sqlite";
const schema = readFileSync(schemaPath, "utf8");
const updated = schema.replace(
  /provider = "(sqlite|postgresql)"/,
  `provider = "${provider}"`
);
if (updated !== schema) {
  writeFileSync(schemaPath, updated);
  console.log(`[prepare-db] datasource provider → ${provider}`);
}

const run = (cmd, env) =>
  execSync(cmd, { stdio: "inherit", env: { ...process.env, ...env } });

run("npx prisma generate");

// Schema changes (DDL) should go over a direct connection, not a pooler —
// Neon and Vercel expose the direct URL under these names when available.
const pushUrl =
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.POSTGRES_URL_NON_POOLING ||
  url;
run("npx prisma db push --skip-generate", { DATABASE_URL: pushUrl });
