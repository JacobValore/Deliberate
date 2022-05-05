var timer = null;
var mins_rem = 0;
var secs_rem = 0;
var unblockPattern = "";

$(document).ready(function(){
	//Set the styling and text of the popup.
	//If it's not a webpage, then don't show a middle page
	//If it's an "unblocked" webpage, then the favicon and url text need to be set
	//If it's a "blocked" webpage, then the timer might need to be set
	chrome.runtime.sendMessage({reason: "GetPopupInfo"}, (response) => {
		console.log("PopupInfoResponse:");
		console.log(response);
		if(!response.url.startsWith('http'))
			$('.bi-unblocked').addClass('hidden');
		else if(!response.isBlocked){
			// Setup the unblocked page with favicon and domain name text
			var host = new URL(response.url).hostname;
			var img = new Image();
			img.src = 'https://api.faviconkit.com/'+host+'/64'
			img.onload = function(){
				$('.ub-logo').css('background-color', 'transparent');
				$('.ub-logo').html(img);
			}
			$('.ub-host').html(host);
		}
		else {
			$('.bi-unblocked').addClass('hidden');
			$('.bi-blocked').removeClass('hidden');
			if(response.timeout!==0){
				unblockPattern = response.matchPattern;
				setupTimer(response.timeout);
			}
		}
	});

	$('.ub-button').on("click", function(){
		//Add page to blocks list, and close popup
		var pattern = '*://*.'+$('.ub-host').html()+'/*';
		chrome.runtime.sendMessage({reason: "AddBlock", matchPattern: pattern});
		window.close();
	});
	$('.b-button').on("click", function(){
		//Remove "unblock" early, and close the popup
		chrome.runtime.sendMessage({reason: "RemoveUnblock", matchPattern: unblockPattern});
		window.close();
	});

	$('.f-contact').on("click", function(){
		//This will lead to a website eventually
	});
	$('.f-options').on("click", function(){
		chrome.runtime.openOptionsPage();
	});
	$('.f-privacy').on("click", function(){
		//This will open up the privacy policy eventually
		//For now:
		// chrome.runtime.sendMessage({reason: "AddUnblock", matchPattern: "*://*.stackoverflow.com/*", unblockLength: 2});
		// chrome.runtime.sendMessage({reason: "RemoveBlock", matchPattern: "*://*.stackoverflow.com/*"});
	});
});

//DEPRECATED: remove this soon
function checkAllTabs(closePopup = false){
	chrome.storage.local.get(['w_lines','w_unblocks'], (result) => {
		//Remove unblocked websites from list and check if unblocks are expired
		for(var [key, value] of Object.entries(result.w_unblocks)){
			if(value < Date.now()){
				delete result.w_unblocks[key];
				continue;
			}
			//Since order doesn't matter, 'swap and pop' array removal is O(1) time
			idx = result.w_lines.indexOf(key);
			if(idx != -1){
				result.w_lines[idx] = result.w_lines[result.w_lines.length-1]
				result.w_lines.pop();
			}
		}
		chrome.storage.local.set({w_unblocks: result.w_unblocks});
		//Execute script on any tabs that need it
		chrome.tabs.query({url: result.w_lines}, (tabs) => {
			//Add all promises to array
			promises = []
			for(var i = 0; i < tabs.length; i++){
				promises.push(chrome.scripting.executeScript({
		            target: { tabId: tabs[i].id },
		            files: ["./content_script.js"]
				}));
			}
			//Popup may be closed once all promises are complete
			if(closePopup){
				Promise.all(promises).then(() => {
					window.close();
				});
			}
		});
	});
}

function setupTimer(timeout){
	if(Date.now()>timeout){
		//This shouldn't happen, the unblock needs to be lifted in this case.
	}
	//If there's less than 1 minute remaining:
	else if(timeout-Date.now() <= 60000){
		timer = new setAccurateInterval(decrementTimer, 1000);
		secs_rem = Math.floor((timeout-Date.now())/1000);
		$('.b-time').html(secs_rem);
		$('.b-unit').html("secs");
		setTimeout(function(){
			timer.start();
			decrementTimer();
		}, (timeout-Date.now())%1000);
	}
	//If there's more than a minute remaining
	else{
		timer = new setAccurateInterval(decrementTimer, 60000);
		mins_rem = Math.floor((timeout-Date.now())/60000);
		$('.b-time').html(mins_rem);
		$('.b-unit').html("mins");
		setTimeout(function(){
			timer.start();
			decrementTimer();
		}, (timeout-Date.now())%60000);
	}
}

function decrementTimer(){
	if($('.b-unit').html()=="secs"){
		secs_rem-=1;
		$('.b-time').html(secs_rem);
		if(secs_rem===0){
			timer.stop();
		}
	}
	else{
		mins_rem-=1;
		if(mins_rem===0){
			secs_rem = 60;
			$('.b-time').html(secs_rem);
			$('.b-unit').html("secs");
			timer.stop();
			timer = new setAccurateInterval(decrementTimer, 1000);
			timer.start();
		}
		else{
			$('.b-time').html(mins_rem);
		}
	}
}

/**
 * Self-adjusting interval to account for drifting
 *
 * @param {function}	callback  Callback containing the work to be done
 *							for each interval
 * @param {int}			interval  Interval speed (in milliseconds)
 */
function setAccurateInterval(callback, interval){
	var timer, nextInterval;
	var stop_timer = false;

	this.start = function() {
		nextInterval = Date.now() + interval;
		timer = setTimeout(step, interval);
	}

	this.stop = function() {
		stop_timer = true;
	}

	function step(){
		if(stop_timer)
			return;
		callback();
		nextInterval += interval;
		if(nextInterval-Date.now() < 0) //error: timer skipped one, interval too small");
			return;
		timer = setTimeout(step, nextInterval-Date.now());
	}
}
