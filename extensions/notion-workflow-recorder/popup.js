const tabUrl = document.querySelector("#tab-url");
const status = document.querySelector("#status");
const recordingOutput = document.querySelector("#recording-output");
const startButton = document.querySelector("#start-button");
const stopButton = document.querySelector("#stop-button");
const clearButton = document.querySelector("#clear-button");
const targetTabId = Number(new URL(window.location.href).searchParams.get("tabId")) || undefined;

document.addEventListener("DOMContentLoaded", refreshStatus);
startButton.addEventListener("click", () => sendRecorderCommand("ACCESSOWL_RECORDER_START"));
clearButton.addEventListener("click", () => sendRecorderCommand("ACCESSOWL_RECORDER_CLEAR"));
stopButton.addEventListener("click", async () => {
  const response = await sendRecorderCommand("ACCESSOWL_RECORDER_STOP", false);
  if (response?.ok && response.recording) {
    recordingOutput.textContent = JSON.stringify(response.recording, null, 2);
    setStatus(`Exported ${response.recording.eventCount} recorded event(s).`);
  }
});

async function refreshStatus() {
  const response = await sendRecorderCommand("ACCESSOWL_RECORDER_STATUS", false);
  if (response?.ok) updateStatus(response);
}

async function sendRecorderCommand(type, updateOutput = true) {
  try {
    const response = await chrome.runtime.sendMessage({ type, tabId: targetTabId });
    if (!response?.ok) throw new Error(response?.error ?? "Recorder command failed.");

    updateStatus(response);
    if (updateOutput) recordingOutput.textContent = JSON.stringify(response.status ?? response.recording, null, 2);
    return response;
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "Recorder command failed.");
    return null;
  }
}

function updateStatus(response) {
  tabUrl.textContent = response.tab?.url ?? response.status?.pageUrl ?? "No supported tab found.";
  const eventCount = response.status?.eventCount ?? response.recording?.eventCount ?? 0;
  const recording = response.status?.recording ? "recording" : "idle";
  setStatus(`${recording}; ${eventCount} event(s) captured.`);
}

function setStatus(message) {
  status.textContent = message;
}
