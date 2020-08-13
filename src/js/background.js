"use strict";

// States of all tabs (default = true).
var tabEnabled = {};

loadSettings();

function getTabEnabled(tabID) {
	if (tabEnabled[tabID] == null)
		tabEnabled[tabID] = true;

	return tabEnabled[tabID];
}
function setTabEnabled(tabID, enabled) {
	tabEnabled[tabID] = enabled;
}

// Background messages listener.
webExtension.runtime.onMessage.addListener(onMessage);
function onMessage(message, sender, callback) {
	var tabID;
	if (sender.tab)
		tabID = sender.tab.id;
	
	switch (message.action) {
		case "fetchImageData":
			log("tab " + tabID + " need indirect img fetch: " + message.url);

			fechImageDataUri(message.url, callback);
			break;

		case "queryTabEnabled":
			var state = getTabEnabled(tabID);
			log("tab " + tabID + " requested state: " + state);

			callback({ 
				"enabled": state, 
				"settings": globalSettings
			});
			break;

		case "compressCode":
			log("tab " + tabID + " require compression of " + message.code.length + " bytes");
	
			compressCode(message.code, callback);
			break;

		case "reloadSettings":
			log("settings changed (by options page), reload settings and notify to all enabled tabs");

			onSettingsChanged();
			break;
	}

	return true;
}

webExtension.browserAction.onClicked.addListener(function(tab) {
	var tabID = tab.id;

	var enabled = !getTabEnabled(tabID);
	setTabEnabled(tabID, enabled);

	log("change tab " + tabID + " state: " + enabled);

	var message;

	if (enabled) {
		log("send enable command to tab " + tabID);
		message = { 
			"action": "enable", 
			"settings": globalSettings 
		};
	} else {
		log("send disable command to tab " + tabID);
		message = { "action": "disable" };
	}

	webExtension.tabs.sendMessage(tabID, message);

	updateIconState(enabled);
});

webExtension.tabs.onActivated.addListener(function(activeInfo) {
	onTabActivated(activeInfo.tabId);
});
/*webExtension.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
	onTabActivated(tabId);
});*/

// Options page notify changed settings, so notify all enabled tabs.
function onSettingsChanged() {
	loadSettings(function() {
		var message = { 
			"action": "settingsChanged",
			"settings": globalSettings
		};
	
		for (const prop in tabEnabled) {
			if (tabEnabled[prop])
				webExtension.tabs.sendMessage(parseInt(prop, 10), message);
		}
	});
}

function onTabActivated(tabID) {
	log("activated tab " + tabID);

	var enabled = getTabEnabled(tabID);
	log("tab " + tabID + " state: " + enabled);

	updateIconState(enabled);
}

// Change extension icon according to state.
function updateIconState(enabled) {
	var title;
	var iconFilename;

	if (enabled) {
		title = "Markdown Diagrams";
		iconFilename = "icon128.png";

	} else {
		title = "Markdown Diagrams (OFF, click to enable on this page)";
		iconFilename = "icon-disabled128.png";
	}

	webExtension.browserAction.setIcon({ path: "images/" + iconFilename });
	webExtension.browserAction.setTitle({ "title": title });
}

// Fetch remote resource and return a buffer.
function fechImageDataUri(uri, callback) {
	var xhr = new XMLHttpRequest();
	xhr.open("GET", uri, true);
	xhr.responseType = "arraybuffer";

	xhr.onload = function() {
		var contentType = this.getResponseHeader("Content-Type");
		var unicode = toUnicodeString(this.response);
		var base64 = window.btoa(unicode);  // encode in base64
		var dataUri = "data:" + contentType + ";base64," + base64;
		callback(dataUri);
	};

	xhr.send();
}

function toUnicodeString(arrayBuffer) {
	var bytes = new Uint8Array(arrayBuffer);
	var binaryString = "";
	for(var i = 0; i < bytes.byteLength; i++) {
		binaryString += String.fromCharCode(bytes[i]);
	}
	return binaryString;
}

// Compress string (deflate) and return base64 string
function compressCode(code, callback) {
	//var utf8Data = unescape(encodeURIComponent(code));
	var utf8Data = new TextEncoder('utf-8').encode(code);  // https://docs.kroki.io/kroki/setup/encode-diagram/#javascript

	if (!window.CompressionStream) {
		// No native deflate, fallback to external lib.

		log("Deflate using external lib");

		//var compressed = pako.deflate(code, { level: 9, to: 'string' }) 
		//var base64 = btoa(compressed) 
		//  .replace(/\+/g, '-').replace(/\//g, '_') 
		//callback(base64);
		
		var compressed = pako.deflate(utf8Data, { level: 9 });
		encode64(compressed, callback);
		return;
	}
	
	// Native CompressionStream: https://docs.google.com/document/d/1TovyqqeC3HoO0A4UUBKiCyhZlQSl7jM_F7KbWjK2Gcs
	const stream = new Response(utf8Data).body.pipeThrough(new CompressionStream('deflate'));
	var compressor = new Response(stream).arrayBuffer();
	compressor.then(function(compressed) {  // compressed is ByteArray
		//log("deflate", utf8Data, compressed);
		encode64(compressed, callback);
	});
}

// Encode byteArray to base64 string
function encode64(buffer, callback) {
	//var base64 = btoa(compressed).replace(/\+/g, '-').replace(/\//g, '_');

	var blob = new Blob([buffer]);

	var reader = new FileReader();
	reader.onload = function(event) {
		var dataurl = event.target.result;

		var base64 = dataurl.substr(dataurl.indexOf(',') + 1);
			   
		//log("base64", base64);
		callback(base64);
	};

	reader.readAsDataURL(blob);
}
