// Encoding of a puzzle configuration into a shareable URL fragment. The secret
// word is packed into a Base64 payload so it is not plainly readable in the
// link (obfuscation for classroom use, NOT cryptographic security).
(function () {
  "use strict";

  // Base64url over UTF-8.
  function b64encode(str) {
    var utf8 = unescape(encodeURIComponent(str));
    return btoa(utf8).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function b64decode(b64) {
    var s = b64.replace(/-/g, "+").replace(/_/g, "/");
    while (s.length % 4) s += "=";
    return decodeURIComponent(escape(atob(s)));
  }

  // config = { word, readLen, minDepth, errorRate, seed }
  function encodeConfig(config) {
    var payload = {
      w: config.word,
      rl: config.readLen,
      md: config.minDepth,
      er: config.errorRate,
      s: config.seed
    };
    return b64encode(JSON.stringify(payload));
  }

  function decodeConfig(token) {
    var payload = JSON.parse(b64decode(token));
    return {
      word: payload.w,
      readLen: payload.rl,
      minDepth: payload.md,
      errorRate: payload.er,
      seed: payload.s
    };
  }

  // Build the full absolute URL for a given config.
  function buildLink(config) {
    var base = location.origin + location.pathname;
    return base + "#/play?g=" + encodeConfig(config);
  }

  // Parse the query part of a route like "play?g=...".
  function parseParams(query) {
    var params = {};
    (query || "").split("&").forEach(function (pair) {
      if (!pair) return;
      var kv = pair.split("=");
      params[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || "");
    });
    return params;
  }

  window.Share = {
    encodeConfig: encodeConfig,
    decodeConfig: decodeConfig,
    buildLink: buildLink,
    parseParams: parseParams
  };
})();
