/**
 * Returns whether a books array has no entries.
 * @param {Book[]} books - The array of books to check.
 * @returns {boolean} True when the array is empty.
 */
const isListEmpty = (books) => books.length === 0;
const bookStore = new Map();
const myCacheStore = new Map();
const bookUIState = new Map();
const bookFilterCategories = new Map();

/**
 * Creates a delay promise that resolves after the supplied duration.
 * @param {number} ms - Delay duration in milliseconds.
 * @returns {Promise<void>} Resolves when the timeout completes.
 */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let selectedBooks = [];
let currentBlobURL = null;
let filename;
let fileMIME = "";
let downloadOpen = false;
let value;
let bookId;
let dynamicId;
let bookDataType;
let reduced = false;
let indexActive = true;

const booksPerPage = 40;

const ALERTS = {
  EMPTY_SEARCH: 1,
  INVALID_YEAR: 2,
  NO_RESULTS: 3,
  API_ERROR: 4,
  SESSION_SAVED: 5,
  SESSION_LOADED: 6,
  SESSION_CLEARED: 7,
};

const sortState = {
	field: 'title',
	direction: 'asc'
}

/**
 * Returns a sorted copy of the provided books array based on the global
 * `sortState` field and direction.
 * @param {Book[]} books - The books to sort.
 * @returns {Book[]} A new sorted array.
 */
function sortBooks(books) {
	return sorted = [...books].sort((a, b) => {
		const valA = a[sortState.field] || "";
		const valB = b[sortState.field] || "";
	if(sortState.field === 'date') {
		return sortState.direction === 'asc' 
		? parseInt(valA) - parseInt(valB) 
		: parseInt(valB) - parseInt(valA);
	}
	return sortState.direction === 'asc' 
	? valA.toString().localeCompare(valB.toString()) 
	: valB.toString().localeCompare(valA.toString());
});
}

$(document).on("click", "#sortBtn", function () {
	const field = $('#sortField').val();
	const direction = $('#sortDirection').val();
	const page = $("body").attr("data-page");

	sortState.field = field;
	sortState.direction = direction;

	if(page === 'search') {
    const sorted = sortBooks(Array.from(bookStore.values()));
    renderBooks(sorted);
} else if (page === 'myCache') {
		loadMyCacheBooks(1);
	}

	  $(".filterBox").fadeOut(100);
  const shelf = $(".book-shelf");

	if (shelf.hasClass("dimmed")) {
		shelf.removeClass("dimmed");
	}
});

console.log(window.navigator.userAgent);

/**
 * Escapes special HTML characters in a string to prevent XSS when injecting
 * API data into the DOM.
 * @param {string} str - The raw string to escape.
 * @returns {string} The HTML-escaped string, or an empty string if falsy.
 */
function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Hides all books except the target book, reveals the update pane, and
 * pre-fills the update form with the target book's current field values.
 * @param {jQuery} $book - A jQuery-wrapped `.book` element to open the update pane for.
 * @returns {void}
 */
function openUpdatePaneForBook($book) {
  $(".pagination").fadeOut(500);

  const dynamicId = $book.data("id");

  $(".book").each(function () {
    const $thisBook = $(this);
    const thisBookId = $thisBook.data("id");

    if (thisBookId !== dynamicId) {
      $thisBook.fadeOut(500);
    } else {
      $thisBook.fadeIn(500);

      $('.updateList input[name="id"]').val(thisBookId);
      $('.updateList input[name="title"]').val(
        $thisBook.find("li.title").text(),
      );
      $('.updateList input[name="author"]').val(
        $thisBook.find("li.author").text(),
      );
      $('.updateList input[name="date"]').val($thisBook.find("li.date").text());
      $('.updateList input[name="genres"]').val(
        $thisBook.find("li.genres").text(),
      );
      $('.updateList textarea[name="characters"]').val(
        $thisBook.find("li.characters").text(),
      );
      $('.updateList textarea[name="synopsis"]').val(
        $thisBook.find("li.synopsis").text(),
      );
    }
  });

  $(".title, .author").addClass("update");

  $(".updatePane")
    .stop(true, true)
    .toggle("clip", { direction: "horizontal" }, 750);
}

/**
 * Adds a book to the in-memory cache store (`myCacheStore`) keyed by its id.
 * Does nothing if the book is falsy.
 * @param {Book} book - The book to add to the cache.
 * @returns {void}
 */
function addBookToMyCache(book) {
  if (!book) return;
  myCacheStore.set(book.id, book);
}

