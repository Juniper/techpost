// Merges our site nav + search into HFWS's single main nav bar, instead of
// showing a separate secondaryNav bar or HPE's default global nav links.
// HFWS injects its header markup asynchronously, so a MutationObserver waits
// for it before relocating/injecting anything.
(function () {
  if (window.__hfwsHeaderMerged) return;

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function buildDesktopLink(item) {
    var li = document.createElement("li");
    li.className = "hpehf-nav-list-item";
    var hasChildren = Array.isArray(item.navLinks) && item.navLinks.length > 0;
    var html = '<a class="hpehf-nav-link" href="' + escapeHtml(item.href) + '" data-analytics-region-id="' + escapeHtml(item.dataAnalyticsRegionId) + '">' + escapeHtml(item.title) + "</a>";
    if (hasChildren) {
      li.classList.add("hfws-tp-has-flyout");
      html += '<div class="hpehf-main-nav-flyout"><ul class="hpehf-main-nav-flyout-list">' +
        item.navLinks.map(function (child) {
          return '<li class="hpehf-main-nav-flyout-list-item"><a class="hpehf-main-nav-flyout-link" href="' + escapeHtml(child.href) + '" data-analytics-region-id="' + escapeHtml(child.dataAnalyticsRegionId) + '"><span class="hpehf-main-nav-flyout-link-text">' + escapeHtml(child.title) + "</span></a></li>";
        }).join("") +
        "</ul></div>";
    }
    li.innerHTML = html;
    return li;
  }

  function buildMobileLink(item) {
    var li = document.createElement("li");
    li.className = "hpehf-mobile-list-item";
    li.innerHTML = '<a class="hpehf-mobile-menu-link" href="' + escapeHtml(item.href) + '" data-analytics-region-id="' + escapeHtml(item.dataAnalyticsRegionId) + '">' + escapeHtml(item.title) + "</a>";
    return li;
  }

  function injectNavLinks(links) {
    if (document.querySelector(".hfws-tp-nav-links")) return true;
    var navMenu = document.querySelector(".hpehf-nav-menu");
    var mobileNav = document.querySelector("#hpehf-mobile-nav");
    if (!navMenu || !mobileNav) return false;

    var desktopList = document.createElement("ul");
    desktopList.className = "hpehf-nav-links-list hfws-tp-nav-links";
    var mobileList = document.createElement("ul");
    mobileList.className = "hpehf-mobile-links-list hpehf-centered-content";

    links.forEach(function (item) {
      desktopList.appendChild(buildDesktopLink(item));
      mobileList.appendChild(buildMobileLink(item));
      (item.navLinks || []).forEach(function (child) {
        mobileList.appendChild(buildMobileLink(child));
      });
    });

    navMenu.appendChild(desktopList);
    mobileNav.appendChild(mobileList);
    return true;
  }

  function relocateSearch() {
    var iconsList = document.querySelector(".hpehf-icons ul.hpehf-nav-links-list");
    var trigger = document.querySelector(".md-header__inner > label.md-header__button[for='__search']");
    var search = document.querySelector(".md-header__inner > div.md-search[data-md-component='search']");
    if (!iconsList || !trigger || !search) return false;

    var li = document.createElement("li");
    li.className = "hpehf-nav-list-item hfws-tp-search-item";
    li.appendChild(trigger);
    li.appendChild(search);
    iconsList.insertBefore(li, iconsList.firstChild);
    return true;
  }

  function merge() {
    var linksDone = injectNavLinks(window.__TP_NAV_LINKS__ || []);
    var searchDone = relocateSearch();
    if (!linksDone || !searchDone) return false;
    window.__hfwsHeaderMerged = true;
    return true;
  }

  if (merge()) return;

  new MutationObserver(function (_mutations, observer) {
    if (merge()) observer.disconnect();
  }).observe(document.body, { childList: true, subtree: true });
})();

