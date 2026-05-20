chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message?.type?.startsWith("ACCESSOWL_RECORDER_")) return false;

  sendResponse(globalThis.AccessOwlRecorder.handleMessage(message));
  return true;
});