/**
 * Removes a book from the in-memory MyCache store.
 * @param {string} bookId - The OpenLibrary work key to remove.
 * @returns {void}
 */
function removeBookFromMyCache(bookId) {
	if (!bookId) return;
	myCacheStore.delete(bookId);
}

/**
 * Handles submission of the main search form. Reads the search term and field
 * from `formData`, validates them, and initiates a book fetch if valid.
 * @param {Array<{name: string, value: string}>} formData - The serialized form data array from jQuery's `serializeArray()`.
 * @returns {void}
 */
function handleSearchSubmit(formData) {
  const paramItem = formData.find((i) => i.name === "search");
  const fieldItem = formData.find((i) => i.name === "bookData");

  if (!paramItem || !fieldItem) {
    showAlert(ALERTS.EMPTY_SEARCH);
    return;
  }

  const error = validateFormInput({
    name: fieldItem.value,
    value: paramItem.value,
  });

  if (error) {
    showAlert(error);
    return;
  }

  fetchBookSummary(paramItem.value.trim(), fieldItem.value.trim(), 1);
}

/**
 * Handles submission of the MyCache form by triggering the MyCache book loader.
 * @returns {void}
 */
function handleMyCacheSubmit() {
  loadMyCacheBooks();
}

const formSubmitHandlers = {
  search: handleSearchSubmit,
  myCache: handleMyCacheSubmit,
  home: () => {
  },
};

const pageScripts = {
  home: runHomeLoad,
  search: runSearchLoad,
  myCache: runMyCacheLoad,
};

/**
 * Sets the current page context on the `<body>` data attribute and runs the
 * corresponding page initialisation script from `pageScripts` if one exists.
 * @param {string} page - The page key (e.g. 'home', 'search', 'myCache').
 * @returns {void}
 */
function setPageData(page) {
  $("body").attr("data-page", page);
  if (pageScripts[page]) {
    pageScripts[page]();
  } else {
    console.warn("No specific scripts for page:", page);
  }
}

/**
 * Initialises the home page: starts the loading progress bar, switches the
 * pane to the welcome view, and injects the hidden fetch form.
 * @param {Event} [e] - The optional event that triggered the page load.
 * @returns {void}
 */
function runHomeLoad(e) {
  loadProgress();
  switchPane(
    {
      colour: "#F7A072",
      title: "Welcome to Biblio-Cache!",
      text: "",
      textContent:
        "Browse, Search, and Build your digital book collection. Start by viewing the full library below.",
      input: "#bookShelf",
    },
    e,
  );
  $(".input-list").html(
    `<div id="fetch" class="input-form"><input type="hidden" name="allBoolean" value="true"></div>`,
  );
  $(".pc-image").delay(1000).removeClass("fade");
}

/**
 * Initialises the search page: switches the pane to the search view and injects
 * the search form HTML into the input list container.
 * @param {Event} [e] - The optional event that triggered the page load.
 * @returns {void}
 */
function runSearchLoad(e) {
  switchPane(
    {
      colour: "var(--color-green)",
      title: "Search The Library",
      text: "",
      textContent: "Use the form below to browse the Library",
      input: "#search",
    },
    e,
  );

  $(".book-shelf").html("");
  $(".input-list").html(`		<div id="search" class="input-form">
		<select class="form-select form-select-sm" name="bookData"
			id="bookData">
			<option disabled selected>Search by...</option>
			<option value="title">Title</option>
			<option value="author">Author</option>
			<option value="date">Date Published</option>
			<option value="genres">Genres</option>
			<option value="characters">Characters</option>
			<option value="synopsis">Synopsis</option>
		</select> <br class="break"> <input type="hidden" name="requestType"
			value="GET"> <input
			class="form-control form-control-sm" type="text"
			name="search" placeholder="Enter search parameter here...">
		<br class="break">
	</div>`);
  $(".pc-image").delay(1000).removeClass("fade");
}

/**
 * Validates user-provided form input for the search form.
 * Checks that the value is non-empty and, for date searches, that it is a
 * valid four-digit year.
 * @param {{name: string, value: string}} input - Object containing the field name and entered value.
 * @returns {number|null} An `ALERTS` constant if invalid, or `null` if valid.
 */
function validateFormInput({ name, value }) {
  if (!name) return ALERTS.EMPTY_SEARCH;

  const trimmed = (value || "").trim();

  switch (name) {
    case "title":
    case "author":
    case "genres":
    case "characters":
    case "synopsis":
      if (!trimmed) return ALERTS.EMPTY_SEARCH;
      break;

    case "date":
      if (!trimmed) return ALERTS.EMPTY_SEARCH;
      if (!/^\d{4}$/.test(trimmed)) return ALERTS.INVALID_YEAR;
      break;
  }

  return null;
}

