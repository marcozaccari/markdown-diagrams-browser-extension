'use strict';

try {
  // Only Chrome runs this (in classic background script mode)
  if (typeof chrome !== 'undefined' && typeof importScripts === 'function') {
    importScripts('pako_deflate.js', 'settings.js');
    console.log('[background.js] Chrome: importScripts succeeded');
  }
} catch (e) {
  console.warn('[background.js] importScripts failed or not needed', e);
}

// States of all tabs (default = true).
var tabEnabled = {};

loadSettings();

function getTabEnabled(tabID) {
  if (tabEnabled[tabID] == null) tabEnabled[tabID] = true;

  return tabEnabled[tabID];
}
function setTabEnabled(tabID, enabled) {
  tabEnabled[tabID] = enabled;
}

// Background messages listener.
chrome.runtime.onMessage.addListener(onMessage);
function onMessage(message, sender, callback) {
  var tabID;
  if (sender.tab) tabID = sender.tab.id;

  switch (message.action) {
    case 'fetchImageData':
      log('tab ' + tabID + ' need indirect img fetch: ' + message.url);

      fechImageDataUri(message.url, callback);
      break;

    case 'queryTabEnabled':
      var state = getTabEnabled(tabID);
      var reason = '';

      if (!isSiteAllowed(message.hostname, message.href)) {
        state = false;
        setTabEnabled(tabID, false);
        updateIconState(false);

        reason = 'site not allowed, see extension settings';
        log(reason);
      }

      var s = 'tab ' + tabID + ' requested state: ' + state;
      if (reason) s += '(' + reason + ')';
      log(s);

      callback({
        enabled: state,
        reason: reason,
        settings: globalSettings,
      });
      break;

    case 'compressCode':
      log('tab ' + tabID + ' require compression of ' + message.code.length + ' bytes');

      compressCode(message.code, callback);
      break;

    case 'reloadSettings':
      log('settings changed (by options page), reload settings and notify to all enabled tabs');

      onSettingsChanged();
      break;
  }

  return true;
}

chrome.action.onClicked.addListener(async (tab) => {
  const tabID = tab.id;
  if (!tabID) {
    log('Clicked action on a tab without ID.');
    return; // Cannot proceed without a tab ID
  }

  // Prevent action on restricted URLs where content scripts won't run
  if (
    !tab.url ||
    tab.url.startsWith('chrome://') ||
    tab.url.startsWith('chrome-extension://') ||
    tab.url.startsWith('about:')
  ) {
    log(`Clicked action on restricted URL: ${tab.url}. No action taken.`);
    // Ensure the icon reflects the actual current state for this tab,
    // as toggling isn't possible here.
    updateIconState(getTabEnabled(tabID));
    return;
  }

  const currentState = getTabEnabled(tabID);
  const newState = !currentState; // Intended new state

  const message = newState ? { action: 'enable', settings: globalSettings } : { action: 'disable' };

  log(`Attempting to change tab ${tabID} state to ${newState}. Sending message: ${message.action}`);

  // Update state and icon immediately to reflect the user's intent
  setTabEnabled(tabID, newState);
  updateIconState(newState); // Update global icon based on the clicked tab's new state
  log(
    `User clicked action. Set tab ${tabID} state to ${newState}. Attempting to notify content script.`,
  );

  try {
    // Send the message and wait for potential errors
    await chrome.tabs.sendMessage(tabID, message);
    // Message sent successfully! Log confirmation.
    log(`Successfully notified content script on tab ${tabID} of state change.`);
  } catch (error) {
    // Check if the error is the specific "no receiving end" error
    if (error.message?.includes('Could not establish connection. Receiving end does not exist')) {
      log(
        `Failed to send message to tab ${tabID}: Content script not available or not listening. State remains ${currentState}.`,
      );
      // Do not change state or icon. Ensure icon reflects the unchanged state.
      updateIconState(currentState);
    } else {
      // Log other unexpected errors
      log(`Error sending message to tab ${tabID}: ${error}. State remains ${currentState}.`);
      // Ensure icon reflects the unchanged state
      updateIconState(currentState);
    }
  }
});

