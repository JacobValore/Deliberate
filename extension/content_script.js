$.get(chrome.runtime.getURL('./unblock.html'), (data) => {
	//Find extension ID and replace it in the file
	data = data.replaceAll('EXT_ID', chrome.runtime.id);
	//Create the new DOM Node document of the "unblock" page
	html = (new DOMParser()).parseFromString(data, "text/html").firstChild;
	//Replace webpage with the new document
	document.replaceChild(html, document.documentElement);
	//Initialize url text and options
	init();
});

function init(){
	chrome.runtime.sendMessage({reason: "GetMatchPattern"}, (response) => {
		$(".w-site-name").text(response.matchPattern);
		($('.s-button')[0]).onclick = () => {
			$('.s-button').blur();
			if($('.j-textarea').val().length < $('.min_char_limit_val').html()*1){
				$('.j-error-msg').removeClass("hidden");
				$('.j-textarea').addClass("error");
			} else {
				chrome.runtime.sendMessage({reason: "AddUnblock",
					matchPattern: $(".w-site-name").text(),
					unblockLength: $(".t-time-input").val()*1});
				location.reload();
			}
		};
	});
	chrome.storage.local.get(['options'], (results) => {
		if(results.options.min_char_limit_bool){
			$('.min_char_limit_val').html(results.options.min_char_limit_val);
			$('.j-min-chars').text(""+results.options.min_char_limit_val);
		} else {
			$('.j-char-count').addClass('hidden');
		}
		if(results.options.max_time_limit_bool){
			$('.max_time_limit_val').html(results.options.max_time_limit_val);
		}
	});
}