/**
 * Initialises the MyCache page: switches the pane to the cache view, clears
 * the book shelf, and injects the hidden fetch form.
 * @param {Event} [e] - The optional event that triggered the page load.
 * @returns {void}
 */
function runMyCacheLoad(e) {
  switchPane(
    {
      colour: "#F7A072",
      title: "MyCache",
      text: "",
      textContent:
        "MyCache is your digital book collection, here you can browse your saved books, change the status, make a wishlist and more!",
      input: "#bookShelf",
      btnText: "Open MyCache",
    },
    e,
  );
  $(".book-shelf").html("");
  $(".input-list").html(
    `<div id="fetch" class="input-form"><input type="hidden" name="allBoolean" value="true"></div>`,
  );
  $(".pc-image").delay(1000).removeClass("fade");
}

/**
 * Reads all books from `myCacheStore`, slices the correct page, and renders
 * them to the shelf along with updated pagination controls.
 * @param {number} [page=1] - The 1-based page number to display.
 * @returns {void}
 */
function loadMyCacheBooks(page = 1) {

  const books = sortBooks(Array.from(myCacheStore.values()));

  const start = (page - 1) * booksPerPage;
  const end = start + booksPerPage;

  books.forEach((book) => {
	const uiState = getBookUIState(book.id);
	uiState.updateOpen = false;
	uiState.selected = false;
  })

  renderBooks(books.slice(start, end));
  updateMyCachePagination(page);
}

/**
 * Generic form submission handler for `.form` elements. Validates that the
 * submitted form includes a `requestType` input and logs a warning when it
 * is missing.
 * @param {SubmitEvent} event - The form submit event.
 * @returns {void}
 */
function formHandler(event) {
  event.preventDefault();

  const rtInput =
    event && event.target
      ? event.target.querySelector('input[name="requestType"]')
      : null;
  if (!rtInput) {
    console.warn(
      "formHandler: requestType input not found on submitted form",
      event && event.target,
    );
    return;
  }
  const requestType = rtInput.value;
  // let format;
  const formId = event && event.target ? event.target.id : "";
}

/* EVENT HANDLERS */

// --- Page & Form Events ---

$(window).on("load", function (e) {
  const page = $("body").attr("data-page");
  if (page && pageScripts[page]) {
    pageScripts[page](e);
  }
});

$("#mainForm").on("submit", function (e) {
  e.preventDefault();

  const page = $("body").attr("data-page") || "home";
  const handler = formSubmitHandlers[page];

  if (!handler) {
    console.warn("No submit handler for page:", page);
    return;
  }

  const formData = $(this).serializeArray();
  handler(formData, e);
});

document.addEventListener("DOMContentLoaded", function () {
  const forms = document.querySelectorAll(".form");
  if (forms && forms.length) {
    forms.forEach((f) =>
      f.addEventListener("submit", function (event) {
        event.preventDefault();
        formHandler(event);
      }),
    );
  }

  const formLinks = document.querySelectorAll(".formLink");
  if (formLinks && formLinks.length) {
    formLinks.forEach((f) =>
      f.addEventListener("submit", function (event) {
        event.preventDefault();
      }),
    );
  }
});

// --- Navigation Events ---

$(".formLink").on("click", function (e) {
  e.preventDefault();
  const page = $(this).data("page");
  leaveLandingPage().then(() => containerSwitch(page));
});

$(document).on("click", "#saveSession", function (e) {
  saveMyCacheSession();
  console.warn("MyCache contents at save:", Array.from(myCacheStore.keys()));
});

$(document).on("click", "#loadSession", function (e) {
  loadMyCacheSession();
  console.warn("MyCache contents after load:", Array.from(myCacheStore.keys()));	
});

$(document).on("click", "#clearSession", function (e) {
  clearMyCacheSession();
  console.warn("MyCache contents after clear:", Array.from(myCacheStore.keys()));
});

// --- Book Events ---

