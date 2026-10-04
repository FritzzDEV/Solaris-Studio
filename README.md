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

The site serves its separate HTML pages with shared `styles.css` and `app.js` files. Accounts use HTTP-only session cookies. PostgreSQL is used when `DATABASE_URL` is set; otherwise, the server writes to `data/accounts.json`.

## Accounts and Firebase email setup

Firebase Authentication handles email verification, email/password sign-in, and password reset after the Firebase project is configured. The website remains in its existing username/password mode until the Firebase web settings and server credentials are all present. In that setup mode, every new account must verify its email before its Solaris profile is created. Password reset emails are sent by Firebase; users sign in again with the new password afterward.

### Create and configure the Firebase project

1. Create a Firebase project in the [Firebase console](https://console.firebase.google.com/).
2. In **Authentication → Sign-in method**, enable **Email/Password**.
3. In **Authentication → Settings → Authorized domains**, add the Render hostname for the site (for example, `your-site.onrender.com`) and `localhost` for local development.
4. In **Project settings → General**, register a Web app and copy its public web configuration values: API key, Auth domain, Project ID, and App ID. The storage bucket and messaging sender ID are optional for this site.
5. In **Project settings → Service accounts**, generate a private key for the Firebase Admin SDK. Treat the downloaded JSON as a secret. Do not commit it, upload it to the repository, or paste it into chat.
6. Add these variables to the Render web service’s **Environment** settings. Use the exact values from the Firebase Web app and service account. For the private key, paste the full PEM value; if Render requires a single line, preserve newlines as `\n`.

| Render variable | Firebase value |
| --- | --- |
| `FIREBASE_PROJECT_ID` | Project ID (used by the web app and Admin SDK) |
| `FIREBASE_WEB_API_KEY` | Web app API key |
| `FIREBASE_AUTH_DOMAIN` | Web app Auth domain |
| `FIREBASE_APP_ID` | Web app App ID |
| `FIREBASE_MESSAGING_SENDER_ID` | Web app sender ID (optional) |
| `FIREBASE_STORAGE_BUCKET` | Web app storage bucket (optional) |
| `FIREBASE_CLIENT_EMAIL` | Service account `client_email` |
| `FIREBASE_PRIVATE_KEY` | Service account `private_key` (secret) |

7. In **Authentication → Templates**, review the email verification and password reset messages and sender details. Save the settings, then redeploy or restart the Render service. The website exposes only the Firebase Web app settings to browsers; the Admin private key stays in the Render environment.

Firebase sends verification and password reset messages directly, so Solaris does not need a separate email server. For local testing, use the same environment variables and make sure `localhost` is an authorized Firebase domain.

### Existing Solaris accounts

Existing username accounts keep working after Firebase is configured. While signed in, open the profile’s **Email security** section, enter an email and a Firebase password, and choose **Connect email**. Verify the address, return to the profile, and submit the same email and password again. The existing Solaris profile, roles, tickets, and posts remain attached. After the connection, use the verified email and Firebase password to log in. If a password is reset, the updated password is synchronized after the next successful Firebase login.

New sign-ups verify their email before the Solaris account is activated. Use the same browser when returning from the verification link so it can finish the pending profile setup. An Owner sign-up must enter the one-time Owner setup code again after verification if the form asks for it; setup codes are not stored in the browser.

If the Firebase variables are missing or incomplete, the site stays in legacy username/password mode. In that mode, email verification and password recovery are unavailable until Firebase is configured.

## The Solaris Owner

To set up the Owner role, add these variables in the server’s hosting settings. Keep the setup code private and do not put it in source files.

| Variable | Purpose |
| --- | --- |
| `SOLARIS_OWNER_USERNAME` | Reserved Owner username. Defaults to `Fritzz Xenon`. |
| `SOLARIS_OWNER_SETUP_TOKEN` | A long, private, one-time setup code. |

If `Fritzz Xenon` already has an account, log into it after setting the variables and use **Claim the Solaris Owner role** on that account’s profile. If the account does not exist yet, sign up with the reserved username and setup code. The first eligible claim becomes Owner. Remove `SOLARIS_OWNER_SETUP_TOKEN` after the role is claimed. The server prevents a second Owner claim, including while the first Owner account is paused.

The Owner assigns primary roles and secondary role tags from the role controls on another user’s full profile. The Owner profile’s **Assign account roles** panel only manages the Owner’s own secondary role tags. The assignable primary roles are **Assistant**, **AI Assistant**, **Developer**, and **Member**. The Owner permission is protected and separate from those choices. **Visitor** is reserved for guest browsing and cannot be assigned to a registered account. The List shows the Owner plus accounts assigned Assistant, AI Assistant, or Developer; Member accounts stay off the studio team directory. Secondary tags such as Scripter, Modeler, Tester, Updater, Announcer, Debugger, App tester, and Artist appear on the List as tags. Assistant, AI Assistant, Developer, and Owner profiles show role tags; only studio-role accounts have secondary role tags.

Members can edit a Friend-Card from their profile: it supports likes, dislikes, a favorite thing, the kind of friend they are looking for, personality tags, an uploaded background image, custom colors and strokes, a designed button, and card effects. A card stays private until its owner selects **Post custom friend card**. The Members page shows only posted Friend-Cards; members can search profiles from the shared header search, even before a card is posted. Other roles use their studio profiles instead. The header search covers games, artwork, Member accounts, and the studio team; choosing a person opens their full profile. The signed-in Owner can update a registered account’s primary and secondary roles from that profile, but cannot assign Owner or Visitor.

Visitors can browse the site pages, but they cannot download games or extras or buy Shop tickets. Their top-right guest profile opens a simple prompt to log in or create an account. The home page is public whether or not a visitor has selected guest mode.

Real name is optional. A warning appears before the first save because that value becomes permanent; a WHO? ticket is required to change it later. Usernames can be changed once every seven days, or sooner by using a Namecard ticket. Both tickets are currently free and are added from the Shop.

At the bottom of a profile, a member can pause their account for 30 days or permanently delete it. Pausing removes the account from the active site, blocks login, and keeps a private backup that is restored after 30 days. Deletion removes the account and any Solaris-managed pause backup. Backups retained separately by Git or the hosting/database provider follow their own retention policies.

## Render and persistent account storage

Render free web services spin down after 15 minutes without incoming traffic and wake when a new request arrives. Their local filesystem is ephemeral, so account file changes do not survive a spin-down, restart, or redeploy. Use PostgreSQL for account storage and set `DATABASE_URL` to the database’s internal connection URL; keep the database and web service in the same region. The server creates its tables at startup and imports `data/accounts.json` on the first start only when the database has no account record. Active accounts and 30-day pause backups are stored together, so restoring an account does not depend on the web service’s local filesystem. See Render’s [free instance](https://render.com/docs/free) and [PostgreSQL connection](https://render.com/docs/postgresql-creating-connecting) guides.

Set the service build command to `npm install` and its start command to `npm start`. Render’s free PostgreSQL databases expire after 30 days, so use a database plan that does not expire for ongoing account storage. A paid web service with a [persistent disk](https://render.com/docs/disks) is another option: mount the disk at a path such as `/var/data` and set `SOLARIS_DATA_DIR=/var/data`.

When using the local file store, the server creates `data/accounts.json` on first save. Keep account data out of Git. If you are moving an existing file store to PostgreSQL, the server imports it when the database account store is empty.

## Before public launch

Run the site behind HTTPS, set `NODE_ENV=production`, keep protected backups, and use a PostgreSQL plan with a retention period that meets your needs. The Owner setup code belongs in the hosting provider’s environment settings, never in source files.
