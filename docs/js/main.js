// Tiny DOM helper + hash router that ties the views together.
(function () {
  "use strict";

  // h(tag, attrs, children) -> HTMLElement
  window.h = function (tag, attrs, children) {
    var el = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === "class") el.className = attrs[k];
        else el.setAttribute(k, attrs[k]);
      });
    }
    (children || []).forEach(function (c) {
      if (c == null) return;
      el.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return el;
  };

  var DEFAULT_CONFIG = { word: "GENE", minDepth: 3, readLen: 10, errorRate: 0.06 };

  function route() {
    var app = document.getElementById("app");
    var hash = location.hash.replace(/^#\/?/, ""); // strip "#/" or "#"
    var qIndex = hash.indexOf("?");
    var path = qIndex === -1 ? hash : hash.slice(0, qIndex);
    var query = qIndex === -1 ? "" : hash.slice(qIndex + 1);

    setActiveNav(path || "home");
    window.scrollTo(0, 0);

    if (path === "" || path === "home") { window.Intro.renderHome(app); return; }
    if (path === "learn") { window.Intro.renderLearn(app); return; }
    if (path === "create") { window.Game.renderCreate(app); return; }
    if (path === "play" || path === "print") {
      var params = window.Share.parseParams(query);
      var config = DEFAULT_CONFIG;
      if (params.g) {
        try { config = window.Share.decodeConfig(params.g); }
        catch (e) { config = DEFAULT_CONFIG; }
      }
      if (path === "print") window.Game.renderPrint(app, config);
      else window.Game.renderPlay(app, config);
      return;
    }
    // unknown route
    window.Intro.renderHome(app);
  }

  function setActiveNav(path) {
    document.querySelectorAll(".topnav a[data-nav]").forEach(function (a) {
      a.classList.toggle("active", a.getAttribute("data-nav") === path);
    });
  }

  window.addEventListener("hashchange", route);
  window.addEventListener("DOMContentLoaded", function () {
    // warm up the Prolog engine in the background
    window.Prolog.init().catch(function () {});
    route();
  });
})();
