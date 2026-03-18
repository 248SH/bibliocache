// api.js — Handles all OpenLibrary API calls and book data fetching

/**
 * Builds an OpenLibrary Search API URL from the requested field and query.
 * @param {string} query - The search term entered by the user.
 * @param {string} field - The field to search by (e.g. 'title', 'author', 'genres', 'date').
 * @param {number} page - The page number for paginated results.
 * @param {number} booksPerPage - The number of results to return per page.
 * @returns {string} The fully constructed search URL.
 */
function URLBuilder(query, field, page, booksPerPage) {

  switch (field) {
    case "title":
    case "author":
      return `https://openlibrary.org/search.json?${encodeURIComponent(field)}=${encodeURIComponent(query)}&page=${page}&limit=${booksPerPage}`;
    case "genres":
      return `https://openlibrary.org/search.json?subject=${encodeURIComponent(query)}&page=${page}&limit=${booksPerPage}`;
    case "characters":
      return `https://openlibrary.org/search.json?person=${encodeURIComponent(query)}&page=${page}&limit=${booksPerPage}`;
    case "synopsis":
      return `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&page=${page}&limit=${booksPerPage}`;
    case "date":
      return `https://openlibrary.org/search.json?q=${encodeURIComponent("first_publish_year:" + query)}&page=${page}&limit=${booksPerPage}`;
    default:
      console.warn("Unknown search field:", field);
      return `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&page=${page}&limit=${booksPerPage}`;
  }
}

/**
 * Fetches a list of books from the OpenLibrary search API.
 * Maps returned docs to {@link Book} instances, stores them in `bookStore`,
 * renders them to the UI, and updates pagination controls.
 * @async
 * @param {string} query - The search term.
 * @param {string} field - The field to search by (e.g. 'title', 'author', 'genres', 'date').
 * @param {number} [page=1] - The page number to fetch.
 * @param {number} [booksPerPage=40] - The number of results per page.
 * @returns {Promise<{books: Book[], numFound: number}>} The fetched books and total result count.
 */
async function fetchBookSummary(query, field, page = 1, booksPerPage = 40) {
  if (!field) field = "q";
  loadProgress(false);

  try {
    const url = URLBuilder(query, field, page, booksPerPage);
    const response = await fetch(url);
    if (!response.ok)
      throw new Error(`Search fetch failed: ${response.status}`);
    const data = await response.json();

    if (!data.docs || data.docs.length === 0) {
      showAlert(ALERTS.NO_RESULTS);
      return { books: [], numFound: 0 };
    }

    const books = (data.docs || []).map((doc) => {
      const book = new Book(
        doc.key ? doc.key.replace("/works/", "") : "",
        doc.title || "No Title Found",
        Array.isArray(doc.author_name)
          ? doc.author_name.join(", ")
          : doc.author_name || "No Authors Found",
        doc.first_publish_year || "No Publish Date Found",
        Array.isArray(doc.subjects)
          ? doc.subjects.join(", ")
          : doc.subjects || "No Genres Found",
        Array.isArray(doc.person)
          ? doc.person.join(", ")
          : doc.person || "No Characters Found",
        Array.isArray(doc.synopsis)
          ? doc.synopsis.join(", ")
          : doc.synopsis || "Loading synopsis...",
        doc.cover_i
          ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
          : null,
        null, // cover (assigned internally)
        null, // isbn (optional)
      );

      bookStore.set(book.id, book);
      return book;
    });

    renderBooks(books);
    $(".loading").addClass("faded");

    const totalPages = Math.ceil(data.numFound / booksPerPage);
    updatePaginationControls(totalPages, page);

    return { books, numFound: data.numFound };
  } catch (err) {
    console.error("Failed to fetch books:", err);
    showAlert(ALERTS.API_ERROR);
    return { books: [], numFound: 0 };
  }
}

/**
 * Fetches detailed metadata (description, genres, characters) for a single work
 * from the OpenLibrary Works API.
 * @async
 * @param {string} workKey - The OpenLibrary work key (e.g. 'OL12345W').
 * @returns {Promise<{description?: string, genres?: string, characters?: string}>}
 * The book's detailed metadata, or an empty object if the request fails.
 */
async function fetchBookDetails(workKey) {
  const response = await fetch(`https://openlibrary.org/works/${workKey}.json`);
  if (!response.ok) return {};

  const data = await response.json();

  return {
    description:
      typeof data.description === "string"
        ? data.description
        : (data.description?.value ?? "No Synopsis Found"),
    genres: data.subjects ? data.subjects.join(", ") : "No Genres Found",
    characters: data.subject_people
      ? data.subject_people.join(", ")
      : "No Characters Found",
  };
}

/**
 * Merges fetched detail data into the existing book entry in `bookStore`
 * and triggers a UI re-render for that book.
 * @param {string} workKey - The OpenLibrary work key identifying the book.
 * @param {{description?: string, genres?: string, characters?: string}} details - The detail data to merge.
 * @returns {void}
 */
function updateMyCacheBookDetails(workKey, details) {
  const book = bookStore.get(workKey);
  if (!book) return;

  book.synopsis = details.description;
  book.genres = details.genres;
  book.characters = details.characters;

  bookStore.set(workKey, book);
  renderBookUI(workKey);
}

/**
 * Returns a fully-detailed {@link Book} from `bookStore`, fetching and
 * merging missing details from the OpenLibrary Works API if necessary.
 * @async
 * @param {string} workKey - The OpenLibrary work key identifying the book.
 * @returns {Promise<Book|undefined>} The book with complete detail data, if found in `bookStore`.
 */
async function getBookDetailsFromMyCache(workKey) {
  const book = bookStore.get(workKey);
  if (book && book.synopsis && book.synopsis !== "Loading synopsis...") {
    return book;
  }

  const details = await fetchBookDetails(workKey);
  updateMyCacheBookDetails(workKey, details);
  return bookStore.get(workKey);
}

  /**
   * Saves the current MyCache session to `localStorage`, including each cached
   * book and its corresponding UI state.
   * @returns {void}
   */
function saveMyCacheSession() {
    const cacheData = Array.from(myCacheStore.entries()).map(([id, book]) => ({
        book,
        uiState: bookUIState.get(id)
    }));
    localStorage.setItem("myCache", JSON.stringify(cacheData));
    showAlert(ALERTS.SESSION_SAVED);
}

  /**
   * Loads a previously saved MyCache session from `localStorage` and restores
   * both cached books and per-book UI state into memory stores.
   * @returns {void}
   */
function loadMyCacheSession() {
    const sessionData = localStorage.getItem("myCache");
    if (!sessionData) return;
    const cacheData = JSON.parse(sessionData);
    cacheData.forEach(({ book, uiState }) => {
        const bookItem = Object.assign(new Book(), book);
        myCacheStore.set(bookItem.id, bookItem);
        bookUIState.set(bookItem.id, uiState);
    });
    showAlert(ALERTS.SESSION_LOADED);
}

  /**
   * Clears the persisted and in-memory MyCache session, resets cache UI state,
   * and refreshes MyCache pagination back to page 1.
   * @returns {void}
   */
function clearMyCacheSession() {
    if (!myCacheStore.size) return;
    localStorage.removeItem("myCache");
    myCacheStore.clear();
    bookUIState.clear();
    updateMyCachePagination(1);
    showAlert(ALERTS.SESSION_CLEARED);
}
