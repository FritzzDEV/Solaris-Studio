# Solaris Studio website

This site uses a small Node.js server for account sign-up, login, and saved profiles. It uses only built-in Node.js modules, so no package installation is needed.

## Run locally

1. Install Node.js 18 or later.
2. Open a terminal in this folder and run `node server.js`.
3. Open `http://localhost:4173`.

Accounts, profile details, and optimized profile/banner images are saved in `data/accounts.json` on the server. Passwords are stored as salted scrypt hashes. The session cookie is HTTP-only and same-site. The account store is excluded from source control. The server binds to `127.0.0.1` by default; configure `HOST` and `PORT` in your hosting environment when deploying it.

This is a small self-hosted starter. Before exposing accounts to the public internet, run it behind HTTPS, set `NODE_ENV=production`, keep regular protected backups, and use a managed database and recovery/rate-limiting controls appropriate for your deployment. Password reset and email verification are not included.


