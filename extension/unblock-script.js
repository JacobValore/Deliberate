$(document).ready(function(){
	$('.t-inc.left').on("click", () => {
		inc(-10);
	});
	$('.t-inc.right').on("click", () => {
		inc(+10);
	});
	// $('.s-button').on("click", () => {
	// 	submit();
	// });
	$('.j-textarea').on('keyup', function() {
		var length = $(this).val().length;
		$('.j-cur-chars').text(length);
		if(length >= $('.j-min-chars').text()*1){
			$('.j-error-msg').addClass("hidden");
			$('.j-textarea').removeClass("error");
		}
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
	$('.j-textarea').bind('paste', (e) => {
	    e.preventDefault();
  	});
});

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

// function submit(){
// 	$('.s-button').blur();
// 	if($('.j-textarea').val().length < 200){
// 		$('.j-error-msg').removeClass("hidden");
// 		$('.j-textarea').addClass("error");
// 	}
// 	else{
// 		console.log("sending");
// 		chrome.runtime.sendMessage('faleafcoahdigncejihhjllmdagdlpjk',
// 									{reason: "AddUnblock",
// 									matchPattern: $(".w-site-name").text(),
// 									unblockLength: $(".t-time-input").val()*1});
// 	}
// }
