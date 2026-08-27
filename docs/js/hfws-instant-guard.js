// Keeps the HPE HFWS header/footer styled when Material's instant navigation is on.
//
// The HFWS loader injects its stylesheets into <head> at runtime. On every instant
// navigation Material rebuilds <head> to match the fetched page and removes any node
// the page didn't ship with (everything except theme-color/color-scheme meta), which
// strips those HFWS stylesheets and leaves the corporate header/footer unstyled.
// We remember the HFWS stylesheets and re-add them whenever they get stripped.
(function () {
  if (window.__hfwsCssKeeper) return;
  window.__hfwsCssKeeper = true;

  var HFWS_CSS = /(h50007\.www5\.hpe\.com|hpe-hfws)/i;
  var savedHrefs = [];

  function remember() {
    document.querySelectorAll('head link[rel="stylesheet"]').forEach(function (link) {
      if (HFWS_CSS.test(link.href) && savedHrefs.indexOf(link.href) === -1) {
        savedHrefs.push(link.href);
      }
    });
  }

  function restore() {
    if (!savedHrefs.length) return;
    var present = {};
    document.querySelectorAll('head link[rel="stylesheet"]').forEach(function (link) {
      present[link.href] = true;
    });
    savedHrefs.forEach(function (href) {
      if (!present[href]) {
        var link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = href;
        document.head.appendChild(link);
      }
    });
  }

  function start() {
    remember();

    // Re-add the HFWS stylesheets the instant this navigation strips them.
    new MutationObserver(function (mutations) {
      var stripped = false;
      mutations.forEach(function (mutation) {
        mutation.addedNodes.forEach(function (node) {
          if (node.tagName === "LINK" && node.rel === "stylesheet" && HFWS_CSS.test(node.href)) {
            if (savedHrefs.indexOf(node.href) === -1) savedHrefs.push(node.href);
          }
        });
        mutation.removedNodes.forEach(function (node) {
          if (node.tagName === "LINK" && HFWS_CSS.test(node.href || "")) stripped = true;
        });
      });
      if (stripped) restore();
    }).observe(document.head, { childList: true });

    // Backup: the theme emits document$ after each instant navigation.
    if (window.document$ && typeof window.document$.subscribe === "function") {
      window.document$.subscribe(function () {
        remember();
        restore();
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
