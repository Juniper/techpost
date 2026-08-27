// Shields in-site link clicks from the HPE HFWS global click/analytics handlers.
//
// With Material's `navigation.instant`, internal links are handled by a click
// listener on `document.body`. The HFWS scripts attach their own handlers higher
// up (document/window); as the click bubbles past them they redirect in-site
// navigation to the HPE site map. We stop the event at the body level for
// same-origin links so it never reaches those handlers. Because Material listens
// on the same element, `stopPropagation()` does not affect it (only other targets
// in the bubble path), so instant navigation keeps working.
(function () {
  if (window.__hfwsInstantGuardBound) return;

  function attach() {
    if (!document.body || window.__hfwsInstantGuardBound) return;
    window.__hfwsInstantGuardBound = true;

    document.body.addEventListener(
      "click",
      function (ev) {
        var link = ev.target instanceof Element ? ev.target.closest("a[href]") : null;
        if (!link) return;

        // Leave the HFWS header/footer's own links to HFWS.
        if (link.closest("#header, #footer")) return;

        // Ignore links that intentionally open elsewhere (new tab, download, ...).
        if (link.target && link.target !== "_self") return;
        if (link.hasAttribute("download")) return;

        var url;
        try {
          url = new URL(link.href, location.href);
        } catch (e) {
          return;
        }
        if (url.origin !== location.origin) return;

        // Same-origin, in-site link handled by Material: keep it away from the
        // HFWS document/window handlers so it is not redirected to the site map.
        ev.stopPropagation();
      },
      false
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", attach);
  } else {
    attach();
  }
})();
