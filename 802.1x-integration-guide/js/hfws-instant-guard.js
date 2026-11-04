// Keeps the HPE HFWS header/footer styled when Material's instant navigation is on.
//
// The HFWS loader injects its stylesheets into <head> at runtime. On every instant
// navigation Material rebuilds <head> to match the fetched page and removes any node
// the page didn't ship with, which strips those HFWS stylesheets and leaves the
// corporate header/footer unstyled. Material only reconciles <head>, so we move the
// HFWS stylesheets into <body> (still applies document-wide) where they are never
// touched -> the header/footer stay styled across navigations with no repaint.
(function () {
  if (window.__hfwsCssKeeper) return;
  window.__hfwsCssKeeper = true;

  var HFWS_CSS = /(h50007\.www5\.hpe\.com|hpe-hfws)/i;

  function relocate(link) {
    if (link.parentNode !== document.body) {
      document.body.appendChild(link);
    }
  }

  function relocateAll() {
    document.querySelectorAll('head link[rel="stylesheet"]').forEach(function (link) {
      if (HFWS_CSS.test(link.href)) relocate(link);
    });
  }

  function start() {
    relocateAll();

    // The HFWS loader adds its stylesheets to <head> asynchronously; move each into
    // <body> as soon as it appears (before the next navigation can strip it).
    new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        mutation.addedNodes.forEach(function (node) {
          if (node.tagName === "LINK" && node.rel === "stylesheet" && HFWS_CSS.test(node.href)) {
            relocate(node);
          }
        });
      });
    }).observe(document.head, { childList: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
