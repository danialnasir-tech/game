# Google sign-in for Chess Ascent (free)

Players tap **Sign in with Google**. Their name, email, picture and *all* their progress (lessons, stars, puzzles, games, analyses, settings, review schedule) are saved in **their own Google Drive**, in a hidden app folder that only Chess Ascent can see. Nothing costs money, and there is no database for you to run.

You need one thing from Google: an **OAuth client ID**. It is not a secret, but it still lives in a separate file (`chess-ascent-config.js`) and never in the code.

## 1. Create the project
1. Open https://console.cloud.google.com and sign in.
2. Top bar → project picker → **New project** → name it `Chess Ascent` → **Create**. Make sure it is selected.

## 2. Turn on the Drive API (this is where progress is stored)
1. Menu → **APIs & Services → Library**.
2. Search **Google Drive API** → open it → **Enable**.

## 3. Consent screen (what players see when they sign in)
1. Menu → **APIs & Services → OAuth consent screen** (newer consoles call it **Google Auth Platform**). Click **Get started**.
2. **App information**: App name `Chess Ascent`, your support email. **Audience**: *External*. Contact email. Agree and **Create**.
3. **Data access** (or *Scopes*) → **Add or remove scopes** → tick:
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`
   - `openid`
   - `.../auth/drive.appdata` (search "drive.appdata": *See, create, and delete its own configuration data in your Google Drive*)
   → **Update** → **Save**.
4. **Audience** → while testing, add your own Gmail under **Test users**. When you are ready for everyone, click **Publish app**. These scopes are all "non-sensitive", so Google does not need to review the app.

## 4. The credential, with your website listed
1. Menu → **APIs & Services → Credentials** → **Create credentials → OAuth client ID**.
2. Application type: **Web application**. Name: `Chess Ascent website`.
3. **Authorized JavaScript origins** → **Add URI** for every address the game is opened from, exactly as it appears in the browser bar, without a trailing slash:
   - `https://yourdomain.com`
   - `https://www.yourdomain.com` (if you use www)
   - `http://localhost:8080` (only if you test on your PC)
4. **Authorized redirect URIs**: leave empty (not needed).
5. **Create**. Copy the **Client ID** (ends in `.apps.googleusercontent.com`). Ignore the client secret: Chess Ascent never uses it, and it must never go on a website.

## 5. Put the ID in the config file
1. In the game folder, copy `chess-ascent-config.example.js` and name the copy `chess-ascent-config.js`.
2. Replace `PASTE_YOUR_CLIENT_ID.apps.googleusercontent.com` with your Client ID.
3. Upload `chess-ascent-config.js` to your website, in the same folder as `index.html` (it is already there in the website folder made by `node make-website.js`: just edit it).

That's it. Open the site: **Settings → Sign in with Google**, or on the welcome screen **Played before? Sign in with Google**.

## How it behaves
- **First sign-in on a device that already has progress**: that progress is uploaded to the account.
- **Signing in on a new phone or computer**: the saved progress is restored. If both devices have progress, they are merged, keeping every finished lesson, the best stars, solved puzzles, badges and the higher XP.
- **Saving**: automatic, a few seconds after anything changes. Settings shows "Saved to your Google account at 14:05".
- **Next visit**: Google asks for a tap before it hands out a new access key, so the game reconnects on your first tap and syncs. Tokens last about an hour; after that the next tap reconnects again.
- **Sign out**: Settings → Sign out. Progress stays in the Google account.
- **Where the data is**: each player's Google Drive → hidden app data (Drive → Settings → Manage apps shows Chess Ascent and lets the player delete it). One file, `chess-ascent-progress.json`, holding `profile`, `summary` (XP, ratings, lessons done, streak…) and the full `state`.

## Troubleshooting
| Message | Fix |
| --- | --- |
| `origin_mismatch` / "Error 400" in the Google window | The address in the browser bar is not under *Authorized JavaScript origins*. Add it exactly (https, with or without www). Changes can take a few minutes. |
| "Access blocked: app not verified" or "not available" | The app is still in *Testing*: add the player as a test user, or click **Publish app**. |
| "Please allow saving to Google Drive" | The player unticked the Drive box. Sign in again and keep it ticked. |
| No sign-in button at all | `chess-ascent-config.js` is missing, in a different folder, or still has the placeholder. |

Note: the claude.ai preview page can't be used for sign-in (its address can't be added to your list). Use your own website.
