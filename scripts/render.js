// render.js — Handles creating and displaying book elements in the UI

/**
 * Creates and returns a fully-built `.book` DOM element populated with the
 * supplied book data, including tabbed overview/details panes and admin controls.
 * @param {Book} b - The book data to render.
 * @returns {HTMLDivElement} The constructed book card element.
 */
function createBookElement(b) {
    const id = escapeHtml(b.id || '');
    const imgSrc = b.coverURL || 'assets/Book11.png';

    const book = document.createElement('div');
    book.className = 'book';
    book.dataset.id = id;
    book.dataset.bookType = 'openlibrary';

    book.innerHTML = `
        <div class="book-container">

        <div class="category-indicators">
                <span class="indicator read">Read &#x2714;</span>
                <span class="indicator wishlist">Wishlist &#x2714;</span>
                <span class="indicator favourite">Favourite &#x2714;</span>
                </div>

            <nav>
                <div class="nav nav-tabs" role="tablist">
                    <button class="nav-link active"
                            id="nav-overview-tab-${id}"
                            data-bs-toggle="tab"
                            data-bs-target="#nav-overview-${id}"
                            type="button" role="tab"
                            aria-controls="nav-overview-${id}"
                            aria-selected="true">
                        Overview
                    </button>

                    <button class="nav-link details-tab"
                            id="nav-details-tab-${id}"
                            data-bs-toggle="tab"
                            data-bs-target="#nav-details-${id}"
                            type="button" role="tab"
                            aria-controls="nav-details-${id}"
                            aria-selected="false">
                        Details
                    </button>
                </div>
            </nav>

            <div class="tab-content">

                <div class="tab-pane fade show active overview"
                     id="nav-overview-${id}"
                     role="tabpanel"
                     aria-labelledby="nav-overview-tab-${id}"
                     tabindex="0">

                    <div class="img-card">
                        <img src="${imgSrc}" height="250" alt="cover">
                    </div>

                    <div class="overview-list">
                    <ul>
                        <li class="title"><b>${escapeHtml(b.title)}</b></li>
                        <li class="author"><em>${escapeHtml(b.author)}</em></li>
                    </ul>
                    </div>
                </div>
                <div class="tab-pane fade"
                     id="nav-details-${id}"
                     role="tabpanel"
                     aria-labelledby="nav-details-tab-${id}"
                     tabindex="0">

                    <ul>
                        <li class="detailTitle">Genre/Subjects</li>
                        <li class="genres">${escapeHtml(b.genres)}</li>

                        <li class="detailTitle">Date</li>
                        <li class="date">${escapeHtml(b.date)}</li>

                        <li class="detailTitle">Synopsis</li>
                        <li class="synopsis">${escapeHtml(b.synopsis)}</li>

                        <li class="detailTitle">Characters</li>
                        <li class="characters">${escapeHtml(b.characters)}</li>
                    </ul>
                </div>

            </div>

            <div class="admin-tab">
                <button type="button"
                        class="btn btn-outline-primary thin addBookCache">
                    Save Book
                </button>
                <ul class="cat-list faded">
                <li class="header">Add to category:</li>
                <li><input type="checkbox" name="read" value="read"> Read</li>
                <li><input type="checkbox" name="wishlist" value="wishlist"> Wishlist</li>
                <li><input type="checkbox" name="favourite" value="favourite"> Favourite</li>
            </ul>
            </div>

        </div>
    `;

    return book;
}

/**
 * Clears the `.book-shelf` container and renders all supplied books into it,
 * grouped in rows of four. Also triggers a UI state sync for each book.
 * @param {Book[]} books - Array of book objects to render.
 */
