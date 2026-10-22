function initPageEnhancements() {
    // Latest articles on home page
    var latestGrid = document.getElementById('latest-articles');
    if (latestGrid) {
        var baseUrl = window.location.href.replace(/[^/]*$/, '');
        fetch(baseUrl + 'articles/menu/main/')
            .then(function(res) { return res.text(); })
            .then(function(html) {
                var doc = new DOMParser().parseFromString(html, 'text/html');
                var cards = Array.prototype.slice.call(doc.querySelectorAll('.card-grid .card'));
                // Most recent first, using each card's data-date (falls back to DOM order if absent)
                cards.sort(function(a, b) {
                    return (b.getAttribute('data-date') || '').localeCompare(a.getAttribute('data-date') || '');
                });
                var count = Math.min(4, cards.length);
                for (var i = 0; i < count; i++) {
                    var card = cards[i].cloneNode(true);
                    var href = card.getAttribute('href');
                    if (href) card.setAttribute('href', href.replace(/^\.\.\/\.\.\//, 'articles/'));
                    var img = card.querySelector('img');
                    if (img) {
                        var src = img.getAttribute('src');
                        if (src) img.setAttribute('src', src.replace(/^\.\.\/\.\.\//, 'articles/'));
                    }
                    latestGrid.appendChild(card);
                }
            });
    }

    // Card filter: live title text plus an optional category deep-link
    // (?category=<name>, produced by the HFWS main-nav dropdown). A parent
    // category also matches articles tagged with any of its subcategories,
    // using the shared taxonomy in window.__TP_CATEGORIES__.
    const filterInput = document.getElementById('card-filter');
    const cardGrid = document.querySelector('.card-grid');
    if (cardGrid) {
        const taxonomy = window.__TP_CATEGORIES__ || [];
        const activeCategory = new URLSearchParams(window.location.search).get('category');

        let accepted = null;
        if (activeCategory) {
            accepted = [activeCategory];
            const parent = taxonomy.find(function (c) { return c.name === activeCategory; });
            if (parent && parent.subcategories) {
                Array.prototype.push.apply(accepted, parent.subcategories);
            }
        }

        let emptyMsg = null;
        function applyFilters() {
            const query = (filterInput ? filterInput.value : '').toLowerCase();
            let visible = 0;
            document.querySelectorAll('.card-grid .card').forEach(function (card) {
                const title = card.querySelector('.card-title');
                const titleOk = !query || (title && title.textContent.toLowerCase().includes(query));
                const catOk = !accepted || accepted.indexOf(card.getAttribute('data-category') || '') !== -1;
                const show = titleOk && catOk;
                card.style.display = show ? '' : 'none';
                if (show) visible++;
            });
            if (!emptyMsg) {
                emptyMsg = document.createElement('p');
                emptyMsg.className = 'card-grid-empty';
                cardGrid.parentNode.insertBefore(emptyMsg, cardGrid.nextSibling);
            }
            emptyMsg.textContent = activeCategory
                ? 'No articles in "' + activeCategory + '" yet.'
                : 'No matching articles.';
            emptyMsg.style.display = visible ? 'none' : '';
        }

        if (filterInput) filterInput.addEventListener('input', applyFilters);

        // Reflect an active category deep-link as a removable chip.
        if (activeCategory) {
            const toolbar = document.querySelector('.articles-toolbar') || cardGrid.parentNode;
            const chip = document.createElement('div');
            chip.className = 'category-filter-chip';
            const label = document.createElement('span');
            label.textContent = activeCategory;
            const clear = document.createElement('a');
            clear.className = 'category-filter-clear';
            clear.href = window.location.pathname;
            clear.setAttribute('aria-label', 'Clear category filter');
            clear.textContent = '\u00d7';
            chip.appendChild(document.createTextNode('Category: '));
            chip.appendChild(label);
            chip.appendChild(clear);
            toolbar.appendChild(chip);
        }

        applyFilters();
    }

    const lightboxLinks = [];

    // Hero banner image is not part of the article gallery, so it stays unlinked
    document.querySelectorAll('.md-typeset img:not(.banner-image)').forEach(img => {
        // Skip if already inside a link
        if (img.parentNode.tagName.toLowerCase() === 'a') return;

        // Wrap image in <a> for lightbox
        const link = document.createElement('a');
        link.href = img.src;
        link.classList.add('glightbox');
        img.parentNode.insertBefore(link, img);
        link.appendChild(img);

        // Add zoom icon on hover
        link.style.position = 'relative';
        link.style.display = 'inline-block';
    });

    // Initialize GLightbox
    GLightbox({ selector: '.glightbox' });
}

// Run on first load and after every Material instant navigation (DOMContentLoaded
// does not fire on instant nav, which left the Home page's latest articles empty).
if (window.document$ && typeof window.document$.subscribe === "function") {
    window.document$.subscribe(initPageEnhancements);
} else if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initPageEnhancements);
} else {
    initPageEnhancements();
}