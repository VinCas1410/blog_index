$(document).ready(function () {
    const rssUrl = 'https://raw.githubusercontent.com/VinCas1410/blog_index/refs/heads/main/xml/index.xml';

    function getUrlParameter(name) {
        name = name.replace(/\[/, '\\[').replace(/]/, '\\]');
        const regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
        const results = regex.exec(location.search);
        return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
    }

    function formatDate(dateString) {
        const date = new Date(dateString);
        const options = { year: '2-digit', month: 'short', day: '2-digit' };
        return date.toLocaleDateString('en-GB', options).replace(/ /g, '-');
    }


    function formatLocalizedDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-UK', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    }

    $.ajax({
        type: 'GET',
        url: rssUrl,
        dataType: 'xml',
        success: function (xml) {
            $('#articles').empty();

            const articles = $(xml).find('item').map(function (index, item) {
                const $item = $(item);
                const title = $item.find('title').text().trim();
                const link = $item.find('link').text().trim();
                const pubDate = $item.find('pubDate').text().trim();
                const formattedDate = formatDate(pubDate);
                const description = $item.find('description').text().trim();

                const articleHtml = `
                    <li> <span class="formatted-date">${formattedDate}</span> - <a href="showblog.html?title=${encodeURIComponent(title)}&pubDate=${encodeURIComponent(pubDate)}&description=${encodeURIComponent(description)}">${title} </a>
                    </li>
                `;
                return articleHtml;
            }).get();

            articles.forEach(article => {
                $('#articles').append(article);
            });

            const blogParam = getUrlParameter('title');
            if (blogParam) {
                const selectedArticle = articles.find(a => a.title === blogParam);
                if (selectedArticle) {
                    $('#articleTitle').text(selectedArticle.title);
                    $('#articleDate').text(selectedArticle.pubDate);
                    $('#articleBody').html(decodeURIComponent(selectedArticle.description));
                    $('#articleContent').show();
                } else {
                    $('#articleContent').hide();
                }
            }

            $('#articles').on('click', '.article-link', function () {
                const $this = $(this);
                const title = $this.data('title');
                const pubDate = $this.data('pubdate');
                const description = decodeURIComponent($this.data('description'));

                $('#articleTitle').text(title);
                $('#articleDate').text(pubDate);
                $('#articleBody').html(description);

                $('#articleContent').show();
            });
        },
        error: function () {
            alert('Error loading RSS feed');
        },
    });

    window.goBack = function () {
        window.location.href = 'blog.html';
    }

    if (window.location.pathname.endsWith('showblog.html')) {
        const urlParams = new URLSearchParams(window.location.search);
        const title = decodeURIComponent(urlParams.get('title'));
        const pubDate = decodeURIComponent(urlParams.get('pubDate'));
        const description = decodeURIComponent(urlParams.get('description'));

        $('#articleTitle').text(title);
        $('#articleDate').text(formatLocalizedDate(pubDate));
        $('#articleBody').html(description);
    }
});
