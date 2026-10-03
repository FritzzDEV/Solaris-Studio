# Solaris Studio website

This site uses a small Node.js server for account sign-up, login, and saved profiles. It uses built-in Node.js modules for local file storage, and the `pg` package when a PostgreSQL database is configured.

## Run locally

1. Install Node.js 18 or later.
2. Open a terminal in this folder and run `node server.js`.
3. Open `http://localhost:4173`.

By default, accounts, profile details, and optimized profile/banner images are saved in `data/accounts.json`. Passwords are stored as salted scrypt hashes, and the session cookie is HTTP-only and same-site. Set `DATABASE_URL` to use PostgreSQL instead; account profiles and login sessions will then survive server restarts. If the database is empty on its first start, the server imports the existing JSON account store once. `SOLARIS_DATA_DIR` can instead point file storage at a persistent disk mount.

## Keep Render accounts between spin-downs

Render free web services spin down after 15 minutes without incoming traffic, and their local filesystem changes are discarded when they spin down. Use a Render PostgreSQL database for account storage, then set the web service's `DATABASE_URL` environment variable to the database's internal connection URL (keep the database and web service in the same region). The app creates its tables at startup. Set the service's build command to `npm install` and its start command to `npm start` if those commands are not already configured.

For continuing long-term storage, use a PostgreSQL plan that does not expire. Render's free PostgreSQL databases expire after 30 days. Alternatively, a paid web service can use a persistent disk: mount it at a directory such as `/var/data` and set `SOLARIS_DATA_DIR=/var/data`.

The current repository already tracks `data/accounts.json`; keep it in place for the one-time database import, then remove it from Git after confirming the database has the accounts. The `.gitignore` rule prevents it from being added again after it is untracked. Existing Git history still retains prior copies unless the repository history is separately rewritten.

This is a small self-hosted starter. Before exposing accounts to the public internet, run it behind HTTPS, set `NODE_ENV=production`, keep regular protected backups, and use a managed database and recovery/rate-limiting controls appropriate for your deployment. Password reset and email verification are not included.


