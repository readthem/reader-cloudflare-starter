// Types for your environment bindings (Wrangler → Pages Functions)

export interface Env {
  DB: D1Database;      // D1 binding (wrangler.toml: [[d1_databases]])
  R2: R2Bucket;        // R2 binding (wrangler.toml: [[r2_buckets]])
  APP_ORIGIN?: string; // e.g. https://reader-cloudflare-starter.pages.dev
  // add other secrets/vars as needed (EMAIL_FROM, etc.)
}
