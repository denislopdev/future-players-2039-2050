# Deploy API for GitHub Pages players

GitHub Pages serves static files only. The Xtream player and full M3U streaming need the Node.js API in the `api/` folder.

## One-click deploy on Render (free)

1. Open: https://render.com/deploy?repo=https://github.com/denislopdev/online-players-m3u-extreme-code
2. Sign in with GitHub if asked
3. Approve the Blueprint (`render.yaml`)
4. Wait 2–5 minutes for the service `future-players-api` to become live
5. Test: https://future-players-api.onrender.com/ — should return `{"ok":true,...}`

The players on GitHub Pages already point to `https://future-players-api.onrender.com`.

**Note:** On Render's free plan the API sleeps after inactivity. The first request may take up to 60 seconds.

## M3U player without API

The M3U player on GitHub Pages can load playlists through a public CORS proxy even before the API is deployed. Xtream Codes requires the API.
