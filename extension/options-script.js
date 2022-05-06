$(document).ready(function(){
	chrome.storage.local.get(['blocked_sites','options'], function(result){
		$('.w-list').html(result.blocked_sites.join("\n"));
		$('.s-char-cb').prop("checked", result.options.min_char_limit_bool);
		$('.s-time-cb').prop("checked", result.options.max_time_limit_bool);
		$('.s-char-val').val(result.options.min_char_limit_val);
		$('.s-time-val').val(result.options.max_time_limit_val);
	});

	$('.s-char-cb').on('change', function () {
		chrome.runtime.sendMessage({reason: "SetOption",
			option_key: 'min_char_limit_bool',
			option_val: $(this).is(':checked')});
		console.log("print this");
	});
	$('.s-time-cb').on('change', function () {
		chrome.runtime.sendMessage({reason: "SetOption",
			option_key: 'max_time_limit_bool',
			option_val: $(this).is(':checked')});
	});
	$('.s-char-val').on('focusout', function () {
		var value = $(this).val()*1;
		if(value < 1)
			$(this).val(1);
		else
			$(this).val( Math.round(value) );
		chrome.runtime.sendMessage({reason: "SetOption",
			option_key: 'min_char_limit_val',
			option_val: $(this).val()});
	});
	$('.s-time-val').on('focusout', function () {
		var value = $(this).val()*1;
		if(value < 5)
			$(this).val(5);
		else if(value > 1440)
			$(this).val(1440);
		else
			$(this).val( Math.round(value) );
		chrome.runtime.sendMessage({reason: "SetOption",
			option_key: 'max_time_limit_val',
			option_val: $(this).val()});
	});
	$('.wh-a').on("click", addWebsiteBlock);
	$('.wh-r').on("click", removeWebsiteBlock);
	//DEPRECATED: Application Blocking
	// $('.bt-w').on("click", () => { tab('.b-web'); });
	// $('.bt-a').on("click", () => { tab('.b-app'); });
	// $('.ah-a').on("click", addApplicationBlock);
	// $('.ah-r').on("click", removeApplicationBlock);
});

// DEPRECATED: Application Blocking
// function tab(selector){
// 	$(".active").removeClass("active")
// 	$(selector).addClass("active")
// }

function addWebsiteBlock(){
	if(!isValidURLMatchPattern($('.w-input').val())){
		//Do an error message
		return;
	}
	chrome.runtime.sendMessage({reason: "AddBlock", matchPattern: $('.w-input').val()});
	var lines = $('.w-list').html().split('\n');
	if(lines[0]==="")
		lines.shift();
	lines.push($('.w-input').val());
	$('.w-list').html(lines.join('\n'));
	$('.w-input').val('');
}

function removeWebsiteBlock(){
	chrome.runtime.sendMessage({reason: "RemoveBlock", matchPattern: $('.w-input').val()});
	var lines = $('.w-list').html().split('\n');
	lines = lines.filter(function(line){
		return line!=="" && line !== $('.w-input').val();
	});
	$('.w-list').html(lines.join('\n'));
	$('.w-input').val('');
}

// DEPRECATED: Application Blocking
// function addApplicationBlock(){
// 	var lines = $('.a-list').html().split('\n');
// 	lines.push($('.a-input').val());
// 	$('.a-list').html(lines.join('\n'));
// 	$('.a-input').val('');
// 	chrome.storage.local.set({'a_lines': lines});
// }
//
// function removeApplicationBlock(){
// 	var lines = $('.a-list').html().split('\n');
// 	lines = lines.filter(function(line){
// 		return !line.includes($('.a-input').val());
// 	});
// 	$('.a-list').html(lines.join('\n'));
// 	$('.a-input').val('');
// 	chrome.storage.local.set({a_lines: lines});
// }

function isValidURLMatchPattern(pattern) {
	var scheme = "(\\*|http|https)"; //Allow "*", "http", or "https"
	var host = "(\\*|(\\*\\.)?([^/*:]+))"; //Either "*" or "*."+<any chars besides '*', '/', and ':'>
	var path = "(.*)"; //<any chars>
	var regex = new RegExp("^"+scheme+"://"+host+"/"+path+"$");
	return regex.test(pattern);
}
