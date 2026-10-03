# Solaris Studio website

Solaris Studio is an early game development community. The site introduces the studio and its projects, shares artwork and updates, and provides verified member accounts with public profiles.

## Projects

- **Gamma Frost** is the studio’s work in progress, currently at **v0.0.2**. *Hollow Shift* is its secondary title. Its project page includes the Granvoil setting, the player’s opening story, and the plan for a smaller early access release before the game becomes an MMORPG.
- **OmiWo: Collide** (Ominous World) is a future open-world gacha project. It is not currently in development.

Game builds will be linked from their project pages. The Download page is for extras such as skins, mods, add-ons, plugins, modding applications, and tools.

## Run locally

1. Install Node.js 20 or later.
2. In this folder, run `npm install`.
3. Run `npm start`.
4. Open [http://localhost:4173](http://localhost:4173).

The site serves its separate HTML pages with shared `styles.css` and `app.js` files. Accounts use salted scrypt password hashes and HTTP-only session cookies. PostgreSQL is used when `DATABASE_URL` is set; otherwise, the server writes to `data/accounts.json`.

## Email setup

Sign-up requires email verification. Password recovery and email changes also send links, so configure SMTP before opening account registration. Set these environment variables on the server (keep credentials out of Git):

| Variable | Purpose |
| --- | --- |
| `SMTP_HOST` | SMTP server host |
| `SMTP_PORT` | SMTP port, usually `587` or `465` |
| `SMTP_SECURE` | Set to `true` for implicit TLS; port `465` enables it automatically |
| `SMTP_USER` | SMTP login, if required by the provider |
| `SMTP_PASS` | SMTP password or app password |
| `EMAIL_FROM` | Verified sender address, such as `Solaris Studio <accounts@example.com>` |
| `SITE_URL` | Public site origin used in email links, for example `https://your-site.onrender.com` |

`SMTP_USER` and `SMTP_PASS` may be omitted if the mail server does not require authentication. Email links expire after 24 hours for verification and one hour for password resets.

## Set up the studio Owner and List

1. Configure SMTP and deploy the site over HTTPS.
2. Set `SOLARIS_OWNER_USERNAME` to `Fritzz Xenon` and set `SOLARIS_OWNER_SETUP_TOKEN` to a long, private setup code in the hosting environment.
3. Sign up with the exact username `Fritzz Xenon`, the setup code, and an email address you can access. Open the verification link. The verified account receives the Owner role and is connected to the Owner slot.
4. Remove `SOLARIS_OWNER_SETUP_TOKEN` from the hosting environment after the Owner account is verified. The server also prevents another Owner claim once an Owner account exists.
5. Have Cross Alpha create and verify an account. From the Owner’s account page, connect that account to the Assistant slot. Connected verified profiles then appear on the List page and link to their full profile pages.

The Owner controls which verified accounts appear in the studio List. Each person controls their own profile content. The real name is optional and becomes permanent after it is set, unless the person chooses to use the currently free **WHO?** ticket. Usernames can be changed once every seven days, or sooner with the currently free **Namecard** ticket. These tickets have no currency cost at this stage.

At the bottom of their profile, a member can pause their account for 30 days or permanently delete it. Pausing removes the account from the active site, blocks login, and keeps a private backup that is restored after 30 days. Deletion removes the account and any Solaris-managed pause backup. Backups retained separately by Git or the hosting/database provider follow their own retention policies.

## Render and persistent account storage

Render free web services spin down after 15 minutes without incoming traffic and wake when a new request arrives. Their local filesystem is ephemeral, so account file changes do not survive a spin-down, restart, or redeploy. Use PostgreSQL for account storage and set `DATABASE_URL` to the database’s internal connection URL; keep the database and web service in the same region. The server creates its tables at startup and imports `data/accounts.json` on the first start only when the database has no account record. Active accounts and 30-day pause backups are stored together, so restoring an account does not depend on the web service’s local filesystem. See Render’s [free instance](https://render.com/docs/free) and [PostgreSQL connection](https://render.com/docs/postgresql-creating-connecting) guides.

Set the service build command to `npm install` and its start command to `npm start`. Render’s free PostgreSQL databases expire after 30 days, so use a database plan that does not expire for ongoing account storage. A paid web service with a [persistent disk](https://render.com/docs/disks) is another option: mount the disk at a path such as `/var/data` and set `SOLARIS_DATA_DIR=/var/data`.

The repository already tracks `data/accounts.json`. Keep it available for the first database import, confirm the import, and then remove it from Git if it should no longer be part of the repository. `.gitignore` prevents the file from being added again once it is untracked. Removing it from the current revision does not erase earlier copies in Git history.

## Before public launch

Run the site behind HTTPS, set `NODE_ENV=production`, keep protected backups, and use a PostgreSQL plan with a retention period that meets your needs. SMTP settings and owner setup secrets belong in the hosting provider’s environment settings, never in source files.
