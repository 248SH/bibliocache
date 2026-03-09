// ui.js — Handles alerts, dialogs, loading bar and page/pane switching

/**
 * Displays a predefined alert message in the `.alertBox` element based on
 * the supplied alert type constant.
 * @param {number} type - One of the `ALERTS` constants (e.g. `ALERTS.EMPTY_SEARCH`).
 */
function showAlert(type) {
  const alertBox = document.querySelector(".alertBox");
  const header = alertBox.querySelector("h1");
  const paragraph = alertBox.querySelector("p");

  switch (type) {
    case ALERTS.EMPTY_SEARCH:
      header.textContent = "Invalid Search";
      paragraph.textContent = "Please enter a search term and select a field.";
      break;

    case ALERTS.INVALID_YEAR:
      header.textContent = "Invalid Year";
      paragraph.textContent = "Please enter a valid year in YYYY format.";
      break;

    case ALERTS.NO_RESULTS:
      header.textContent = "No Results Found";
      paragraph.textContent = "Try a different search term or field.";
      break;

    case ALERTS.API_ERROR:
      header.textContent = "Service Error";
      paragraph.textContent =
        "We couldn’t reach Open Library. Please try again later.";
      break;

    default:
      console.warn("Unknown alert type:", type);
      return;
  }

  $(".alertBox").fadeIn(300);
  $(".background").removeClass("faded");
}

/**
 * Injects arbitrary HTML into the `.alertBox` and toggles it visible.
 * Optionally attaches a book id and type to the confirm button for
 * downstream delete/confirm handlers.
 * @param {string} value - The HTML string to inject into the alert box.
 * @param {string|null} bookId - The id of the book the dialog is acting on, or null.
 * @param {string|null} type - The book data type, or null.
 */
function alertDialog(value, bookId, type) {
  $(".background").removeClass("faded");
  $(".alertBox").html(value).toggle("fade", 500);
  if (bookId != null && type != null) {
    $(".alertBox #confirm").attr("data-book-id", bookId);
    $(".alertBox #confirm").attr("data-book-type", type);
  } else {
    console.log("Error thrown");
  }
}

/**
 * Animates the Bootstrap progress bar from 0% to 100%.
 * Optionally auto-hides the loading container when the animation completes.
 * @param {boolean} [autoHide=true] - When true, fades out the loading container after completion.
 */
function loadProgress(autoHide = true) {
  const bar = $(".progress-bar");

  bar.stop(true, true); // Clear any old queue
  bar.css({ width: "0%" });
  bar.data("aria-valuenow", 0);

  $(".loading").removeClass("faded");
  const containerWidth = $(".progress").width();

  bar.data("aria-valuenow", 10).css("width", "10%");

  bar
    .animate(
      { width: containerWidth * 0.1 },
      {
        duration: 500,
        easing: "swing",
        complete: () => bar.data("aria-valuenow", 50),
      },
    )
    .delay(150)
    .animate(
      { width: containerWidth * 0.8 },
      {
        duration: 500,
        easing: "swing",
        complete: () => bar.data("aria-valuenow", 80),
      },
    )
    .delay(150)
    .animate(
      { width: containerWidth * 1.0 },
      {
        duration: 500,
        easing: "swing",
        complete: () => bar.data("aria-valuenow", 100),
      },
    );

  if (autoHide) {
    bar.promise().done(() => {
      setTimeout(() => {
        $(".loading").addClass("faded");
      }, 300);
    });
  }
}

/**
 * Animates the landing page text out and collapses the welcome section,
 * then triggers `reduceHeader`. Resolves immediately if the landing page
 * has already been left.
 * @returns {Promise<void>} Resolves once the leave animation is complete.
 */
function leaveLandingPage() {
  if (!indexActive) return Promise.resolve();
  console.log("Leaving landing page");

  const welcome = $(".welcome.index");
  const text = welcome.find("p");

  return new Promise((resolve) => {
    text.addClass("faded");
    welcome.addClass("collapsing");

    welcome.one("transitionend", () => {
      reduceHeader().then(() => {
        indexActive = false;
        resolve();
      });
    });
  });
}

/**
 * Updates the visible pane's title, tagline, body text, and submit button
 * label based on the supplied options. Only runs after `reduceHeader` completes.
 * @param {{colour?: string, title?: string, text?: string, textContent?: string, input?: string|null, btnText?: string}} options - Display options for the pane.
 * @param {Event} [e] - The optional event that triggered the pane switch.
 */
function switchPane(options, e) {
  if (!indexActive) {
    reduceHeader().then(() => {
      console.log("Switching Pane using parameters:", options);

      const {
        colour = "#F7A072",
        title = "",
        text = "",
        textContent = "",
        input = null,
        btnText = "Submit",
      } = options;

      $(".btn-submit").text(btnText);
      $(".formTitle").html(title);
      $(".formTagLine").html(text);
      $(".content").html(textContent);
    });
  }
}

/**
 * Collapses the index-size header to its compact form and removes the `.index`
 * class from navigation links. Resolves immediately if already reduced.
 * @returns {Promise<void>} Resolves once the shrink animation is complete.
 */
function reduceHeader() {
  if (reduced) return Promise.resolve();

  console.log("Reducing Header");

  $(".container").removeClass("index");

  return new Promise((resolve) => {
    $("h1.index").addClass("small");
    $("h2.index").addClass("small");

    $(".pc-image")
      .delay(500)
      .removeClass("fade")
      .promise()
      .done(() => {
        reduced = true;
        $(".formLink").removeClass("index");
        resolve();
      });
  });
}

/**
 * Slides the admin box up, fades the form container out and back in, then
 * slides the admin box down again before calling `setPageData` for the
 * target page.
 * @param {string} page - The page key to activate after the animation (e.g. 'home', 'search', 'myCache').
 * @returns {Promise<void>} Resolves once all animations have completed.
 */
function containerSwitch(page) {
  const adminBox = $(".admin-box");
  const formContainer = $(".form-container");

  return new Promise((resolve) => {
    adminBox.slideUp(500, () => {
      formContainer.fadeOut(300, () => {
        formContainer.fadeIn(300, () => {
          adminBox.slideDown(500, () => {
            setPageData(page);
            resolve();
          });
        });
      });
    });
  });
}
