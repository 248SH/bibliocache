# BiblioCache

A browser-based digital book library built with vanilla JavaScript and jQuery, powered by the OpenLibrary API. Users can search for books by title, author, genre, date, characters, or synopsis keywords, and save results to a personal collection called MyCache. Books can be organised into categories such as Read, Wishlist, or Favourite, and collections persist between sessions using localStorage.

![BiblioCache Screenshot](assets/screenshot.png)

**[Live Demo](#)** — replace with GitHub Pages link

---

## Tech Stack

Vanilla JavaScript, jQuery, jQuery UI, Bootstrap 5, OpenLibrary API, HTML5, CSS3

---

## Features

- Search the OpenLibrary catalogue by title, author, genre, publish date, characters, or synopsis
- Paginated results with book cover art, synopsis, and subject details
- Save books to MyCache and categorise them as Read, Wishlist, or Favourite
- Sort results by title, author, or date in ascending or descending order
- Session persistence via localStorage — save, load, and clear your collection between visits
- Draggable alert dialogs and animated UI transitions using jQuery and jQuery UI
- Safari-compatible loading animation with automatic fallback

---

## Running Locally

No build tools or server required — BiblioCache is a fully static site.

1. Clone the repository
2. Open `index.html` in your browser

---

## Architecture

The codebase is split into focused modules:

- `books.js` — Book class and data structure
- `api.js` — OpenLibrary API calls, data mapping, and localStorage session management
- `render.js` — Book rendering and UI state management
- `pagination.js` — Pagination controls
- `ui.js` — Alerts, dialogs, loading bar, and pane switching
- `main.js` — Event handlers, routing, sorting, and MyCache logic

jQuery is used for animations and UI interactions — everything else uses vanilla JavaScript.

---

## Known Limitations

- BiblioCache is designed for desktop viewing — mobile support is planned for a future update
- Sort and filter functionality applies to the current page of results only, due to the OpenLibrary API returning results one page at a time
- Full filter functionality is planned for a future update once a backend proxy can be added to work around OpenLibrary CORS restrictions

---

*Built as a portfolio project — March 2026*