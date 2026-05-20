(function attachAccessOwlRecorder(globalScope) {
  const MAX_EVENTS = 80;
  const MAX_TEXT_LENGTH = 140;

  const state = {
    recording: false,
    startedAt: null,
    stoppedAt: null,
    events: [],
    listenersAttached: false
  };

  function handleMessage(message) {
    if (message.type === "ACCESSOWL_RECORDER_STATUS") {
      return { status: snapshotStatus() };
    }

    if (message.type === "ACCESSOWL_RECORDER_START") {
      startRecording();
      return { status: snapshotStatus() };
    }

    if (message.type === "ACCESSOWL_RECORDER_STOP") {
      stopRecording();
      return { recording: exportRecording() };
    }

    if (message.type === "ACCESSOWL_RECORDER_CLEAR") {
      clearRecording();
      return { status: snapshotStatus() };
    }

    return { error: `Unknown recorder message: ${message.type}` };
  }

  function startRecording() {
    state.recording = true;
    state.startedAt = new Date().toISOString();
    state.stoppedAt = null;
    state.events = [];
    attachListeners();
    addOverlay();
  }

  function stopRecording() {
    state.recording = false;
    state.stoppedAt = new Date().toISOString();
    detachListeners();
    removeOverlay();
  }

  function clearRecording() {
    state.recording = false;
    state.startedAt = null;
    state.stoppedAt = null;
    state.events = [];
    detachListeners();
    removeOverlay();
  }

  function exportRecording() {
    return {
      schemaVersion: "accessowl.workflow-recording.v1",
      target: "notion",
      page: {
        url: redactText(globalScope.location.href),
        title: redactText(globalScope.document.title)
      },
      startedAt: state.startedAt,
      stoppedAt: state.stoppedAt,
      eventCount: state.events.length,
      events: state.events
    };
  }

  function attachListeners() {
    if (state.listenersAttached) return;
    globalScope.document.addEventListener("click", handleClick, true);
    globalScope.document.addEventListener("input", handleInput, true);
    globalScope.document.addEventListener("change", handleChange, true);
    globalScope.document.addEventListener("submit", handleSubmit, true);
    state.listenersAttached = true;
  }

  function detachListeners() {
    if (!state.listenersAttached) return;
    globalScope.document.removeEventListener("click", handleClick, true);
    globalScope.document.removeEventListener("input", handleInput, true);
    globalScope.document.removeEventListener("change", handleChange, true);
    globalScope.document.removeEventListener("submit", handleSubmit, true);
    state.listenersAttached = false;
  }

  function handleClick(event) {
    const element = nearestElement(event.target);
    if (!element || shouldIgnoreElement(element)) return;
    recordEvent("click", element);
  }

  function handleChange(event) {
    const element = nearestElement(event.target);
    if (!element || shouldIgnoreElement(element)) return;
    recordEvent("change", element, { value: inputValueSummary(element) });
  }

  function handleInput(event) {
    const element = nearestElement(event.target);
    if (!element || shouldIgnoreElement(element)) return;
    recordEvent("input", element, { value: inputValueSummary(element) });
  }

  function handleSubmit(event) {
    const element = nearestElement(event.target);
    if (!element || shouldIgnoreElement(element)) return;
    recordEvent("submit", element);
  }

  function recordEvent(type, element, extra = {}) {
    if (!state.recording || state.events.length >= MAX_EVENTS) return;

    state.events.push({
      id: state.events.length + 1,
      type,
      capturedAt: new Date().toISOString(),
      url: redactText(globalScope.location.href),
      target: describeElement(element),
      ...extra
    });
  }

  function describeElement(element) {
    return {
      tagName: element.tagName.toLowerCase(),
      role: element.getAttribute("role") || implicitRole(element),
      text: cleanText(visibleText(element)),
      label: cleanText(inputLabel(element)),
      placeholder: cleanText(element.getAttribute("placeholder") || ""),
      ariaLabel: cleanText(element.getAttribute("aria-label") || ""),
      testId: cleanText(element.getAttribute("data-testid") || element.getAttribute("data-test-id") || ""),
      selectorCandidates: selectorCandidates(element)
    };
  }

  function selectorCandidates(element) {
    const candidates = [];
    const role = element.getAttribute("role") || implicitRole(element);
    const name = cleanText(accessibleName(element));
    const label = cleanText(inputLabel(element));
    const placeholder = cleanText(element.getAttribute("placeholder") || "");
    const testId = cleanText(element.getAttribute("data-testid") || element.getAttribute("data-test-id") || "");
    const text = cleanText(visibleText(element));

    if (testId) candidates.push({ kind: "testId", value: testId, playwright: `page.getByTestId(${quote(testId)})` });
    if (role && name) candidates.push({ kind: "role", role, name, playwright: `page.getByRole(${quote(role)}, { name: ${quote(name)} })` });
    if (label) candidates.push({ kind: "label", value: label, playwright: `page.getByLabel(${quote(label)})` });
    if (placeholder) candidates.push({ kind: "placeholder", value: placeholder, playwright: `page.getByPlaceholder(${quote(placeholder)})` });
    if (text) candidates.push({ kind: "text", value: text, playwright: `page.getByText(${quote(text)})` });

    const css = cssSelector(element);
    if (css) candidates.push({ kind: "css", value: css, playwright: `page.locator(${quote(css)})` });

    return candidates.slice(0, 5);
  }

  function inputValueSummary(element) {
    if (!("value" in element)) return undefined;

    const type = element.getAttribute("type") || element.tagName.toLowerCase();
    if (/password/i.test(type)) {
      return { inputType: type, value: "[redacted-secret]", length: String(element.value || "").length };
    }

    return {
      inputType: type,
      value: cleanText(element.value || ""),
      length: String(element.value || "").length
    };
  }

  function snapshotStatus() {
    return {
      recording: state.recording,
      eventCount: state.events.length,
      pageUrl: redactText(globalScope.location.href),
      pageTitle: redactText(globalScope.document.title)
    };
  }

  function redactText(value) {
    return String(value || "")
      .replace(/https?:\/\/[^\s"'<>]*(invite|reset|password|token)[^\s"'<>]*/gi, "[redacted-link]")
      .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [redacted-token]")
      .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[redacted-email]")
      .replace(/\b(password|passwd|pwd|token|secret|session|csrf|auth|authorization|api[-_]?key)\b\s*[:=]\s*["']?[^"'\s<>,;]+/gi, "$1=[redacted-secret]")
      .replace(/\b(?:[a-f0-9]{32,}|[A-Za-z0-9_-]{40,})\b/g, "[redacted-token]");
  }

  function nearestElement(target) {
    if (!target) return null;
    if (target.nodeType === Node.ELEMENT_NODE) return target;
    return target.parentElement ?? null;
  }

  function shouldIgnoreElement(element) {
    return Boolean(element.closest("[data-accessowl-recorder-overlay]"));
  }

  function implicitRole(element) {
    const tag = element.tagName.toLowerCase();
    const type = (element.getAttribute("type") || "").toLowerCase();

    if (tag === "button" || type === "button" || type === "submit") return "button";
    if (tag === "a" && element.hasAttribute("href")) return "link";
    if (tag === "select") return "combobox";
    if (tag === "textarea") return "textbox";
    if (tag === "input" && ["checkbox", "radio"].includes(type)) return type;
    if (tag === "input") return "textbox";
    if (tag === "form") return "form";
    return "";
  }

  function accessibleName(element) {
    return (
      element.getAttribute("aria-label") ||
      inputLabel(element) ||
      visibleText(element) ||
      element.getAttribute("title") ||
      element.getAttribute("alt") ||
      ""
    );
  }

  function inputLabel(element) {
    if (element.labels?.[0]?.innerText) return element.labels[0].innerText;

    const id = element.getAttribute("id");
    if (id) {
      const label = element.ownerDocument.querySelector(`label[for="${cssEscape(id)}"]`);
      if (label?.innerText) return label.innerText;
    }

    return element.getAttribute("aria-label") || element.getAttribute("title") || "";
  }

  function visibleText(element) {
    if ("innerText" in element && element.innerText) return element.innerText;
    return element.textContent || "";
  }

  function cleanText(value) {
    return redactText(String(value || "").replace(/\s+/g, " ").trim()).slice(0, MAX_TEXT_LENGTH);
  }

  function cssSelector(element) {
    const tag = element.tagName.toLowerCase();
    const id = element.getAttribute("id");
    const testId = element.getAttribute("data-testid") || element.getAttribute("data-test-id");
    const name = element.getAttribute("name");
    const ariaLabel = element.getAttribute("aria-label");

    if (id) return `${tag}#${cssEscape(id)}`;
    if (testId) return `${tag}[data-testid="${cssEscape(testId)}"]`;
    if (name) return `${tag}[name="${cssEscape(name)}"]`;
    if (ariaLabel) return `${tag}[aria-label="${cssEscape(ariaLabel)}"]`;
    return tag;
  }

  function quote(value) {
    return JSON.stringify(value);
  }

  function cssEscape(value) {
    if (globalScope.CSS?.escape) return globalScope.CSS.escape(value);
    return String(value).replace(/["\\]/g, "\\$&");
  }

  function addOverlay() {
    if (globalScope.document.querySelector("[data-accessowl-recorder-overlay]")) return;

    const overlay = globalScope.document.createElement("div");
    overlay.dataset.accessowlRecorderOverlay = "true";
    overlay.textContent = "AccessOwl recording";
    overlay.style.cssText = [
      "position:fixed",
      "right:16px",
      "bottom:16px",
      "z-index:2147483647",
      "padding:8px 10px",
      "border-radius:8px",
      "background:#12614f",
      "color:#fff",
      "font:600 12px system-ui,sans-serif",
      "box-shadow:0 8px 28px rgba(0,0,0,.2)",
      "pointer-events:none"
    ].join(";");
    globalScope.document.documentElement.appendChild(overlay);
  }

  function removeOverlay() {
    globalScope.document.querySelector("[data-accessowl-recorder-overlay]")?.remove();
  }

  globalScope.AccessOwlRecorder = {
    handleMessage,
    redactText,
    _state: state
  };
})(globalThis);
