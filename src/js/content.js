"use strict";

var renderedBlocksCount = 0;
var pageObserver;
var currentSiteProfile;

function stop() {
	if (pageObserver) { // remove old observer
		pageObserver.disconnect();
		pageObserver = null;
	}
}

// Start the extension on page, loading the config and preparing to search markdown code in the page.
function run() {
	stop();

	currentSiteProfile = detectSiteProfile();
	if (!currentSiteProfile)  // site not allowed (disallowSitesList)
		return;

	var isDefaultProfile = (currentSiteProfile.name === "default");
	log("[Markdown Diagrams] site profile: " + currentSiteProfile.name);

	var defaultSiteProfile = currentSiteProfile;
	if (!isDefaultProfile)
		defaultSiteProfile = getSiteProfile("default");

	var observerTimer;

	var searchFunc = function() {
		observerTimer = null;

		if (currentSiteProfile.searchSelectorsParsed)
			searchBlocks(currentSiteProfile);

		if (!isDefaultProfile)
			searchBlocks(defaultSiteProfile);
	}

	if (currentSiteProfile.dynamicLoading || (isDefaultProfile && globalSettings.unknownSitesAsDynamic)) {
		var debounceMsec;
		if (currentSiteProfile.name === "markdownfile")
			debounceMsec = globalSettings.fileDebounceMsec;
		else
			debounceMsec = globalSettings.pageDebounceMsec;

		log("[Markdown Diagrams] enable page watcher (debounce " + debounceMsec + " ms)");

		pageObserver = new MutationObserver(function() {
			if (observerTimer) 
				return;

			observerTimer = setTimeout(searchFunc, debounceMsec);
			//observer.disconnect();
		});
	
		pageObserver.observe(document.body, {
			//attributes: true,
			//characterData: true,
			childList: true,
			subtree: true
		});  
	}

	waitForHourglass(currentSiteProfile.hourglassSelector, searchFunc);
}
 
// Search blocks of diagrams code in the page using specific profile.
function searchBlocks(siteProfile) {
	log("[Markdown Diagrams] search code on page using selectors: " + siteProfile.searchSelectorsParsed);

	[].forEach.call(
		document.querySelectorAll(siteProfile.searchSelectorsParsed), 
		function(searchElem) {
			//if (searchElem.dataset.mdUmlProcessed == "true")
				//return;  // avoid retrig of switched code/render element in dynamicLoading sites
			//searchElem.dataset.mdUmlProcessed = "true";  // avoid retrig of switched code/render element in dynamicLoading sites
			searchElem.setAttribute('data-mduml-processed', "true")

			var markdown = siteProfile.extractMarkdown(searchElem);

			var diagramProps = getDiagramProps(markdown.language, markdown.code);
			if (diagramProps == false)
				return;

			log("[Markdown Diagrams] found block", searchElem);

			var replaceEl = siteProfile.getElementToReplace(searchElem);
			renderBlock(markdown.code, diagramProps, replaceEl);
		}
	);
}

function renderBlock(code, diagramProps, replaceElem) {
	var renderEl = function(base64code) {
		// Replace + and / characters to make it "URL safe"
		var base64payload = base64code.replace(/\+/g, '-').replace(/\//g, '_');

		var request = diagramProps.reqType + "/";
		if (diagramProps.forceSVG == true)
			request += "svg";
		else {
			request += globalSettings.outputFormat;
		}

		log("[Markdown Diagrams] apply " + request);
		renderedBlocksCount++;

		var imgUrl = globalSettings.serviceURL + "/" + request + "/" + base64payload;
	
		if (globalSettings.serviceURLisHTTPS) { 
			// URL starts with "https", replace with <img> directly
			replaceElementWithImg(replaceElem, imgUrl);
		} else {
			// Fetch by background and embed image data in <img> node
			webExtension.runtime.sendMessage(
				{ 
					"action": "fetchImageData", 
					"url": imgUrl 
				}, 
				function(dataUri) {
					replaceElementWithImg(replaceElem, dataUri);
				}
			);
		}
	}

	if (diagramProps.trimCode !== false)
		code = code.trim();

	log("[Markdown Diagrams] render " + diagramProps.reqType);

	// Request compression to background, 
	// that contains external-global libs for all the tabs.
	webExtension.runtime.sendMessage(
		{ 
			"action": "compressCode", 
			"code": code 
		}, 
		renderEl
	);
}

// Replace page element with clickable <img>
function replaceElementWithImg(el, srcUrl) {
	var parent = el.parentNode;

	if (parent === null)
		return;

	var tooltip = "Double click to switch code/render";

	var img = document.createElement("img");

	img.setAttribute("src", escapeHTML(srcUrl));
	img.setAttribute("title", tooltip);

	img.ondblclick = function() {
		parent.replaceChild(el, img);
	};

	el.setAttribute("title", tooltip);
	el.ondblclick = function() {
		parent.replaceChild(img, el);
	};

	parent.replaceChild(img, el);
}

// Escape special HTML chars
function escapeHTML(text) {
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}

// Wait for hourglass (if any) and proceed to search into the page.
function waitForHourglass(selector, callback, counter){
	if (!counter)
		counter = 0;
	counter++;

	if (!selector || (counter >= 50)) {  // 5 secs timeout
		callback();
		return;
	}

	var el = document.querySelector(selector);
	if (el == null) {
		callback();
		return;
	}
	var style = getComputedStyle(el);
	if (style.visibility == "hidden") {
		callback();
		return;
	}

	log("[Markdown Diagrams] wait for hourglass", selector);

	setTimeout(waitForHourglass, 100, selector, callback, counter);
}

webExtension.runtime.onMessage.addListener(onMessage);
function onMessage(message, sender, callback) {
	switch (message.action) {
		case "background-log":
			log("[Markdown Diagrams (BK)] " + message.text, message.data)	
			break;

		case "enable":
			globalSettings = message.settings;

			log("[Markdown Diagrams] enabled", globalSettings);

			run();
			break;

		case "disable":
			log("[Markdown Diagrams] disabled");

			stop();

			if (renderedBlocksCount)
				location.reload();
			break;

		// Settings changed by options page
		case "settingsChanged":
			globalSettings = message.settings;
			
			if (renderedBlocksCount) {
				log("[Markdown Diagrams] changed settings, reload the page", globalSettings);
				location.reload();
			} else {
				log("[Markdown Diagrams] changed settings, re-run", globalSettings);
				run();
			}
			break;
	}

	return true;
}

// Ask to background.js if current tab is enabled to search and parse.
webExtension.runtime.sendMessage(
	{ "action": "queryTabEnabled" }, 
	function(response) {
		if (response.enabled) {
			globalSettings = response.settings;
			log("[Markdown Diagrams] tabs enabled, run", globalSettings);
			run();
		}
	}
);
