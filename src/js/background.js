"use strict";

// Settings constants and functions
const defaultSettings = {
	serviceURL: "https://kroki.io",
	serviceURLisHTTPS: true,

	outputFormat: "svg",
	unknownSitesAsDynamic: true,
	pageDebounceMsec: 1000,
	fileDebounceMsec: 100,
	debugMode: false,

	disallowSites: []
};

// Official languages sites that contains examples, etc.
const defaultDisallowSites = [
	"mermaid-js.github.io",
	"plantuml.com",	
	"github.com/RicardoNiepel/C4-PlantUML",
	"graphviz.org",
	"github.com/BurntSushi/erd",
	"nomnoml.com",
	"bpmn.io",
	"blockdiag.com",
	"github.com/Deep-Symmetry/bytefield-svg",
	"ditaa.sourceforge.net",
	"ivanceras.github.io",
	"itmeyer.at/umlet",
	"vega.github.io",
	"wavedrom.com"
];

var globalSettings;

// Log function
function log() {
	if (globalSettings && !globalSettings.debugMode)
		return;

	console.log.apply(console, arguments);
}

// Load settings
function loadSettings(callback) {
	globalSettings = Object.assign({}, defaultSettings);

	chrome.storage.sync.get(['settings'], function(result) {
		if (!result || !result.settings) {
			log("default settings", globalSettings);
			saveSettings(callback);
			return;
		}

		for (const field in result.settings) {
			if (globalSettings.hasOwnProperty(field))
				globalSettings[field] = result.settings[field];
		}
	
		log("loaded settings", globalSettings);

		if (callback)
			callback();
	});
}

// Save settings
function saveSettings(callback) {
	globalSettings.serviceURLisHTTPS = (globalSettings.serviceURL.lastIndexOf("https", 0) === 0);

	chrome.storage.sync.clear();
	chrome.storage.sync.set({ "settings": globalSettings }, function() {
		log("saved settings");

		if (callback)
			callback();
	});
}

// States of all tabs (default = true).
var tabEnabled = {};

// Load settings at startup
loadSettings();

// Get tab enabled status
function getTabEnabled(tabID) {
	if (tabEnabled[tabID] == null)
		tabEnabled[tabID] = true;

	return tabEnabled[tabID];
}

// Set tab enabled status
function setTabEnabled(tabID, enabled) {
	tabEnabled[tabID] = enabled;
}

// Add message listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	let tabID;
	if (sender.tab)
		tabID = sender.tab.id;
	
	switch (message.action) {
		case "fetchImageData":
			log("tab " + tabID + " need indirect img fetch: " + message.url);
			fechImageDataUri(message.url, sendResponse);
			break;

		case "queryTabEnabled":
			var state = getTabEnabled(tabID);
			var reason = "";

			if (!isSiteAllowed(message.hostname, message.href)) {
				state = false;
				setTabEnabled(tabID, false);
				updateIconState(false);

				reason = "site not allowed, see extension settings";
				log(reason);
			}

			var s = "tab " + tabID + " requested state: " + state;
			if (reason)
				s += "(" + reason + ")";
			log(s);

			sendResponse({ 
				"enabled": state, 
				"reason": reason,
				"settings": globalSettings
			});
			break;

		case "compressCode":
			log("tab " + tabID + " require compression of " + message.code.length + " bytes");
			compressCode(message.code, sendResponse);
			break;

		case "reloadSettings":
			log("settings changed (by options page), reload settings and notify to all enabled tabs");
			onSettingsChanged();
			break;
	}
	
	// This is necessary for async sendResponse in Manifest V3
	return true;
});

// Browser action click handler
chrome.action.onClicked.addListener((tab) => {
	const tabID = tab.id;

	const enabled = !getTabEnabled(tabID);
	setTabEnabled(tabID, enabled);

	log("change tab " + tabID + " state: " + enabled);

	let message;

	if (enabled) {
		log("send enable command to tab " + tabID);
		message = { 
			"action": "enable", 
			"settings": globalSettings 
		};
	} else {
		log("send disable command to tab " + tabID);
		message = { 
			"action": "disable"
		};
	}

	chrome.tabs.sendMessage(tabID, message).catch(() => {});
	updateIconState(enabled);
});

