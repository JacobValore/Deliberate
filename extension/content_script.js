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
	// Setup match pattern text
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
	// Setup character limit and time limit variables
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
	// Input Events
	$('.t-inc.left').on("click", () => {
		inc(-10);
	});
	$('.t-inc.right').on("click", () => {
		inc(+10);
	});
	$('.t-time-input').on('focusout', function() {
		var value = $(this).val()*1;
		if(value < 5)
			$(this).val(5);
		else if(value > $('.max_time_limit_val').html()*1)
			$(this).val($('.max_time_limit_val').html()*1);
		else
			$(this).val( Math.round(value) );
	});
	$('.j-textarea').on('keyup', function() {
		var length = $(this).val().length;
		$('.j-cur-chars').text(length);
		if(length >= $('.j-min-chars').text()*1){
			$('.j-error-msg').addClass("hidden");
			$('.j-textarea').removeClass("error");
		}
	});
	$('.j-textarea').bind('paste', (e) => {
	    e.preventDefault();
	});
}

function inc(num){
	var newVal = +$(".t-time-input").val()+num
	if(newVal <= 5)
		$(".t-time-input").val(5);
	else if(newVal > $('.max_time_limit_val').html()*1)
		$(".t-time-input").val($('.max_time_limit_val').html()*1);
	else{
		$('.t-time-input').removeClass("error");
		$(".t-time-input").val( +$(".t-time-input").val()+num );
	}
}