chrome.tabs.onActivated.addListener(function (activeInfo) {
  onTabActivated(activeInfo.tabId);
});
/*chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
	onTabActivated(tabId);
});*/

// Options page notify changed settings, so notify all enabled tabs.
function onSettingsChanged() {
  loadSettings(function () {
    var message = {
      action: 'settingsChanged',
      settings: globalSettings,
    };

    for (const prop in tabEnabled) {
      if (tabEnabled[prop]) chrome.tabs.sendMessage(parseInt(prop, 10), message);
    }
  });
}

function onTabActivated(tabID) {
  log('activated tab ' + tabID);

  var enabled = getTabEnabled(tabID);
  log('tab ' + tabID + ' state: ' + enabled);

  updateIconState(enabled);
}

// Change extension icon according to state.
var currentIconState;
function updateIconState(enabled) {
  var title;
  var iconFilename;

  if (currentIconState === enabled) return;
  currentIconState = enabled;

  if (enabled) {
    title = 'Markdown Diagrams';
    iconFilename = 'icon128.png';
  } else {
    title = 'Markdown Diagrams (OFF, click to enable on this page)';
    iconFilename = 'icon-disabled128.png';
  }

  chrome.action.setIcon({
    path: chrome.runtime.getURL('images/' + iconFilename),
  });

  chrome.action.setTitle({ title: title });
}

// Check if site is not listed in disallowSites.
// Match: [*.]domain.ext, domain.ext[/...]
function isSiteAllowed(hostname, href) {
  if (!hostname)
    // local file
    return true;

  // strip protocol, "www." and ending "/"
  href = href
    .replace(/(^\w+:|^)\/\//, '')
    .replace(/^www./, '')
    .replace(/\/$/, '');

  var items = defaultDisallowSites.concat(globalSettings.disallowSites);
  for (var i = 0, len = items.length; i < len; i++) {
    var item = items[i];

    if (item.indexOf('/') >= 0) {
      if (href === item || href.startsWith(item + '/')) return false;
    } else {
      if (hostname === item || hostname.endsWith('.' + item)) return false;
    }
  }

  return true;
}

// Fetch remote resource and return a buffer.
function fechImageDataUri(uri, callback) {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', uri, true);
  xhr.responseType = 'arraybuffer';

  xhr.onload = function () {
    var contentType = this.getResponseHeader('Content-Type');
    var unicode = toUnicodeString(this.response);
    var base64 = self.btoa(unicode); // encode in base64
    var dataUri = 'data:' + contentType + ';base64,' + base64;
    callback(dataUri);
  };

  xhr.send();
}

function toUnicodeString(arrayBuffer) {
  var bytes = new Uint8Array(arrayBuffer);
  var binaryString = '';
  for (var i = 0; i < bytes.byteLength; i++) {
    binaryString += String.fromCharCode(bytes[i]);
  }
  return binaryString;
}

// Compress string (deflate) and return base64 string
function compressCode(code, callback) {
  //var utf8Data = unescape(encodeURIComponent(code));
  var utf8Data = new TextEncoder('utf-8').encode(code); // https://docs.kroki.io/kroki/setup/encode-diagram/#javascript

  if (!self.CompressionStream) {
    // No native deflate, fallback to external lib.

    log('Deflate using external lib');

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
  compressor.then(function (compressed) {
    // compressed is ByteArray
    //log("deflate", utf8Data, compressed);
    encode64(compressed, callback);
  });
}

// Encode byteArray to base64 string
function encode64(buffer, callback) {
  //var base64 = btoa(compressed).replace(/\+/g, '-').replace(/\//g, '_');

  var blob = new Blob([buffer]);

  var reader = new FileReader();
  reader.onload = function (event) {
    var dataurl = event.target.result;

    var base64 = dataurl.substr(dataurl.indexOf(',') + 1);

    //log("base64", base64);
    callback(base64);
  };

  reader.readAsDataURL(blob);
}