// Tab activation listener
chrome.tabs.onActivated.addListener((activeInfo) => {
	onTabActivated(activeInfo.tabId);
});

// Settings changed notification
function onSettingsChanged() {
	loadSettings(function() {
		var message = { 
			"action": "settingsChanged",
			"settings": globalSettings
		};
	
		for (const prop in tabEnabled) {
			if (tabEnabled[prop])
				chrome.tabs.sendMessage(parseInt(prop, 10), message).catch(() => {});
		}
	});
}

function onTabActivated(tabID) {
	log("activated tab " + tabID);

	var enabled = getTabEnabled(tabID);
	log("tab " + tabID + " state: " + enabled);

	updateIconState(enabled);
}

// Update icon state
var currentIconState;
function updateIconState(enabled) {
	var title;
	var iconFilename;

	if (currentIconState === enabled)
		return;
	currentIconState = enabled;

	if (enabled) {
		title = "Markdown Diagrams";
		iconFilename = "icon128.png";

	} else {
		title = "Markdown Diagrams (OFF, click to enable on this page)";
		iconFilename = "icon-disabled128.png";
	}

	chrome.action.setIcon({ path: "images/" + iconFilename });
	chrome.action.setTitle({ title: title });
}

// Check if site is not listed in disallowSites.
// Match: [*.]domain.ext, domain.ext[/...]
function isSiteAllowed(hostname, href) {
	if (!hostname)  // local file
		return true;

	// strip protocol, "www." and ending "/"
	href = href.replace(/(^\w+:|^)\/\//, "").replace(/^www./, "").replace(/\/$/, "");

	var items = defaultDisallowSites.concat(globalSettings.disallowSites);
	for (var i=0, len=items.length; i < len; i++) { 
		var item = items[i];

		if (item.indexOf("/") >= 0) {
			if ((href === item) || href.startsWith(item+"/"))
				return false;
		} else {
			if ((hostname === item) || hostname.endsWith("."+item))
				return false;
		}
	}

	return true;
}

// Fetch remote resource and return a buffer.
function fechImageDataUri(uri, sendResponse) {
	fetch(uri)
		.then(response => response.arrayBuffer())
		.then(buffer => {
			const contentType = 'image/svg+xml';
			const base64 = arrayBufferToBase64(buffer);
			const dataUri = "data:" + contentType + ";base64," + base64;
			sendResponse(dataUri);
		})
		.catch(error => {
			console.error("Error fetching image data:", error);
			sendResponse(null);
		});
}

function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

// Compress string (deflate) and return base64 string
function compressCode(code, sendResponse) {
	var utf8Data = new TextEncoder('utf-8').encode(code);  // https://docs.kroki.io/kroki/setup/encode-diagram/#javascript

	// Modern browsers all support CompressionStream now, but just in case:
	if (typeof CompressionStream === 'undefined') {
		console.error("CompressionStream not supported");
		// Send a fallback response or error notification
		sendResponse("");
		return;
	}
	
	try {
		// Native CompressionStream
		const cs = new CompressionStream('deflate');
		const writer = cs.writable.getWriter();
		writer.write(utf8Data);
		writer.close();
		
		new Response(cs.readable).arrayBuffer().then(function(compressed) {
			// Encode to base64
			const base64 = arrayBufferToBase64(compressed);
			// Replace + and / for URL safety
			const urlSafeBase64 = base64.replace(/\+/g, '-').replace(/\//g, '_');
			sendResponse(urlSafeBase64);
		}).catch(error => {
			console.error("Compression error:", error);
			sendResponse("");
		});
	} catch (error) {
		console.error("Compression error:", error);
		sendResponse("");
	}
}
