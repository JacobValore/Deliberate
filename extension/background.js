chrome.runtime.onInstalled.addListener((details) => {
	//When extension is first installed, setup the storage variables
	if(details.reason==="install"){
		chrome.storage.local.set({
			blocked_sites: [],
			unblocked_sites: {},
			options: {min_char_limit_bool: true,
				min_char_limit_val: 150,
				max_time_limit_bool: false,
				max_time_limit_val: 60}
		});
	}
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
	//Fire event once, when the page is complete, and test if it's a webpage
    if(changeInfo.status === 'complete' && tab.url.startsWith('http')) {
		//Get list of websites to block
		chrome.storage.local.get(['blocked_sites','unblocked_sites'], (result) => {
			//Remove unblocked websites from list and check if unblocks are expired
			for(var [key, value] of Object.entries(result.unblocked_sites)){
				if(value < Date.now()){
					delete result.unblocked_sites[key];
					continue;
				}
				//Since order doesn't matter, 'swap and pop' array removal is O(1) time
				idx = result.blocked_sites.indexOf(key);
				if(idx != -1){
					result.blocked_sites[idx] = result.blocked_sites[result.blocked_sites.length-1]
					result.blocked_sites.pop();
				}
			}
			chrome.storage.local.set({unblocked_sites: result.unblocked_sites});
			//Test url against list of blocked urls, unless everything is unblocked
			if(result.blocked_sites.length==0)
				return;
			chrome.tabs.query({index:tab.index, windowId:tab.windowId, url: result.blocked_sites}, (tabs) => {
				if(tabs.length===1){
					//If blocked, inject content_script
					chrome.scripting.executeScript({
			            target: { tabId: tabs[0].id },
			            files: ["./jquery-min.js", "./arrive-min.js", "./content_script.js"]
					}).catch((err) => console.log(err));
				}
			});
		});
    }
});

chrome.alarms.onAlarm.addListener((alarm) => {
	chrome.storage.local.get(['unblocked_sites'], (result) => {
		delete result.unblocked_sites[alarm.name];
		chrome.storage.local.set({unblocked_sites: result.unblocked_sites}, () => {
			chrome.tabs.query({url: [alarm.name]}, (tabs) => {
				for(var i = 0; i < tabs.length; i++){
					chrome.scripting.executeScript({
			            target: { tabId: tabs[i].id },
			            files: ["./jquery-min.js", "./arrive-min.js", "./content_script.js"]
					});
				}
			});
		});
	});
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	if(message.reason==="AddBlock")
		addBlock(message);
	else if(message.reason==="RemoveBlock")
		removeBlock(message);
	else if(message.reason==="AddUnblock")
		addUnblock(message);
	else if(message.reason==="RemoveUnblock")
		removeUnblock(message);
	else if(message.reason==="SetOption")
		setOption(message);
	else if(message.reason==="GetPopupInfo"){
		getPopupInfo(sender, sendResponse);
		return true;
	}
	else if(message.reason==="GetMatchPattern"){
		getMatchPattern(sender, sendResponse);
		return true;
	}
	//If it gets to this point, then no response is needed.
	//It will error if sendResponse isn't called though.
	sendResponse();
});

//DEPRECATED it is unneccesary to check all tabs with the current implementation
//I will leave it for now because it may be useful in the future again
function checkAllTabs(){
	chrome.storage.local.get(['blocked_sites','unblocked_sites'], (result) => {
		//Remove unblocked websites from list and check if unblocks are expired
		for(var [key, value] of Object.entries(result.unblocked_sites)){
			if(value < Date.now()){ //Checking if expired
				delete result.unblocked_sites[key];
				continue;
			}
			//Since order doesn't matter, 'swap and pop' array removal is O(1) time
			idx = result.blocked_sites.indexOf(key);
			if(idx != -1){
				result.blocked_sites[idx] = result.blocked_sites[result.blocked_sites.length-1]
				result.blocked_sites.pop();
			}
		}
		chrome.storage.local.set({unblocked_sites: result.unblocked_sites});
		//Execute script on any tabs that need it
		chrome.tabs.query({url: result.blocked_sites}, (tabs) => {
			for(var i = 0; i < tabs.length; i++){
				chrome.scripting.executeScript({
		            target: { tabId: tabs[i].id },
		            files: ["./jquery-min.js", "./arrive-min.js", "./content_script.js"]
				});
			}
		});
	});
}

function addBlock(message){
	if(!isValidURLMatchPattern(message.matchPattern))
		return;
	chrome.storage.local.get(['blocked_sites'], (result) => {
		idx = result.blocked_sites.indexOf(message.matchPattern);
		if(idx !== -1)
			return;
		result.blocked_sites.push(message.matchPattern);
		chrome.storage.local.set({blocked_sites: result.blocked_sites}, () => {
			// Inject content script into all newly blocked tabs
			chrome.tabs.query({url: message.matchPattern}, (tabs) => {
				for(var i = 0; i < tabs.length; i++){
					chrome.scripting.executeScript({
			            target: { tabId: tabs[i].id },
			            files: ["./jquery-min.js", "./arrive-min.js", "./content_script.js"]
					});
				}
			});
		});
	});
}

