chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message?.type?.startsWith("ACCESSOWL_RECORDER_")) return false;

  handleRecorderMessage(message).then(sendResponse);
  return true;
});

async function handleRecorderMessage(message) {
  const target = await getTargetTab(message.tabId);
  if (!target.ok || !target.tab?.id) {
    return { ok: false, error: "Open a supported Notion tab first.", tab: target.tab };
  }

  if (message.type === "ACCESSOWL_RECORDER_GET_TAB") {
    return target;
  }

  try {
    const response = await chrome.tabs.sendMessage(target.tab.id, message);
    return { ok: true, tab: target.tab, ...response };
  } catch (error) {
    return {
      ok: false,
      tab: target.tab,
      error: error instanceof Error ? error.message : "Recorder content script did not respond."
    };
  }
}

async function getTargetTab(tabId) {
  if (Number.isInteger(tabId)) {
    return tabResponse(await chrome.tabs.get(tabId));
  }

  const [active] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (isSupportedUrl(active?.url)) return tabResponse(active);

  const candidates = await chrome.tabs.query({});
  return tabResponse(candidates.reverse().find((tab) => isSupportedUrl(tab.url)));
}

function tabResponse(tab) {
  return {
    ok: Boolean(tab?.id),
    tab: tab ? { id: tab.id, title: tab.title ?? "", url: tab.url ?? "" } : null
  };
}

function isSupportedUrl(url) {
  return /^https:\/\/(www\.)?notion\.so\//i.test(url || "");
}
