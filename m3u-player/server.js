const express = require("express");
const path = require("path");
const http = require("http");
const https = require("https");
const { URL } = require("url");

const app = express();
const PORT = process.env.PORT || 3000;
const APP_PATHS = ["", "/m3u-player"];

app.disable("x-powered-by");
app.set("trust proxy", true);

app.use(function (req, res, next) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Range, Content-Type, Accept");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  next();
});

APP_PATHS.forEach(function (basePath) {
  app.use(basePath, express.static(__dirname));
  app.use(basePath + "/public", express.static(path.join(__dirname, "public")));
});

function getPublicOrigin(req) {
  const forwardedProto = req.headers["x-forwarded-proto"];
  const proto = forwardedProto ? String(forwardedProto).split(",")[0].trim() : "https";
  const host = req.get("host");

  return proto + "://" + host;
}

function isBlockedHost(hostname) {
  const host = String(hostname || "").toLowerCase();

  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "0.0.0.0" ||
    host === "::1" ||
    host.indexOf("10.") === 0 ||
    host.indexOf("192.168.") === 0 ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(host) ||
    /^169\.254\./.test(host)
  );
}

function validateUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== "string") {
    throw new Error("URL is missing");
  }

  const parsed = new URL(rawUrl);

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Only HTTP and HTTPS links are allowed");
  }

  if (isBlockedHost(parsed.hostname)) {
    throw new Error("This address is not allowed");
  }

  return parsed;
}

function absoluteUrl(baseUrl, targetUrl) {
  return new URL(targetUrl, baseUrl).toString();
}

function getRequestHeaders(targetUrl, req) {
  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
    "Accept": "*/*",
    "Connection": "keep-alive"
  };

  if (req && req.headers && req.headers.range) {
    headers.Range = req.headers.range;
  }

  try {
    const parsed = new URL(targetUrl);
    headers.Referer = parsed.protocol + "//" + parsed.host + "/";
    headers.Origin = parsed.protocol + "//" + parsed.host;
  } catch (error) {}

  return headers;
}

function fetchText(rawUrl, callback, redirectCount) {
  redirectCount = redirectCount || 0;

  if (redirectCount > 8) {
    callback(new Error("Too many redirects"));
    return;
  }

  let parsed;

  try {
    parsed = validateUrl(rawUrl);
  } catch (error) {
    callback(error);
    return;
  }

  const client = parsed.protocol === "https:" ? https : http;

  const request = client.get(
    parsed,
    {
      headers: getRequestHeaders(parsed.toString()),
      timeout: 25000
    },
    function (response) {
      if (
        response.statusCode >= 300 &&
        response.statusCode < 400 &&
        response.headers.location
      ) {
        const redirectUrl = new URL(response.headers.location, parsed).toString();
        response.resume();
        fetchText(redirectUrl, callback, redirectCount + 1);
        return;
      }

      if (response.statusCode < 200 || response.statusCode >= 300) {
        response.resume();
        callback(new Error("Could not load the playlist. HTTP status: " + response.statusCode));
        return;
      }

      let data = "";

      response.setEncoding("utf8");

      response.on("data", function (chunk) {
        data += chunk;

        if (data.length > 20 * 1024 * 1024) {
          request.destroy();
          callback(new Error("Playlist is too large"));
        }
      });

      response.on("end", function () {
        callback(null, data);
      });
    }
  );

  request.on("timeout", function () {
    request.destroy();
    callback(new Error("Request timeout"));
  });

  request.on("error", function (error) {
    callback(error);
  });
}

function parseAttributes(input) {
  const attrs = {};
  const regex = /([\w-]+)="([^"]*)"/g;
  let match;

  while ((match = regex.exec(input)) !== null) {
    attrs[match[1]] = match[2];
  }

  return attrs;
}

function parseM3U(text, playlistUrl) {
  const lines = text
    .replace(/\r/g, "")
    .split("\n")
    .map(function (line) {
      return line.trim();
    })
    .filter(Boolean);

  const groups = {};
  let current = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.indexOf("#EXTINF") === 0) {
      const commaIndex = line.indexOf(",");
      const meta = commaIndex >= 0 ? line.slice(0, commaIndex) : line;
      const name = commaIndex >= 0 ? line.slice(commaIndex + 1).trim() : "Untitled Channel";
      const attrs = parseAttributes(meta);

      current = {
        name: name || attrs["tvg-name"] || "Untitled Channel",
        logo: attrs["tvg-logo"] || "",
        group: attrs["group-title"] || "Other",
        url: ""
      };
    } else if (line.indexOf("#EXTGRP:") === 0 && current) {
      current.group = line.replace("#EXTGRP:", "").trim() || "Other";
    } else if (line.indexOf("#") !== 0 && current) {
      current.url = absoluteUrl(playlistUrl, line);

      if (!groups[current.group]) {
        groups[current.group] = [];
      }

      groups[current.group].push(current);
      current = null;
    }
  }

  return Object.keys(groups)
    .sort(function (a, b) {
      return a.localeCompare(b, "en");
    })
    .map(function (name) {
      return {
        name: name,
        channels: groups[name].sort(function (a, b) {
          return a.name.localeCompare(b.name, "en");
        })
      };
    });
}

