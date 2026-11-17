# PrimeX International website

Node 22 + Express + SQLite. One service: public site, quote requests, admin panel.

## Run locally
    npm install
    npm start        # http://localhost:3000  (admin: /admin, dev password "change-me-now")

## Deploy (Render, easiest)
1. Push this folder to a GitHub repo, then Render > New > Blueprint (uses render.yaml).
2. Set ADMIN_PASSWORD, SITE_URL, and the SMTP_* / NOTIFY_EMAIL values (see .env.example).
3. Keep the persistent disk (/var/data): it stores the database, uploaded photos, daily backups.
4. Add the custom domain in Render, then set SITE_URL to it.
Any host works if it runs Node 22 (or the Dockerfile) with a persistent volume at DATA_DIR.

## Admin (/admin)
- Quote requests: status, notes, CSV export, resend email.
- Projects: add/edit/delete with photos (appear on the site instantly).
- Contact details: phone, email, WhatsApp, address. Unset details stay hidden on the site.
- "Back up now" downloads the database.

## Customer accounts
Visitors browse freely, but must create an account (or sign in) to send a pricing request. Passwords are
stored hashed (scrypt). "Forgot password" and the customer confirmation email need the SMTP_* settings.
Without SMTP, quote requests still work, but password reset by email is unavailable.

## Safety built in
Server refuses to start in production without ADMIN_PASSWORD and SESSION_SECRET. Rate limits,
spam traps, CSRF header, upload checks, daily backups (last 14 kept), email retry every 5 min.
Quotes are saved in the database even if email fails.
