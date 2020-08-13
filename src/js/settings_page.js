"use strict";

// References to UI elements.
var ui = {
	inputServiceURL: null,
	selectOutputFormat: null,
	checkUnknownSitesAsDynamic: null,
	selectPageDebounceMs: null,
	selectFileDebounceMs: null,
	textDisallowSites: null,
	checkDebugMode: null,

	enablingLocalFileNotification : null
}

function initOptions() {
	loadSettings(function() {
		ui.inputServiceURL = document.getElementById('inputServiceURL');
		ui.selectOutputFormat = document.getElementById('selectOutputFormat');
		ui.checkUnknownSitesAsDynamic = document.getElementById('checkUnknownSitesAsDynamic');
		ui.selectPageDebounceMs = document.getElementById('selectPageDebounceMs');
		ui.selectFileDebounceMs = document.getElementById('selectFileDebounceMs');
		ui.textDisallowSites = document.getElementById('textDisallowSites');
		ui.checkDebugMode = document.getElementById('checkDebugMode');
	
		ui.enablingLocalFileNotification = document.getElementById('enablingLocalFileNotification');
	
		settingsToUI();
	
		initEnablingLocalFileAlert();
	
		initAutoSave();
	});
}

// UI => globalSettings.
function settingsFromUI() {
	globalSettings.serviceURL = ui.inputServiceURL.value;
	globalSettings.outputFormat = ui.selectOutputFormat.value;
	globalSettings.unknownSitesAsDynamic = ui.checkUnknownSitesAsDynamic.checked;
	globalSettings.pageDebounceMsec = parseInt(ui.selectPageDebounceMs.value, 10);
	globalSettings.fileDebounceMsec = parseInt(ui.selectFileDebounceMs.value, 10);
	globalSettings.disallowSitesList = ui.textDisallowSites.value.replace(/\r\n/g,"\n").replace(/[ \t]/g,"");
	globalSettings.debugMode = ui.checkDebugMode.checked;
}

// globalSettings => UI.
function settingsToUI() {
	ui.inputServiceURL.value = globalSettings.serviceURL;
	ui.selectOutputFormat.value = globalSettings.outputFormat;
	ui.checkUnknownSitesAsDynamic.checked = globalSettings.unknownSitesAsDynamic;
	ui.selectPageDebounceMs.value = globalSettings.pageDebounceMsec.toString();
	ui.selectFileDebounceMs.value = globalSettings.fileDebounceMsec.toString();
	ui.textDisallowSites.value = globalSettings.disallowSitesList;

	console.log(globalSettings.debugMode);
	ui.checkDebugMode.checked = globalSettings.debugMode;
}

// Check if UI <> globalSettings.
function settingsChanged() {
	return 	ui.inputServiceURL.value                    !== globalSettings.serviceURL            ||
			ui.selectOutputFormat.value                 !== globalSettings.outputFormat          ||
			ui.checkUnknownSitesAsDynamic.checked       !== globalSettings.unknownSitesAsDynamic ||
			parseInt(ui.selectPageDebounceMs.value, 10) !== globalSettings.pageDebounceMsec      ||
			parseInt(ui.selectFileDebounceMs.value, 10) !== globalSettings.fileDebounceMsec      ||
			ui.textDisallowSites.value                  !== globalSettings.disallowSitesList     ||
			ui.checkDebugMode.checked                   !== globalSettings.debugMode;
}

function showEnablingLocalFileNotification() {
	openExtensionsPageLink.onclick = () => webExtension.tabs.create(
		{ url: 'chrome://extensions/?id=' + webExtension.runtime.id	}
	);

	initNotification(enablingLocalFileNotification);
	enablingLocalFileNotification.classList.remove('is-hidden');
}

function initEnablingLocalFileAlert() {
	// This API is currently only implemented in Firefox and Firefox Mobile.
	// Reference: https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/runtime/getBrowserInfo
	if (typeof webExtension.runtime.getBrowserInfo === 'function') {
		webExtension.runtime.getBrowserInfo().then((info) => {
			if (info.name.includes('Chrome') || info.name.includes('Opera'))
				showEnablingLocalFileNotification();
		})
	} else {
		// Assume that we are running Chrome or Opera (even if it can be Edge)
		showEnablingLocalFileNotification();
	}
}

function initNotification(element) {
	element.getElementsByClassName('delete').item(0).onclick = () => {
		element.classList.add('is-hidden');
	}
	element.classList.add('is-hidden');
}

function initAutoSave() {
	function saving (controlElement) {
		if (controlElement) {
			controlElement.classList.add('is-loading');
			controlElement.getElementsByClassName('icon').item(0).classList.add('is-hidden');
		}
	}

	function saved (controlElement) {
		if (controlElement) {
			controlElement.classList.remove('is-loading');
			controlElement.getElementsByClassName('icon').item(0).classList.remove('is-hidden');
		}
	}

	var saveAction;
	function save(controlElement) {
		if (!settingsChanged()) 
			return;

		saving(controlElement);
		clearTimeout(saveAction);

		saveAction = setTimeout(
			() => {
				settingsFromUI();

				saveSettings(function(){
					// Notify changed settings to background script.
					webExtension.runtime.sendMessage( { "action": "reloadSettings" } );
					//webExtension.runtime.getBackgroundPage((page) => page.onSettingsChanged());

					saved(controlElement);
				});
			},
			150
		);
	}

	[].forEach.call(
		document.body.querySelectorAll('.form-input'),
		function (element) {
			if ((element.tagName === 'INPUT' && element.type === 'text') ||
				(element.tagName === 'TEXTAREA')) {
			
				const parentElement = element.parentElement;
				let controlElement;

				if (parentElement.classList.contains('has-save-indicator') && parentElement.classList.contains('control'))
					controlElement = parentElement;

				element.onkeyup = element.oninput = element.onpaste = element.onchange = () => save(controlElement);

			} else
				element.onchange = () => save();
		}
	);
}

//document.addEventListener("DOMContentLoaded", initOptions);
initOptions();
