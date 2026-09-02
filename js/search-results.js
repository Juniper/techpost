// Renders search results on docs/search-results.md from the mkdocs search
// index, since Enter in the header search box navigates here (see
// js/hfws-header-merge.js) instead of opening Material's live dropdown.
(function () {
  function getQuery() {
    return new URLSearchParams(window.location.search).get("q") || "";
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  // The index stores each entry's text as rendered HTML; strip it down to
  // plain text before matching/highlighting so snippets read cleanly.
  function stripHtml(html) {
    var el = document.createElement("div");
    el.innerHTML = html;
    return (el.textContent || "").replace(/\s+/g, " ").trim();
  }

  function escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  // Index locations are root-relative (e.g. "articles/foo/"), so resolve them
  // against the site root instead of the current (search-results/) page.
  function resolveUrl(location) {
    var base = (window.__TP_SITE_URL__ || "").replace(/\/$/, "");
    return base + "/" + location;
  }

  function highlight(text, terms) {
    var safe = escapeHtml(text);
    if (!terms.length) return safe;
    var re = new RegExp("(" + terms.map(escapeRegExp).join("|") + ")", "gi");
    return safe.replace(re, "<mark>$1</mark>");
  }

  function excerpt(text, terms, radius) {
    radius = radius || 100;
    var lower = text.toLowerCase();
    var idx = -1;
    for (var i = 0; i < terms.length && idx === -1; i++) {
      idx = lower.indexOf(terms[i]);
    }
    if (idx === -1) return text.slice(0, radius * 2);
    var start = Math.max(0, idx - radius);
    var end = Math.min(text.length, idx + radius);
    return (start > 0 ? "…" : "") + text.slice(start, end) + (end < text.length ? "…" : "");
  }

  // Groups per-heading index entries back into one result per page, scoring
  // every entry that matches and keeping the best-matching excerpt.
  function search(docs, query) {
    var terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) return [];

    var pages = {};
    docs.forEach(function (doc) {
      var base = doc.location.split("#")[0];
      if (!pages[base]) pages[base] = { url: base, title: null, score: 0, bestText: "", bestScore: -1 };
      if (doc.location === base) pages[base].title = doc.title;
    });

    docs.forEach(function (doc) {
      var base = doc.location.split("#")[0];
      var text = stripHtml(doc.text);
      var haystack = (doc.title + " " + text).toLowerCase();
      var score = 0;
      terms.forEach(function (term) {
        var count = haystack.split(term).length - 1;
        if (count > 0) score += count * (doc.title.toLowerCase().indexOf(term) !== -1 ? 4 : 1);
      });
      if (score <= 0) return;
      var page = pages[base];
      page.score += score;
      if (score > page.bestScore) {
        page.bestScore = score;
        page.bestText = text;
      }
    });

    return Object.keys(pages)
      .map(function (key) { return pages[key]; })
      .filter(function (page) { return page.score > 0 && page.title; })
      .sort(function (a, b) { return b.score - a.score; });
  }

  function render(container, query, results) {
    if (!query) {
      container.innerHTML = "<p>Type a search term above and press Enter.</p>";
      return;
    }
    if (!results.length) {
      container.innerHTML = "<p>No results for <strong>" + escapeHtml(query) + "</strong>.</p>";
      return;
    }
    var terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    container.innerHTML =
      "<p>" + results.length + " result" + (results.length === 1 ? "" : "s") + " for <strong>" + escapeHtml(query) + "</strong></p>" +
      '<ul class="tp-search-results-list">' +
      results.map(function (page) {
        return '<li class="tp-search-results-item">' +
          '<a href="' + escapeHtml(resolveUrl(page.url)) + '">' + highlight(page.title, terms) + "</a>" +
          "<p>" + highlight(excerpt(page.bestText, terms), terms) + "</p>" +
          "</li>";
      }).join("") +
      "</ul>";
  }

  function init() {
    var container = document.getElementById("tp-search-results");
    if (!container) return;

    var query = getQuery();
    var input = document.querySelector(".md-search__input");
    if (input) input.value = query;

    if (!window.__TP_SEARCH_INDEX_URL__) {
      container.innerHTML = "<p>Search is unavailable right now.</p>";
      return;
    }

    fetch(window.__TP_SEARCH_INDEX_URL__)
      .then(function (res) { return res.json(); })
      .then(function (data) {
        render(container, query, search(data.docs || [], query));
      })
      .catch(function () {
        container.innerHTML = "<p>Search is unavailable right now.</p>";
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