function getRequestBasePath(req) {
  const originalUrl = String(req.originalUrl || req.url || "");

  if (originalUrl.indexOf("/m3u-player/") === 0 || originalUrl === "/m3u-player") {
    return "/m3u-player";
  }

  return "";
}

function makeProxyUrl(targetUrl, req) {
  return getPublicOrigin(req) + getRequestBasePath(req) + "/api/stream?url=" + encodeURIComponent(targetUrl);
}

function rewriteHlsPlaylist(text, sourceUrl, req) {
  return text
    .replace(/\r/g, "")
    .split("\n")
    .map(function (line) {
      const trimmed = line.trim();

      if (!trimmed) {
        return line;
      }

      if (trimmed.indexOf("#") === 0) {
        if (trimmed.indexOf("URI=") !== -1) {
          return trimmed.replace(/URI="([^"]+)"/g, function (_, uri) {
            const fullUrl = absoluteUrl(sourceUrl, uri);
            return 'URI="' + makeProxyUrl(fullUrl, req) + '"';
          });
        }

        return line;
      }

      const fullUrl = absoluteUrl(sourceUrl, trimmed);
      return makeProxyUrl(fullUrl, req);
    })
    .join("\n");
}

function registerRoutes(basePath) {
  app.get(basePath + "/", function (req, res) {
    res.sendFile(path.join(__dirname, "index.html"));
  });

  app.get(basePath + "/index.html", function (req, res) {
    res.sendFile(path.join(__dirname, "index.html"));
  });

  app.get(basePath + "/api/playlist", function (req, res) {
    const playlistUrl = req.query.url;

    fetchText(playlistUrl, function (error, text) {
      if (error) {
        res.status(400).json({
          error: error.message || "Playlist loading error"
        });
        return;
      }

      if (text.indexOf("#EXTM3U") === -1) {
        res.status(400).json({
          error: "This does not look like a valid M3U playlist"
        });
        return;
      }

      try {
        const groups = parseM3U(text, playlistUrl);

        res.json({
          groups: groups
        });
      } catch (parseError) {
        res.status(400).json({
          error: "Could not parse this playlist"
        });
      }
    });
  });

  app.get(basePath + "/api/stream", function (req, res) {
    let streamUrl;

    try {
      streamUrl = validateUrl(req.query.url);
    } catch (error) {
      res.status(400).send("Invalid stream URL");
      return;
    }

    const streamUrlString = streamUrl.toString();
    const client = streamUrl.protocol === "https:" ? https : http;

    const request = client.get(
      streamUrl,
      {
        headers: getRequestHeaders(streamUrlString, req),
        timeout: 30000
      },
      function (response) {
        if (
          response.statusCode >= 300 &&
          response.statusCode < 400 &&
          response.headers.location
        ) {
          const redirectUrl = new URL(response.headers.location, streamUrl).toString();
          response.resume();
          res.redirect(makeProxyUrl(redirectUrl, req));
          return;
        }

        if (response.statusCode < 200 || response.statusCode >= 300) {
          response.resume();
          res.status(400).send("Stream error. HTTP status: " + response.statusCode);
          return;
        }

        const contentType = response.headers["content-type"] || "";
        const pathname = streamUrl.pathname.toLowerCase();

        const isPlaylist =
          contentType.indexOf("mpegurl") !== -1 ||
          contentType.indexOf("application/vnd.apple.mpegurl") !== -1 ||
          pathname.indexOf(".m3u8") !== -1 ||
          pathname.indexOf(".m3u") !== -1 ||
          streamUrlString.toLowerCase().indexOf("m3u8") !== -1;

        if (isPlaylist) {
          let data = "";

          response.setEncoding("utf8");

          response.on("data", function (chunk) {
            data += chunk;
          });

          response.on("end", function () {
            res.statusCode = 200;
            res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.send(rewriteHlsPlaylist(data, streamUrlString, req));
          });

          return;
        }

        res.statusCode = response.statusCode;

        if (contentType) {
          res.setHeader("Content-Type", contentType);
        } else if (pathname.indexOf(".ts") !== -1) {
          res.setHeader("Content-Type", "video/mp2t");
        } else if (pathname.indexOf(".m4s") !== -1 || pathname.indexOf(".mp4") !== -1) {
          res.setHeader("Content-Type", "video/mp4");
        } else if (pathname.indexOf(".aac") !== -1) {
          res.setHeader("Content-Type", "audio/aac");
        } else {
          res.setHeader("Content-Type", "application/octet-stream");
        }

        if (response.headers["content-length"]) {
          res.setHeader("Content-Length", response.headers["content-length"]);
        }

        if (response.headers["content-range"]) {
          res.setHeader("Content-Range", response.headers["content-range"]);
        }

        if (response.headers["accept-ranges"]) {
          res.setHeader("Accept-Ranges", response.headers["accept-ranges"]);
        }

        res.setHeader("Access-Control-Allow-Origin", "*");

        response.pipe(res);
      }
    );

    request.on("timeout", function () {
      request.destroy();

      if (!res.headersSent) {
        res.status(408).send("Stream timeout");
      }
    });

    request.on("error", function () {
      if (!res.headersSent) {
        res.status(400).send("Stream proxy error");
      }
    });
  });
}

APP_PATHS.forEach(registerRoutes);

app.listen(PORT, function () {
  console.log("M3U player is running on port " + PORT);
});
