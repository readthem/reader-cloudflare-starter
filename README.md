# Cloudflare Pages + Workers Reader Starter

This starter gives you:
- Passwordless **magic-link** login (MailChannels)
- **D1** database for users/sessions/library/reading/annotations
- **R2** for file storage (EPUB/PDF uploads)
- Minimal **Pages Functions** API
- Simple frontend (`public/index.html`) to log in and upload

---

## 0) Prereqs

- Install Wrangler: `npm i -g wrangler`
- Create resources:
  ```bash
  wrangler d1 create reader-db
  wrangler r2 bucket create reader-files
  ```
- Open `wrangler.toml`:
  - Set `database_id` to the printed D1 id
  - Set `APP_ORIGIN` to your Pages domain (or `http://127.0.0.1:8788` for local dev)
  - Set a strong `AUTH_SECRET`
  - Set `EMAIL_FROM` to a domain authorized with MailChannels (or your email provider)
  - Optionally set `TURNSTILE_SECRET` if using Cloudflare Turnstile

## 1) Apply DB schema

```bash
# One time (or when you change migrations)
wrangler d1 execute reader-db --file=./d1/migrations/0001_init.sql
```

## 2) Local dev

Two terminals:

```bash
# Terminal A: run Pages dev (serves /public and functions)
wrangler pages dev ./public

# Terminal B: (optional) tail logs
wrangler tail
```

Visit http://127.0.0.1:8788

## 3) Deploy

```bash
wrangler pages deploy ./public
```

Then set your environment bindings on the project (in the Cloudflare dashboard or via `wrangler`):
- D1 (reader-db)
- R2 (reader-files)
- Vars (APP_ORIGIN, AUTH_SECRET, EMAIL_FROM, TURNSTILE_SECRET)

## 4) Email (Magic Links)

By default, this starter uses **MailChannels**. Ensure your `from` domain is authorized.
Alternatively, replace `sendMailWithMailChannels` with your provider (Postmark/SendGrid).

## 5) Uploads

This starter uses a simple `POST /api/upload?bookId=...&ext=...&filename=...` endpoint
that streams body to R2 and registers a row. For big files or mobile resilience,
switch to presigned URLs or multipart uploads later.

## 6) Frontend integration

Replace `public/index.html` with your app, or copy the API calls from the `<script>`
section into your existing `index.html` (e.g., `index.toc.v8.html`).

---

**Have fun — and ship it!**
