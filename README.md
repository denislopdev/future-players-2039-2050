# Future Players 2039–2050

A free collection of online player tools created by Denis Lop.

## Included tools

- M3U Player Online
- Xtream Codes Player Online

## Features

- Free to use
- Browser-based
- No subscription
- No hidden payment
- Clean futuristic landing page
- Created by Denis Lop

## Author

Denis Lop

## Local development

Each player includes a Node.js server for playlist proxying and streaming. GitHub Pages serves the static UI only; for full playback, run the server locally:

```bash
cd m3u-player
npm install
npm start
```

```bash
cd xtream-player
npm install
npm start
```

The M3U player runs on port 3000 by default. Stop it before starting the Xtream player, or set a different `PORT` environment variable.

## GitHub Pages

After publishing, enable GitHub Pages from the repository settings and select the **main** branch with the **root** folder.

The player UI is served from GitHub Pages. Playlist and stream proxy APIs run on a free Render service at `https://future-players-api.onrender.com` (configured automatically when opened from `*.github.io`).

## API hosting (Render)

The `api/` folder and `render.yaml` deploy a combined Node.js proxy for both players. Connect the repository on [Render](https://render.com) using the Blueprint (`render.yaml`) or create a Web Service with root directory `api`.

First request after idle may take up to a minute on the free plan.

## License

MIT License
