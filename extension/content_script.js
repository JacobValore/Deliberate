$.get(chrome.runtime.getURL('./unblock.html'), (data) => {
	//Replace webpage with block page
	document.open("text/html","replace");
	document.write(data);
	document.close();
	//setTimeout 0 to wait for document to update before trying to set the url text
	setTimeout(function(){
		if($('.w-site-name').length === 0){
			$(document).arrive('.w-site-name', () => {
				init();
			});
		} else{
			init();
		}
	},0);
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
	$(document).unbindArrive();
}
