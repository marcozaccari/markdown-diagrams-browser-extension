"use strict";

var siteProfiles = {

	// Default for any site. Known sites will be parsed with this profile too.
	"default": {
		// Search for: PRE, PRE > CODE
		// Replace: PRE, or parent DIV

		searchSelectors: "pre",
		
		extractMarkdown: function(el) {
			var code;
			var lang;

			var child = el.querySelector("code");
			
			if (child != null) {
				code = child.textContent;
				lang = detectDiagramLanguageByElement(child, false);
			} else
				code = el.textContent;

			if (!lang)
				lang = detectDiagramLanguageByElement(el);
			return {
				"code": code,
				"language": lang
			};
		},
		
		getElementToReplace: function(el) {
			// Replace parent DIV that wraps the PRE
			if (el.parentElement.tagName == "DIV" && el.parentElement.children.length == 1)
				return el.parentElement;

			return el;
		}
	},

	// Local or remote files with extension: .md, .markdown, .mdown, .mkd, .rmd, .txt, .rst
	"markdownfile": {  
		// Let the time to render the markdown file by other extension.
		dynamicLoading: true,  

		detectSite: function() {
			if (!location.protocol || (location.protocol === "file:")) 
				return true;

			var exts = ["md", "MD", "markdown", "mdown", "mkd", "rmd", "rst", "txt"];
			var ext = location.href.substr(location.href.lastIndexOf('.') + 1);
			return (exts.indexOf(ext) > -1);
		}	
	},
	
	"github.com": {
		// Known language: PRE > SPAN(s)
		// Unknown language: PRE > CODE

		dynamicLoading: true,
	},
	
	"gitlab.com": {
		// Unknown language: PRE > CODE > SPAN(s)
		
		detectSite: function() {
			var og = document.querySelectorAll('meta[property="og:site_name"]')[0];
			return (og && og.content == "GitLab");
		},

		dynamicLoading: true,

		//hourglassSelector: "i[aria-label='Loading content…']"
	},
	
	"bitbucket.org": {
		dynamicLoading: true,

		searchSelectors: "div.codehilite > pre",
		
		extractMarkdown: function(el) {
			return {
				"code": el.textContent,
				"language": detectDiagramLanguageByElement(el)
			};
		},
		
		getElementToReplace: function(el) {
			return el;
		}
	},
	
	"atlassian.com": {
		searchSelectors: "div.code > div > pre",
		
		extractMarkdown: function(el) {
			return {
				"code": el.textContent
			};
		},
	
		getElementToReplace: function(el) {
			return el.parentElement.parentElement;
		}
	}, 

	"atlassian.net": {
		dynamicLoading: true,

		searchSelectors: "div.code-block > span > code, div.code > div > pre",  // new layout, old layout

		extractMarkdown: function(el) {
			return {
				"code": el.textContent
			};
		},
		
		getElementToReplace: function(el) {
			return el.parentElement.parentElement;
		}
	},
	
};


// Detect diagram code language by inspecting element (and parent element too):
// - "lang=", "language=" attributes
// - "language-" class
// - "lang-" class
function detectDiagramLanguageByElement(el, checkParentToo) {
	var lang;

	// Check for "lang=" attribute.
	lang = el.getAttribute("lang");
	if (lang) 
		return lang;

	// Check for "language=" attribute.
	lang = el.getAttribute("language");
	if (lang) 
		return lang;

	// Check for "language-", "lang-" classes.
	el.className.split(' ').some(function(cl) {
		if (cl.substr(0, "language-".length) == "language-") {
			lang = cl.substr("language-".length);
			return true;
		}

		if (cl.substr(0, "lang-".length) == "lang-") {
			lang = cl.substr("lang-".length);
			return true;
		}
	});
	if (lang) 
		return lang;

	// Check for parent element.
	if (checkParentToo || (checkParentToo === undefined))
		lang = detectDiagramLanguageByElement(el.parentElement, false);

	return lang;
}

function getSiteProfile(profileName) {
	var profile = siteProfiles[profileName];

	profile.name = profileName;

	// Parse search selectors and add additional filters
	if (profile.searchSelectors) {
		var selectors = [];
		profile.searchSelectors.split(',').forEach(function (v){ 
			selectors.push(v.trim() + ":not([data-mduml-processed])"); 
		});
		profile.searchSelectorsParsed = selectors.join(", ");
	}

	return profile;
}

// Detect site profile by hostname or custom function.
function detectSiteProfile() {
	var idx = "default";

	var hostname = window.location.hostname.split(".").slice(-2).join(".");

	if (hostname && siteProfiles[hostname])
		idx = hostname;
	else {
		// Hostname not found in profiles, try by custom matching in reverse order.
		var keys = Object.keys(siteProfiles).sort().reverse();
		for (var i=0; i < keys.length; i++) {
			var id = keys[i];

			if ((siteProfiles[id].detectSite) && siteProfiles[id].detectSite()) {
				idx = id;
				break;
			}
		}
	}

	return getSiteProfile(idx);
}