function removeBlock(message){
	chrome.storage.local.get(['blocked_sites'], (result) => {
		idx = result.blocked_sites.indexOf(message.matchPattern);
		if(idx !== -1){
			result.blocked_sites[idx] = result.blocked_sites[result.blocked_sites.length-1]
			result.blocked_sites.pop();
			chrome.storage.local.set({blocked_sites: result.blocked_sites});
		}
	});
}

function addUnblock(message){
	if(message.unblockLength <= 1)
		return;
	chrome.storage.local.get(['blocked_sites','unblocked_sites'], (result) => {
		if(result.blocked_sites.indexOf(message.matchPattern)===-1)
			return;
		var timeout = message.unblockLength*60000 + Date.now();
		result.unblocked_sites[message.matchPattern] = timeout;
		chrome.alarms.create(message.matchPattern, {when: timeout});
		chrome.storage.local.set({unblocked_sites: result.unblocked_sites});
	});
}

function removeUnblock(message){
	chrome.storage.local.get(['unblocked_sites'], (result) => {
		if(!(message.matchPattern in result.unblocked_sites))
			return;
		delete result.unblocked_sites[message.matchPattern];
		chrome.alarms.clear(message.matchPattern);
		chrome.storage.local.set({unblocked_sites: result.unblocked_sites}, () => {
			chrome.tabs.query({url: message.matchPattern}, (tabs) => {
				for(var i = 0; i < tabs.length; i++){
					chrome.scripting.executeScript({
			            target: { tabId: tabs[i].id },
			            files: ["./jquery-min.js", "./arrive-min.js", "./content_script.js"]
					});
				}
			});
		});
	});
}

function setOption(message){
	chrome.storage.local.get(['options'], (result) => {
		if(message.option_key === 'min_char_limit_bool' && message.option_val !== result.options.min_char_limit_bool){
			result.options[message.option_key] = message.option_val;
		} else if(message.option_key === 'max_time_limit_bool' && message.option_val !== result.options.max_time_limit_bool){
			result.options[message.option_key] = message.option_val;
		} else if(message.option_key === 'min_char_limit_val' && message.option_val > 0){
			result.options.min_char_limit_val = message.option_val;
		} else if(message.option_key === 'max_time_limit_val' && message.option_val >= 5 && message.option_val <= 1440){
			result.options.max_time_limit_val = message.option_val;
		} else{
			return;
		}
		chrome.storage.local.set({options: result.options});
	});
}

function getPopupInfo(sender, sendResponse){
	chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
		var response = {url: tabs[0].url};
		// If not a webpage, then popup doesn't need any more info
		if(!tabs[0].url.startsWith('http')){
			sendResponse(response);
			return;
		}
		chrome.storage.local.get(['blocked_sites','unblocked_sites'], (result) => {
			//If nothing blocked, then there's no need to query
			if(result.blocked_sites.length===0){
				response.isBlocked = false;
				sendResponse(response);
				return;
			}
			//Check if the tab is blocked
			chrome.tabs.query({active: true, currentWindow: true, url: result.blocked_sites}, (tabs) => {
				//Add isBlocked item, if not blocked, popup doesn't need anything else
				if(tabs.length===0){
					response.isBlocked = false;
					sendResponse(response);
					return;
				}
				response.isBlocked = true;
				//Add timeout item, check if tab is "unblocked" and add matchPattern item if it is
				//If not unblocked, timeout = 0
				response.timeout = 0;
				var promises = [];
				var entries = [];
				for(var key in result.unblocked_sites){
					promises.push(chrome.tabs.query({active: true, currentWindow: true, url: [key]}));
					entries.push([key, result.unblocked_sites[key]]);
				}
				Promise.all(promises).then((results) => {
					for(var i = 0; i < results.length; i++){
						//If results[i].length===1, then that unblock applies here.
						if(results[i].length===1){
							response.matchPattern = entries[i][0];
							response.timeout = entries[i][1];
							break;
						}
					}
					sendResponse(response);
				});
			});
		});
	});
}

function getMatchPattern(sender, sendResponse){
	chrome.storage.local.get(['blocked_sites'], (result) => {
		var promises = [];
		var matchPatterns = [];
		for(var i = 0; i < result.blocked_sites.length; i++){
			promises.push(chrome.tabs.query({index:sender.tab.index, windowId:sender.tab.windowId, url: [result.blocked_sites[i]]}));
			matchPatterns.push(result.blocked_sites[i]);
		}
		Promise.all(promises).then((results) => {
			for(var i = 0; i < results.length; i++){
				//If results[i].length===1, then that block applies here.
				if(results[i].length===1){
					sendResponse({matchPattern: matchPatterns[i]});
					return;
				}
			}
			//This should never get sent.
			sendResponse({matchPattern: "error"});
		});
	});
}

function isValidURLMatchPattern(pattern) {
	var scheme = "(\\*|http|https)"; //Allow "*", "http", or "https"
	var host = "(\\*|(\\*\\.)?([^/*:]+))"; //Either "*" or "*."+<any chars besides '*', '/', and ':'>
	var path = "(.*)"; //<any chars>
	var regex = new RegExp("^"+scheme+"://"+host+"/"+path+"$");
	return regex.test(pattern);
}
