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

## License

MIT License
