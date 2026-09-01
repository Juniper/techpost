// Moves Material's search icon + overlay into HFWS's secondaryNav bar, so the
// (now empty) local Material header row can be hidden without losing search.
// The secondaryNav bar is injected asynchronously by the HFWS loader script,
// so a MutationObserver waits for it before relocating.
(function () {
  if (window.__hfwsSearchRelocated) return;

  function relocate() {
    var navList = document.querySelector(".hpehf-secondary-nav-links-list");
    var trigger = document.querySelector(".md-header__inner > label.md-header__button[for='__search']");
    var search = document.querySelector(".md-header__inner > div.md-search[data-md-component='search']");
    if (!navList || !trigger || !search) return false;

    window.__hfwsSearchRelocated = true;
    var li = document.createElement("li");
    li.className = "hpehf-secondary-nav-list-item hpehf-secondary-nav-search-item";
    li.appendChild(trigger);
    li.appendChild(search);
    navList.appendChild(li);
    return true;
  }

  if (relocate()) return;

  new MutationObserver(function (_mutations, observer) {
    if (relocate()) observer.disconnect();
  }).observe(document.body, { childList: true, subtree: true });
})();
