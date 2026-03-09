// api.js — Handles all OpenLibrary API calls and book data fetching

/**
 * Builds an OpenLibrary search API URL based on the search field.
 * @param {string} query - The search term entered by the user.
 * @param {string} field - The field to search by (e.g. 'title', 'author', 'genres', 'date').
 * @param {number} page - The page number for paginated results.
 * @param {number} booksPerPage - The number of results to return per page.
 * @returns {string} The fully constructed OpenLibrary API URL.
 */
function URLBuilder(query, field, page, booksPerPage) {
  console.log("Building URL for query:", query, "field:", field);

  switch (field) {
    case "title":
    case "author":
      console.log("Title/Author search detected");
      return `https://openlibrary.org/search.json?${encodeURIComponent(field)}=${encodeURIComponent(query)}&page=${page}&limit=${booksPerPage}`;
    case "genres":
      console.log("Genre search detected");
      return `https://openlibrary.org/search.json?subject=${encodeURIComponent(query)}&page=${page}&limit=${booksPerPage}`;
    case "characters":
      console.log("Character search detected");
      return `https://openlibrary.org/search.json?person=${encodeURIComponent(query)}&page=${page}&limit=${booksPerPage}`;
    case "synopsis":
      console.log("Synopsis search detected");
      return `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&page=${page}&limit=${booksPerPage}`;
    case "date":
      console.log("Date search detected");
      // Use q=first_publish_year:YEAR to mimic website
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
 * @param {string} field - The field to search by (e.g. 'title', 'author').
 * @param {number} [page=1] - The page number to fetch.
 * @param {number} [booksPerPage=40] - The number of results per page.
 * @returns {Promise<{books: Book[], numFound: number}>} The fetched books and total result count.
 */
async function fetchBookSummary(query, field, page = 1, booksPerPage = 40) {
  if (!field) field = "q";
  loadProgress(false);

  try {
    const url = URLBuilder(query, field, page, booksPerPage);
    // const headers = {
    //     "User-Agent": "BiblioCache/1.0 (bibliocache@outlook.com)"
    // }

    // const options = {
    //     method: "GET",
    //     headers: headers
    // }

    const response = await fetch(url);
    if (!response.ok)
      throw new Error(`Search fetch failed: ${response.status}`);
    const data = await response.json();

    console.log("Search results data:", data);

    if (!data.docs || data.docs.length === 0) {
      showAlert(ALERTS.NO_RESULTS);
      return { books: [], numFound: 0 };
    }

    console.log("Books data: ", data.docs);
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
 * @returns {Promise<{description: string, genres: string, characters: string}>} The book's detailed metadata.
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
 * @param {{description: string, genres: string, characters: string}} details - The detail data to merge.
 */
function updateMyCacheBookDetails(workKey, details) {
  const book = bookStore.get(workKey);
  if (!book) return;

  book.synopsis = details.description;
  book.genres = details.genres;
  book.characters = details.characters;

  bookStore.set(workKey, book);

  // const uiState = getBookUIState(workKey);
  // uiState.inCache = true;  // mark as in cache
  renderBookUI(workKey);
}

/**
 * Returns a fully-detailed {@link Book} from `bookStore`, fetching and
 * merging missing details from the OpenLibrary Works API if necessary.
 * @async
 * @param {string} workKey - The OpenLibrary work key identifying the book.
 * @returns {Promise<Book>} The book with complete detail data.
 */
async function getBookDetailsFromMyCache(workKey) {
  const book = bookStore.get(workKey);
  if (book && book.synopsis && book.synopsis !== "Loading synopsis...") {
    return book; // already fetched
  }

  const details = await fetchBookDetails(workKey);
  updateMyCacheBookDetails(workKey, details);
  return bookStore.get(workKey);
}
