/**
 * Opens the update pane for the selected book card, hides other cards, and
 * pre-fills update form fields with the selected book's current values.
 * @param {jQuery.Event} e - The click event from the update button.
 * @this {HTMLElement}
 * @returns {void}
 */
function handleUpdateBookClick(e) {
		e.preventDefault();
		$(this).attr("disabled", true);
		$('.pagination').fadeOut(500);
		const bookId = $(this).closest('.book');
		const dynamicId = bookId.data('id');
		console.log("Dynamic Book ID:", dynamicId);

		$('.book').each(function() {
			const thisBook = $(this);
			const thisBookId = thisBook.data('id');

			console.log("Checking thisBookId:", thisBookId, "against dynamicId:", dynamicId);

			if (thisBookId !== dynamicId) {
				thisBook.hide(500);
			} else {
				thisBook.show(500);
				const bookSelect = thisBook;

				console.log("Setting placeholder values...");

				let id = thisBookId;
				$('.updateList input[name="id"]').attr('value', id);
				console.log(id);

				let title = bookSelect.find('li.title').text();
				$('.updateList input[name="title"]').attr('value', title);

				let author = bookSelect.find('li.author').text();
				$('.updateList input[name="author"]').attr('value', author);

				let date = bookSelect.find('li.date').text();
				$('.updateList input[name="date"]').attr('value', date);

				let genres = bookSelect.find('li.genres').text();
				$('.updateList input[name="genres"]').attr('value', genres);

				let characters = bookSelect.find('li.characters').text();
				$('.updateList textarea[name="characters"]').val(characters);

				let synopsis = bookSelect.find('li.synopsis').text();
				$('.updateList textarea[name="synopsis"]').val(synopsis);

			}

		});

		$(".title, .author").toggleClass("update");
		$(".updatePane").stop(true, true).toggle("clip", { direction: "horizontal" }, 750);
	}

$(document).on('click', '#updateBook', handleUpdateBookClick);