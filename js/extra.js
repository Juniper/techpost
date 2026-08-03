document.addEventListener("DOMContentLoaded", function() {
    // Latest articles on home page
    var latestGrid = document.getElementById('latest-articles');
    if (latestGrid) {
        var baseUrl = window.location.href.replace(/[^/]*$/, '');
        fetch(baseUrl + 'articles/menu/main/')
            .then(function(res) { return res.text(); })
            .then(function(html) {
                var doc = new DOMParser().parseFromString(html, 'text/html');
                var cards = doc.querySelectorAll('.card-grid .card');
                var count = Math.min(5, cards.length);
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

    // Card filter functionality
    const filterInput = document.getElementById('card-filter');
    if (filterInput) {
        filterInput.addEventListener('input', function() {
            const query = this.value.toLowerCase();
            document.querySelectorAll('.card-grid .card').forEach(function(card) {
                const title = card.querySelector('.card-title');
                if (title && title.textContent.toLowerCase().includes(query)) {
                    card.style.display = '';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    }

    const lightboxLinks = [];

    document.querySelectorAll('.md-typeset img').forEach(img => {
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
});