"use strict";

const webExtension = typeof browser === 'undefined' ? chrome : browser;

const defaultSettings = {
	serviceURL: "https://kroki.io",
	serviceURLisHTTPS: true,

	outputFormat: "svg",
	unknownSitesAsDynamic: true,
	pageDebounceMsec: 1000,
	fileDebounceMsec: 100,
	disallowSitesList: "",  // TODO
	debugMode: false,
}

var globalSettings;

function loadSettings(callback) {
	globalSettings = Object.assign({}, defaultSettings);

	webExtension.storage.sync.get(['settings'], function(result) {
		if (!result) {
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

function saveSettings(callback) {
	globalSettings.serviceURLisHTTPS = (globalSettings.serviceURL.lastIndexOf("https", 0) === 0);

	webExtension.storage.sync.clear();
	webExtension.storage.sync.set( { "settings": globalSettings }, function() {
		log("saved settings");

		if (callback)
			callback();
	});
}

function log() {
//	if (globalSettings && !globalSettings.debugMode)
//		return;

	console.log.apply(console, arguments);
}
