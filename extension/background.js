const ACTION_ICON_PATHS = {
  16: "icons/icon-16.png",
  24: "icons/icon-24.png",
  32: "icons/icon-32.png",
  48: "icons/icon-48.png",
  128: "icons/icon-128.png",
};

function getChromeApi() {
  try {
    if (typeof globalThis === "undefined") return null;
    return globalThis.chrome || null;
  } catch {
    return null;
  }
}

function getLocalStorageArea() {
  const chromeApi = getChromeApi();
  const storageArea = chromeApi?.storage?.local || null;
  if (!storageArea || typeof storageArea.get !== "function" || typeof storageArea.set !== "function") {
    return null;
  }
  return storageArea;
}

async function ensureActionIcon() {
  try {
    const chromeApi = getChromeApi();
    if (!chromeApi?.action?.setIcon) return;
    await chromeApi.action.setIcon({ path: ACTION_ICON_PATHS });
  } catch {
    return;
  }
}

const chromeApi = getChromeApi();
chromeApi?.runtime?.onInstalled?.addListener(async () => {
  await ensureActionIcon();
});

chromeApi?.runtime?.onStartup?.addListener(async () => {
  await ensureActionIcon();
});

chromeApi?.tabs?.onUpdated?.addListener(async () => {
  await ensureActionIcon();
});

chromeApi?.tabs?.onActivated?.addListener(async () => {
  await ensureActionIcon();
});

ensureActionIcon();

chromeApi?.runtime?.onMessage?.addListener((message, _sender, sendResponse) => {
  if (!message || typeof message !== "object") return;

  const storageArea = getLocalStorageArea();
  if (!storageArea) {
    sendResponse({ ok: false, data: {} });
    return;
  }

  if (message.type === "BLOOMVE_STORAGE_GET") {
    storageArea.get(message.keys || null, (data) => {
      const runtimeError = getChromeApi()?.runtime?.lastError;
      if (runtimeError) {
        sendResponse({ ok: false, data: {} });
        return;
      }
      sendResponse({ ok: true, data: data || {} });
    });
    return true;
  }

  if (message.type === "BLOOMVE_STORAGE_SET") {
    storageArea.set(message.payload || {}, () => {
      const runtimeError = getChromeApi()?.runtime?.lastError;
      if (runtimeError) {
        sendResponse({ ok: false });
        return;
      }
      sendResponse({ ok: true });
    });
    return true;
  }
});
