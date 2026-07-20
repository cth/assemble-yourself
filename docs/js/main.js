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

  // Fill in any element carrying a data-i18n key (nav links, etc.).
  function applyStaticI18n() {
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      el.textContent = window.I18N.t(el.getAttribute("data-i18n"));
    });
  }

  function setupLanguageSelector() {
    var sel = document.getElementById("lang-select");
    if (!sel) return;
    sel.innerHTML = "";
    window.I18N.locales.forEach(function (loc) {
      var opt = document.createElement("option");
      opt.value = loc;
      opt.textContent = window.I18N.localeName(loc);
      sel.appendChild(opt);
    });
    sel.value = window.I18N.getLocale();
    sel.addEventListener("change", function () { window.I18N.setLocale(sel.value); });
  }

  window.addEventListener("hashchange", route);
  window.addEventListener("DOMContentLoaded", function () {
    document.documentElement.setAttribute("lang", window.I18N.getLocale());
    setupLanguageSelector();
    applyStaticI18n();
    // Re-render the current view and refresh nav labels when the locale changes.
    window.I18N.onChange(function () { applyStaticI18n(); route(); });
    // warm up the Prolog engine in the background
    window.Prolog.init().catch(function () {});
    route();
  });
})();
