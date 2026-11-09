// Docks Techpost's own search box into the tabs bar on wide viewports so the
// separate Material header row can stay hidden there (it's redundant once
// the tabs bar is visible: HFWS already shows the microsite title, and the
// drawer toggle auto-hides at this same breakpoint). Below the breakpoint,
// where Material hides the tabs bar, search stays in its native header slot.
// This only ever touches Techpost's own header/tabs markup, never HFWS's.
(function () {
  if (window.__tpSearchDock) return;
  window.__tpSearchDock = true;

  // Matches the breakpoint Material's own CSS uses to show/hide .md-tabs.
  var DESKTOP_QUERY = "(min-width: 76.234375em)";

  // Captured once from the pristine server-rendered header and reused by
  // reference from then on: instant navigation destroys whichever tabs bar
  // these got docked into (it replaces [data-md-component=container]'s
  // content wholesale), so re-querying the live document for them after a
  // navigation would find nothing. The header itself lives outside the
  // container and is never replaced, so these references stay valid.
  var trigger = document.querySelector("label.md-header__button[for='__search']");
  var dialog = document.querySelector('[data-md-component="search"]');
  if (!trigger || !dialog) return;

  var homeParent = trigger.parentNode;
  var homeAnchor = dialog.nextSibling;

  function dockInTabs() {
    var grid = document.querySelector('[data-md-component="container"] .md-tabs .md-grid');
    if (!grid) return false;

    var wrapper = grid.querySelector(".tp-tabs-search");
    if (wrapper && wrapper.contains(trigger)) return true;

    if (!wrapper) {
      wrapper = document.createElement("div");
      wrapper.className = "tp-tabs-search";
      grid.appendChild(wrapper);
    }
    wrapper.appendChild(trigger);
    wrapper.appendChild(dialog);
    return true;
  }

  function dockInHeader() {
    if (trigger.parentNode === homeParent) return;
    homeParent.insertBefore(trigger, homeAnchor);
    homeParent.insertBefore(dialog, homeAnchor);
  }

  function sync() {
    if (window.matchMedia(DESKTOP_QUERY).matches) {
      dockInTabs();
    } else {
      dockInHeader();
    }
  }

  // Pressing Enter navigates to a dedicated results page instead of relying
  // on Material's live dropdown, which can't show while docked in the tabs
  // bar (its CSS reveals it via a sibling selector scoped to .md-header).
  document.addEventListener("keydown", function (event) {
    if (event.key !== "Enter") return;
    var input = event.target;
    if (!input.classList || !input.classList.contains("md-search__input")) return;
    if (!input.closest(".tp-tabs-search")) return;
    var query = input.value.trim();
    if (!query || !window.__TP_SEARCH_RESULTS_URL__) return;
    event.preventDefault();
    window.location.href = window.__TP_SEARCH_RESULTS_URL__ + "?q=" + encodeURIComponent(query);
  });

  sync();
  window.matchMedia(DESKTOP_QUERY).addEventListener("change", sync);
  window.addEventListener("resize", sync);

  // Material's instant navigation replaces [data-md-component=container]'s
  // contents wholesale on every page change, discarding whichever tabs bar
  // the search box was docked in; re-dock it into the freshly rendered one.
  new MutationObserver(sync).observe(document.body, { childList: true, subtree: true });
})();