function renderBooks(books) {
    console.log("Rendering books:", books);

    const shelf = document.querySelector('.book-shelf');
    if (!shelf) return;

    shelf.innerHTML = '';

    for (let i = 0; i < books.length; i += 4) {
        const row = document.createElement('div');
        row.className = 'book-row';

        books.slice(i, i + 4).forEach(bookData => {
            const bookEl = createBookElement(bookData);
            row.appendChild(bookEl);
        });

        shelf.appendChild(row);

        books.slice(i, i + 4).forEach(bookData => {
            const uiState = getBookUIState(bookData.id);
            renderBookUI(bookData.id);
            console.log(uiState)
        });
    }

    $('.windowPane').fadeIn(300);
}

/**
 * Reads the current `bookUIState` for a book and applies all relevant CSS
 * classes, button text/state, checkbox values, and indicator visibility to its
 * DOM element.
 * @param {string} bookId - The OpenLibrary work key of the book to update.
 */
function renderBookUI(bookId) {
    const state = getBookUIState(bookId);
    const bookEl = document.querySelector(`.book[data-id="${bookId}"]`);
    if (!bookEl) return;

    const cacheBtn = bookEl.querySelector(".addBookCache");
    const catList = bookEl.querySelector(".cat-list");

    bookEl.classList.toggle("add", state.updateOpen);
    bookEl.classList.toggle("faded", state.faded);
    bookEl.classList.toggle("selected", state.selected);

    bookEl.querySelector(".overview-list")
        ?.classList.toggle("add", state.updateOpen);

    bookEl.querySelector(".tab-content")
        ?.classList.toggle("add", state.updateOpen);

    bookEl.querySelector(".admin-tab")
        ?.classList.toggle("add", state.updateOpen);
    
if (cacheBtn) {
    cacheBtn.textContent = state.inCache ? "Book Added!" : "Add To MyCache";
    cacheBtn.disabled = state.inCache; // disable if already in cache
}

    if (catList) {
        catList.classList.toggle("faded", !state.updateOpen);
        catList.style.display = state.updateOpen ? "flex" : "none";

        const checkboxes = catList.querySelectorAll('input[type="checkbox"]');

        checkboxes.forEach(cb => {
            const key = cb.value;
            
            if (key in state.category) {
                cb.checked = state.category[key];
            }
        });
    }

    bookEl.classList.toggle("in-cache", state.inCache);
    bookEl.classList.toggle("has-read", state.category.read);
    bookEl.classList.toggle("wishlisted", state.category.wishlist);
    bookEl.classList.toggle("favourite", state.category.favourite);

    ["read", "wishlist", "favourite"].forEach(key => {
        const indicator = bookEl.querySelector(`.indicator.${key}`);
        if(indicator) indicator.classList.toggle("true", state.category[key]);
    });
}

/**
 * Writes the book's genres, characters, and synopsis text into the supplied
 * detail container element.
 * @param {Book} book - The book whose details should be displayed.
 * @param {Element} container - The container element that holds the detail list items.
 */
function renderBookDetails(book, container) {
    container.querySelector(".genres").textContent = book.genres;
    container.querySelector(".characters").textContent = book.characters;
    container.querySelector(".synopsis").textContent = book.synopsis;
}

/**
 * Retrieves the UI state object for a book from `bookUIState`. If none exists,
 * a default state object is created, stored, and returned.
 * @param {string} bookId - The OpenLibrary work key of the book.
 * @returns {{id: string, updateOpen: boolean, selected: boolean, inCache: boolean, faded: boolean, category: {read: boolean, wishlist: boolean, favourite: boolean}}} The current UI state for the book.
 */
function getBookUIState(bookId) {
    if(!bookUIState.has(bookId)) {
        bookUIState.set(bookId, {
            id: bookId,
            updateOpen: false, // controls if the updatePane is open for this book including cat-list visibility
            selected: false, // shows if the book is currently selected (for update)
            inCache: myCacheStore.has(bookId), // shows if the book data is currently in myCacheStore
            faded: false, // shows if the book should be faded (used when added to myCache but updatePane not open yet)

            category: {
                read: false,
                wishlist: false,
                favourite: false
            }
});
    } return bookUIState.get(bookId);
}