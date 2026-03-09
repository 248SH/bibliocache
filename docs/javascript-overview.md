# JavaScript Overview — Project structure and guidance

This document explains the current JavaScript layout, responsibilities of each script, the main data flows (search → render → paginate), and recommendations for reorganizing and documenting the scripts so they are easier to work with.

Purpose
- Make it straightforward for a developer (or future-you) to find where behavior lives, how pagination/search works, and where to add features.
- Provide a small refactor plan to group related behavior and reduce duplication.

Repository scripts (current)
- `scripts/main.js`
  - Central app utilities, UI rendering helpers and a `PaginationSingleton` that is *authoritative* for pagination controls and state.
  - Declares `requestData` and many global helper functions (buildDownloads, updatePaginationControls, etc.).
  - Other modules call into the pagination logic via `setPagination` (a small helper we expose) so controls are uniform.

- `scripts/events.js`
  - High-level UI event wiring and pane control logic (showing/hiding `windowPane`, `admin-box`, switches for add/search/delete panes).
  - Handles main form submit for administrative flows and opens confirmation dialogs for delete/update.
  - Intended as the primary UI controller for user interactions.

- `scripts/javascript.js`
  - Contains `fetchAllBooks` (Open Library integration), helpers used to render `.book-shelf` elements for search results, and a few legacy functions (fetchBooks, changePage, etc.).
  - Was originally a standalone script for API examples and has accumulated DOM-manipulating logic.

- `scripts/pagination.js`
  - A copy / variant of the pagination singleton and click handlers (there is some overlap with `main.js`).
  - Exists in some form to give paginated behavior in other contexts; currently duplicated/overlapping with `main.js`.

- `scripts/books.js`
  - Contains book-specific utilities and possibly additional data handling (used by downloads/displays).

Why re-organize
- There are duplicate responsibilities in multiple files (pagination logic appears in both `main.js` and `pagination.js`).
- Event wiring and data-fetching are mixed across files, making it harder to reason about the control flow.
- A clearer separation will make it easier to test and extend (for example, adding more Open Library features or alternate data sources later).

Recommended structure (small refactor)

1. Create a `scripts/lib/` or `src/` folder (optional)
   - Move utility modules here. Example:
     - `src/pagination.js` — PaginationSingleton and UI functions (single source of truth)
     - `src/api/openlibrary.js` — Open Library client (fetchAllBooks and helpers to normalize docs)
     - `src/ui/renderer.js` — DOM rendering helpers (buildBooks, buildDownloads)
     - `src/ui/events.js` — High-level event wiring (calls into api and renderer)
   - Keep top-level `scripts/main.js` as boot/entry-point that wires the modules.

2. Reduce global state
   - Expose an application object instead of scattering `let requestData` across files. E.g., `window.App = { requestData: {}, currentQuery: '', currentDataSource: 'openlibrary' }` so scripts access `App` instead of separate globals.

3. Single pagination flow
   - Keep the `PaginationSingleton` in one module (move copy from `pagination.js` into `src/pagination.js`).
   - Other modules should call `PaginationSingleton.getInstance()` or a wrapper like `setPagination(totalPages, currentPage)`.

4. Centralize fetching
   - Put Open Library logic in `src/api/openlibrary.js` with a small API:
     - search(query, { page, limit }) → { docs, numFound }
     - normalizeDoc(doc) → Book shape
   - `fetchAllBooks` should become a thin wrapper that calls `openlibrary.search(...)`, normalizes results, and calls the renderer.

5. Tests and examples
   - Add a `scripts/dev-harness.js` (or small HTML test page) that allows quick ad-hoc searches (for development) and tests pagination.

Actionable mid-sized refactor plan (incremental)
1. Move pagination logic into `src/pagination.js` and export the `setPagination` helper. Update `main.js` and `javascript.js` to import/use this global (or access via `window` until real modules are in place).
2. Create `src/api/openlibrary.js` and implement `search(query, page, limit)`.
3. Move rendering functions from `javascript.js` into `src/ui/renderer.js` and make them pure-ish (take data, return DOM nodes or HTML strings).
4. Replace in-file inline calls with calls to these modules.
5. Remove duplicate `pagination.js` (or repurpose it into the new folder).

Small, safe improvements you can do now (I can implement any of the items below):
- Add a `window.App` object to hold `currentQuery`, `currentDataSource`, and `requestData` (safer than many globals).
- Make `fetchAllBooks` read `window.App.currentQuery` instead of a hard-coded query.
- Move the pagination implementation to a single file and ensure all callers call the same helper.

Documentation improvements
- I've added `docs/openlibrary-schema.md` with API fields and mapping guidance (useful while refactoring).
- I can add a `docs/js-file-map.md` summarizing the final file layout after a small refactor.

If you'd like, I can do the first small refactor now:
- Create `window.App` (global object) and update `fetchAllBooks` to use `App.currentQuery` (and set a default if missing).
- Make pagination calls always go to `fetchAllBooks` (already done).

Pick one of the small improvements and I'll implement it now (e.g., create `window.App` and wire `fetchAllBooks` to use `App.currentQuery`) or I can start the larger refactor and move files into `src/` as described.

---

Notes for contributors
- When adding new behavior, prefer to add small focused modules and keep side effects (DOM changes) isolated to a renderer module.
- Keep pagination state in PaginationSingleton and avoid multiple independent copies.

(End of JavaScript overview)