document.addEventListener("click", async (e) => {
  const detailsBtn = e.target.closest(".details-tab");
  const myCacheBtn = e.target.closest(".addBookCache");
  const catListCheckbox = e.target.closest(".cat-list input[type='checkbox']");
  const catListItem = e.target.closest(".cat-list li:not(.list-header)");

  // Show book details
  if (detailsBtn) {
    const bookEl = detailsBtn.closest(".book");
    const workKey = bookEl.dataset.id;
    const targetPane = detailsBtn.dataset.bsTarget;
    const container = document.querySelector(targetPane);

    const book = await getBookDetailsFromMyCache(workKey);
    renderBookDetails(book, container);
  }

  // Add book to MyCache
  if (myCacheBtn) {
    const bookEl = myCacheBtn.closest(".book");
    const workKey = bookEl.dataset.id;
	if (!myCacheBtn.classList.contains("remove")) {

    const book = await getBookDetailsFromMyCache(workKey);

    // Add to MyCache store
    addBookToMyCache(book);

    // Update UI state
    const uiState = getBookUIState(workKey);
    uiState.inCache = true;
    uiState.updateOpen = true;
    uiState.selected = true;
    renderBookUI(workKey);

    renderBookDetails(book, bookEl);
    updatePaneSwitch(book);

    console.warn("MyCache contents:", Array.from(myCacheStore.keys()));
  } else if (myCacheBtn.classList.contains("remove")) {
	removeBookFromMyCache(workKey);

	// Update UI state
	const uiState = getBookUIState(workKey);
	uiState.inCache = false;
	uiState.updateOpen = false;
	uiState.selected = false;
	uiState.category = {
		read: false,
		wishlist: false,
		favourite: false,
	}
	renderBookUI(workKey);
  }
}


  // Handle category checkboxes
  if (catListCheckbox) {
    const bookEl = catListCheckbox.closest(".book");
    const book = bookStore.get(bookEl.dataset.id);
    if (!book) return;

    const category = catListCheckbox.value;
    const validCategories = ["read", "wishlist", "favourite"];
    if (!validCategories.includes(category)) {
      console.warn("Invalid category checkbox:", category);
      return;
    }

    const uiState = getBookUIState(book.id);
    uiState.category[category] = catListCheckbox.checked;
    renderBookUI(book.id);
  }

  if (catListItem && !catListCheckbox) {
	const checkbox = catListItem.querySelector("input[type='checkbox']");
	if (checkbox) {
		checkbox.click();
	}
  }
});

$(document).on('click', '#filterBtn', function () {
	$('.filterBox').fadeIn(300);
	const shelf = $(".book-shelf");

	if (!shelf.hasClass("dimmed")) {
		shelf.addClass("dimmed");
	}
});

$(document).on("click", "#filter-bar .close", function () {
  $(".filterBox").fadeOut(100);
  const shelf = $(".book-shelf");

	if (shelf.hasClass("dimmed")) {
		shelf.removeClass("dimmed");
	}
});

document.addEventListener("change", (e) => {
  if (!e.target.matches(".cat-list input[type='checkbox']")) return;

  const checkbox = e.target;
  const bookEl = checkbox.closest(".book");
  const bookId = bookEl.dataset.id;
  const state = getBookUIState(bookId);
  const key = checkbox.value;
  const isChecked = checkbox.checked;

  state.category[key] = isChecked;
  renderBookUI(bookId);
});

$(".alertBox").draggable({
  handle: "#alert-bar",
});

// --- Dialog & Alert Events ---

$(document).on("click", "#cancel, #alert-bar .close", function (e) {
  e.preventDefault();
  $(".alertBox").fadeOut(500, function () {
    $(".background").addClass("faded");
  });
  $(".loading").addClass("faded");
});

$(document).on("click", "#update-bar .dots.close", function (e) {
  e.preventDefault();
  $(".updatePane")
    .stop(true, true)
    .hide("clip", { direction: "horizontal" }, 750, function () {
      $("button#updateBook").attr("disabled", false);
      $(".title, .author").removeClass("update");
      $(".book").fadeIn(500).removeClass("faded");
      $(".pagination").fadeIn(500);
      const book = $(".book").filter(".selected");
      const bookId = book.data("id");
      const uiState = getBookUIState(bookId);
      uiState.updateOpen = false;
      uiState.selected = false;
      renderBookUI(bookId);
    });
});

$(document).on("click", "#box-bar .close", function () {
  $(".windowPane").fadeOut(100);
  $(".title, .author").removeClass("update");
  $(".updatePane").hide(100);
  $(".pagination").fadeIn(500);
  const book = $(".book").filter(".selected");
  const bookId = book.data("id");
  const uiState = getBookUIState(bookId);
  uiState.updateOpen = false;
  uiState.selected = false;
  renderBookUI(bookId);
  clearPaginationControls();
});
