
const bookCover = new Map([
	["fantasy", 1],
	["adventure", 1],
	["classics", 2],
	["romance", 2],
	["comedy", 3],
	["mystery", 3],
	["crime", 4],
	["sci-fi", 4],
	["action", 5],
	["horror", 5],
	["thriller", 6],
	["science fiction", 6],
	["nonfiction", 7],
	["historical fiction", 7],
	["biography", 8],
	["graphic novels", 8],
	["young adult", 9],
	["history", 9],
	["children", 10],
	["fiction", 10],
	["", 11]
]);

class Book {
    /**
     * Creates a new Book instance.
     * @param {string} id - The OpenLibrary work key (e.g. 'OL12345W') used as a unique identifier.
     * @param {string} title - The book's title.
     * @param {string} author - Comma-separated list of author names.
     * @param {number|string} date - The first publish year of the book.
     * @param {string} genres - Comma-separated list of subjects/genres.
     * @param {string} characters - Comma-separated list of characters.
     * @param {string} synopsis - A short description or synopsis of the book.
     * @param {string|null} coverURL - URL to the book cover image from OpenLibrary, or null.
     * @param {string|null} isbn - The book's ISBN, or null if unavailable.
     */
    constructor(id, title, author, date, genres, characters, synopsis, coverURL, isbn) {
        this.id = id;
        this.title = title;
        this.author = author;
        this.date = date;
        this.genres = genres;
        this.characters = characters;
        this.synopsis = synopsis;
		this.coverURL = coverURL || null;
        this.isbn = isbn;
    }
}


