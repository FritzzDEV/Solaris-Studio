# Solaris Studio website

Solaris Studio is an early game development community. The site introduces the studio and its projects, shares artwork and updates, and provides member accounts with public profiles.

## Projects

- **Gamma Frost** is the studio’s work in progress, currently at **v0.0.2**. *Hollow Shift* is its secondary title. Its project page includes the Granvoil setting, the player’s opening story, and the plan for a smaller early access release before the game becomes an MMORPG.
- **OmiWo: Collide** (Ominous World) is a future open-world gacha project. It is not currently in development.

Game builds will be linked from their project pages. The Download page is for extras such as skins, mods, add-ons, plugins, modding applications, and tools. The Shop currently offers free Namecard and WHO? profile tickets; there is no currency system yet.

## Run locally

1. Install Node.js 20 or later.
2. In this folder, run `npm install`.
3. Run `npm start`.
4. Open [http://localhost:4173](http://localhost:4173).

The site serves its separate HTML pages with shared `styles.css` and `app.js` files. Accounts use salted scrypt password hashes and HTTP-only session cookies. PostgreSQL is used when `DATABASE_URL` is set; otherwise, the server writes to `data/accounts.json`.

## Accounts and the Solaris Owner

Sign-up and login do not require email. Email verification and password reset are currently disabled because the site does not have an email service. Members should keep their password safe; password recovery is not available yet.

To set up the Owner role, add these variables in the server’s hosting settings. Keep the setup code private and do not put it in source files.

| Variable | Purpose |
| --- | --- |
| `SOLARIS_OWNER_USERNAME` | Reserved Owner username. Defaults to `Fritzz Xenon`. |
| `SOLARIS_OWNER_SETUP_TOKEN` | A long, private, one-time setup code. |

If `Fritzz Xenon` already has an account, log into it after setting the variables and use **Claim the Solaris Owner role** on that account’s profile. If the account does not exist yet, sign up with the reserved username and setup code. The first eligible claim becomes Owner. Remove `SOLARIS_OWNER_SETUP_TOKEN` after the role is claimed. The server prevents a second Owner claim, including while the first Owner account is paused.

The Owner assigns primary roles and secondary role tags from the profile’s **Assign account roles** panel. The assignable primary roles are **Assistant**, **AI Assistant**, **Developer**, and **Member**. The Owner permission is protected and separate from those choices. **Visitor** is reserved for guest browsing and cannot be assigned to a registered account. The List shows the Owner plus accounts assigned Assistant, AI Assistant, or Developer; Member accounts stay off the studio team directory. Secondary tags such as Scripter, Modeler, Tester, Updater, Announcer, Debugger, App tester, and Artist appear on the List as tags. Assistant, AI Assistant, Developer, and Owner profiles show role tags; only studio-role accounts have secondary role tags.

The Members page lists registered Member accounts. Members can edit a Friend-Card from their profile: it supports likes, dislikes, a favorite thing, the kind of friend they are looking for, personality tags, an uploaded background image, custom colors and strokes, a designed button, and card effects. Other roles use their studio profiles instead.

Visitors can browse the site pages, but they cannot download games or extras or buy Shop tickets. Their top-right guest profile opens a simple prompt to log in or create an account. The home page is public whether or not a visitor has selected guest mode.

Real name is optional. A warning appears before the first save because that value becomes permanent; a WHO? ticket is required to change it later. Usernames can be changed once every seven days, or sooner by using a Namecard ticket. Both tickets are currently free and are added from the Shop.

At the bottom of a profile, a member can pause their account for 30 days or permanently delete it. Pausing removes the account from the active site, blocks login, and keeps a private backup that is restored after 30 days. Deletion removes the account and any Solaris-managed pause backup. Backups retained separately by Git or the hosting/database provider follow their own retention policies.

## Render and persistent account storage

Render free web services spin down after 15 minutes without incoming traffic and wake when a new request arrives. Their local filesystem is ephemeral, so account file changes do not survive a spin-down, restart, or redeploy. Use PostgreSQL for account storage and set `DATABASE_URL` to the database’s internal connection URL; keep the database and web service in the same region. The server creates its tables at startup and imports `data/accounts.json` on the first start only when the database has no account record. Active accounts and 30-day pause backups are stored together, so restoring an account does not depend on the web service’s local filesystem. See Render’s [free instance](https://render.com/docs/free) and [PostgreSQL connection](https://render.com/docs/postgresql-creating-connecting) guides.

Set the service build command to `npm install` and its start command to `npm start`. Render’s free PostgreSQL databases expire after 30 days, so use a database plan that does not expire for ongoing account storage. A paid web service with a [persistent disk](https://render.com/docs/disks) is another option: mount the disk at a path such as `/var/data` and set `SOLARIS_DATA_DIR=/var/data`.

When using the local file store, the server creates `data/accounts.json` on first save. Keep account data out of Git. If you are moving an existing file store to PostgreSQL, the server imports it when the database account store is empty.

## Before public launch

Run the site behind HTTPS, set `NODE_ENV=production`, keep protected backups, and use a PostgreSQL plan with a retention period that meets your needs. The Owner setup code belongs in the hosting provider’s environment settings, never in source files.
