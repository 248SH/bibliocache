# Open Library — search.json schema (reference)

This file documents the important request parameters and response structure for the Open Library search API endpoint used in this project.

> Endpoint

- GET https://openlibrary.org/search.json

Query parameters (most useful)
- q (string) — search query (required for useful results). Example: `q=harry+potter`.
- page (integer) — 1-based page number. Example: `page=2`.
- limit (integer) — number of results per page (Open Library supports this parameter; use it to match your UI's page size). Example: `limit=40`.
- fields (string) — optional comma-separated list of fields to request (reduces payload size if supported).
- mode, author, title, subject, etc. — there are other advanced options (see Open Library docs); `q` is the general-purpose search.

Response (top-level JSON)

The search endpoint returns JSON with the following important properties:

- numFound (integer) — total number of matching records for the query.
- start (integer) — offset of the first returned document (0-based).
- docs (array) — array of document objects. Each element contains data about a book/work/edition. This is the main array you will map into UI items.

Example minimal response shape

```json
{
  "numFound": 12345,
  "start": 0,
  "docs": [
    {
      "key": "/works/OL12345W",
      "title": "Book Title",
      "author_name": ["Author Name"],
      "first_publish_year": 1999,
      "publish_year": [1999, 2001],
      "edition_key": ["OL123M", "OL456M"],
      "cover_i": 8245321,
      "subject": ["Fantasy", "Adventure"],
      "person": ["Character One", "Character Two"],
      "first_sentence": ["First sentence text..."]
    }
  ]
}
```

Common fields you may want to use in the UI
- key (string) — canonical work key or document key; useful as unique id.
- title (string)
- author_name (array of strings) — authors; join with `, ` for display.
- first_publish_year (integer)
- publish_year (array of integers)
- edition_key (array of edition keys)
- cover_i (integer) — cover id (see cover image URLs below).
- subject (array) — topics/genres; can be long; trim for UI.
- person (array) — characters or people mentioned.
- first_sentence (string or array) — short excerpt; sometimes missing.

Cover images
- Use the Open Library Covers API to build image URLs from `cover_i` (or `isbn`/`olid`):
  - https://covers.openlibrary.org/b/id/<coverId>-S.jpg (small)
  - https://covers.openlibrary.org/b/id/<coverId>-M.jpg (medium)
  - https://covers.openlibrary.org/b/id/<coverId>-L.jpg (large)

Pagination notes
- Use `numFound` and your `limit` (or docs.length if no limit) to compute total pages:
  - totalPages = Math.ceil(numFound / limit)
- The `page` parameter is 1-based. To fetch page N, call `?q=...&page=N&limit=<pageSize>`.

Errors and content type
- Normal successful responses return JSON (Content-Type: application/json).
- In case the server fails it may return HTML (an error page) with 500 status. Your client should detect non-OK status and/or `Content-Type` that does not include `application/json` and handle gracefully (log body, show a user-friendly message, fall back to a safer query).

Rate-limits and best practices
- Be polite: avoid wide wildcard queries like `q=*` which may cause large/expensive server operations and in some cases return errors.
- Cache results where possible, and limit how often you request popular queries.

Mapping advice for this project
- Normalize a `doc` to your UI `Book` shape with these fields:
  - id: prefer `doc.key` or `doc.cover_edition_key` or `doc.edition_key[0]`.
  - title: `doc.title`
  - author: join `doc.author_name`
  - date: `doc.first_publish_year`
  - genres: join `doc.subject` (take first few)
  - characters: join `doc.person`
  - synopsis: `doc.first_sentence` (or blank)
  - coverId: `doc.cover_i`

Links
- Open Library Search API docs: https://openlibrary.org/dev/docs/api/search
- Covers API: https://openlibrary.org/dev/docs/api/covers

---

(End of Open Library search.json schema reference)
