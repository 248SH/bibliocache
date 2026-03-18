// pagination.js — Handles pagination controls and page navigation

/**
 * Calculates the total number of pages for the MyCache store and delegates
 * to `updatePaginationControls`. Hides pagination if there is only one page.
 * @param {number} [page=1] - The currently active page number.
 * @returns {void}
 */
function updateMyCachePagination(page = 1) {
	const totalBooks = myCacheStore.size;
	const totalPages = Math.ceil(totalBooks / booksPerPage);

	if(totalPages <= 1) {
		$('.pagination').hide();
		return;
	}

	updatePaginationControls(totalPages, page);
}

/**
 * Renders a windowed Bootstrap pagination control (Previous, numbered pages,
 * Next) into the `.pagination` element. Clears the control and exits early
 * when there is only one page or no pagination element exists.
 * @param {number} totalPages - The total number of available pages.
 * @param {number} currentPage - The currently active page number.
 * @returns {void}
 */
function updatePaginationControls(totalPages, currentPage) {
    const $pagination = $('.pagination');

    // Safety checks
    if (!$pagination.length || totalPages <= 1) {
        $pagination.empty();
        return;
    }

    $pagination.empty();

    // PREVIOUS BUTTON
    $pagination.append(`
        <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" data-page="${currentPage - 1}">
                Previous
            </a>
        </li>
    `);

    // PAGE NUMBERS (windowed: current ±1)
    const startPage = Math.max(1, currentPage - 1);
    const endPage   = Math.min(totalPages, currentPage + 1);

    if (startPage > 1) {
        $pagination.append(`
            <li class="page-item">
                <a class="page-link" href="#" data-page="1">1</a>
            </li>
        `);

        if (startPage > 2) {
            $pagination.append(`
                <li class="page-item disabled">
                    <span class="page-link">…</span>
                </li>
            `);
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        $pagination.append(`
            <li class="page-item ${i === currentPage ? 'active' : ''}">
                <a class="page-link" href="#" data-page="${i}">${i}</a>
            </li>
        `);
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            $pagination.append(`
                <li class="page-item disabled">
                    <span class="page-link">…</span>
                </li>
            `);
        }

        $pagination.append(`
            <li class="page-item">
                <a class="page-link" href="#" data-page="${totalPages}">
                    ${totalPages}
                </a>
            </li>
        `);
    }

    // NEXT BUTTON
    $pagination.append(`
        <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" data-page="${currentPage + 1}">
                Next
            </a>
        </li>
    `);

    $pagination.show().fadeTo(200, 1);
}

	/**
	 * Empties and hides the `.pagination` element.
     * @returns {void}
	 */
	function clearPaginationControls() {
		$('.pagination').empty().hide();
        $("#filterBtn").fadeOut(300);
	}

    $('.pagination').on('click', '.page-link', function (e) {
    e.preventDefault();

    const page = parseInt($(this).data('page'), 10);
    if (!page || page < 1) return;

    const currentPage = $('body').attr('data-page');

    if (currentPage === 'myCache') {
        loadMyCacheBooks(page);
        return;
    }

    if (currentPage === 'search') {
        const formData = $('#mainForm').serializeArray();
        const fieldItem = formData.find(f => f.name === 'bookData');
        const queryItem = formData.find(f => f.name === 'search');

if (!fieldItem || !fieldItem.value || !queryItem?.value?.trim()) {
	showAlert(ALERTS.EMPTY_SEARCH);
	return;
}

fetchBookSummary(queryItem.value.trim(), fieldItem.value, page);
    }
});