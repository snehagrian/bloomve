const roomSelectionList = document.getElementById("roomSelectionList");
const currentUrlEl = document.getElementById("currentUrl");
const statusEl = document.getElementById("status");
const loginRequiredEl = document.getElementById("loginRequired");
const mainContentEl = document.getElementById("mainContent");
const openLoginBtn = document.getElementById("openLoginBtn");
const shareBtn = document.getElementById("shareBtn");
const refreshRoomsBtn = document.getElementById("refreshRooms");
const saveJobBtn = document.getElementById("saveJobBtn");
const addToNotesIconBtn = document.getElementById("addToNotesIconBtn");
const saveRecruitersBtn = document.getElementById("saveRecruitersBtn");
const recruitersJobField = document.getElementById("recruitersJobField");
const recruitersJobSelect = document.getElementById("recruitersJobSelect");
const confirmSaveRecruitersBtn = document.getElementById("confirmSaveRecruitersBtn");
const popupCard = document.getElementById("popupCard");
const POPUP_ANIMATION_MS = 300;

const RECRUITERS_STORAGE_KEY = "bloomveLinkedInRecruiters";
const CHANNELS_REFRESH_INTERVAL_MS = 15000;

let activeTabUrl = "";
let recruiterPayload = null;
let authToken = "";
let backendUrl = "";
let channelsRefreshTimer = null;
let isFetchingChannels = false;

function getChromeApi() {
  try {
    if (typeof globalThis === "undefined") return null;
    return globalThis.chrome || null;
  } catch {
    return null;
  }
}

function getStorageArea(name) {
  const chromeApi = getChromeApi();
  const storageArea = chromeApi?.storage?.[name] || null;
  if (!storageArea || typeof storageArea.get !== "function") {
    return null;
  }
  return storageArea;
}

function hasExtensionContext() {
  const chromeApi = getChromeApi();
  return !!chromeApi?.runtime?.id;
}

function readStorage(name, keys) {
  return new Promise((resolve) => {
    const storageArea = getStorageArea(name);
    if (!storageArea) {
      resolve({});
      return;
    }

    try {
      storageArea.get(keys, (result) => {
        const chromeApi = getChromeApi();
        if (chromeApi?.runtime?.lastError) {
          resolve({});
          return;
        }
        resolve(result || {});
      });
    } catch {
      resolve({});
    }
  });
}

async function readLocal(keys) {
  return readStorage("local", keys);
}

function writeStorage(name, payload) {
  return new Promise((resolve) => {
    const storageArea = getStorageArea(name);
    if (!storageArea || typeof storageArea.set !== "function") {
      resolve(false);
      return;
    }

    try {
      storageArea.set(payload, (result) => {
        const chromeApi = getChromeApi();
        if (chromeApi?.runtime?.lastError) {
          resolve(false);
          return;
        }
        resolve(result || true);
      });
    } catch {
      resolve(false);
    }
  });
}

async function writeLocal(payload) {
  return writeStorage("local", payload);
}

async function readSync(keys) {
  return readStorage("sync", keys);
}

async function readAccountFromStorage() {
  const fromLocal = await readLocal(["userId", "currentUserId"]);
  if (fromLocal?.userId || fromLocal?.currentUserId) {
    return fromLocal;
  }
  return readSync(["userId", "currentUserId"]);
}

async function safeTabsQuery(queryInfo) {
  try {
    const chromeApi = getChromeApi();
    if (!chromeApi?.tabs?.query) return [];
    return (await chromeApi.tabs.query(queryInfo)) || [];
  } catch {
    return [];
  }
}

async function safeExecuteScript(tabId, files) {
  try {
    const chromeApi = getChromeApi();
    if (!chromeApi?.scripting?.executeScript || !tabId) return false;
    await chromeApi.scripting.executeScript({
      target: { tabId },
      files,
    });
    return true;
  } catch {
    return false;
  }
}

async function safeCreateTab(url) {
  try {
    const chromeApi = getChromeApi();
    if (!chromeApi?.tabs?.create) return false;
    await chromeApi.tabs.create({ url });
    return true;
  } catch {
    return false;
  }
}

function animatePopupOpen() {
  if (!popupCard) return;

  popupCard.classList.remove("is-closing");
  popupCard.classList.add("is-open");
}

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.style.color = isError ? "#dc2626" : "#4b5563";
}

function setAuthRequiredUi(isRequired) {
  loginRequiredEl.style.display = isRequired ? "block" : "none";
  mainContentEl.style.display = isRequired ? "none" : "block";
}

async function loadAuthAndBackend() {
  const data = await readLocal(["authToken", "idToken", "backendUrl"]);
  authToken = data?.authToken || data?.idToken || "";
  backendUrl = data?.backendUrl || "";
  await ensureBackendUrl();

  return { authToken, backendUrl };
}

function isBloomveyUrl(url = "") {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//i.test(url) || /https?:\/\/([\w-]+\.)?(bloomve|bloomvey)\.app\//i.test(url);
}

async function detectBloomveyOriginFromTabs() {
  const tabs = await safeTabsQuery({});
  const websiteTab = tabs.find((tab) => isBloomveyUrl(tab.url || "") && tab.url);
  if (!websiteTab?.url) return "";

  try {
    return new URL(websiteTab.url).origin;
  } catch {
    return "";
  }
}

function getFallbackBackendCandidates(detectedOrigin = "") {
  const defaultCandidates = ["http://localhost:3000", "http://localhost:3002", "http://localhost:5000"];
  if (!backendUrl) {
    return [...new Set([detectedOrigin, ...defaultCandidates].filter(Boolean))];
  }

  if (/^https?:\/\/(localhost|127\.0\.0\.1):5000$/i.test(backendUrl)) {
    return [...new Set([detectedOrigin, "http://localhost:3000", "http://localhost:3002", backendUrl].filter(Boolean))];
  }

  return [...new Set([detectedOrigin, backendUrl, ...defaultCandidates].filter(Boolean))];
}

async function ensureBackendUrl() {
  if (backendUrl) return backendUrl;

  const detectedOrigin = await detectBloomveyOriginFromTabs();
  if (detectedOrigin) {
    backendUrl = detectedOrigin;
    await writeLocal({ backendUrl: detectedOrigin });
    return backendUrl;
  }

  backendUrl = "http://localhost:3000";
  return backendUrl;
}

async function trySyncAuthFromBloomveyTab() {
  if (!hasExtensionContext()) return;

  try {
    const tabs = await safeTabsQuery({});
    const websiteTabs = tabs.filter((tab) => isBloomveyUrl(tab.url || "") && tab.id);
    if (!websiteTabs.length) return;

    await Promise.all(
      websiteTabs.map((tab) => safeExecuteScript(tab.id, ["authBridge.js"]))
    );
  } catch {
    return;
  }
}

async function getCurrentTabUrl() {
  const tabs = await safeTabsQuery({ active: true, currentWindow: true });
  const tab = tabs?.[0];
  activeTabUrl = tab?.url || "";
  currentUrlEl.textContent = activeTabUrl || "No active tab URL found.";
}

async function loadConfig() {
  const saved = await readLocal(["backendUrl"]);
  backendUrl = saved.backendUrl || "";
  await ensureBackendUrl();
}

function normalizeChannelItems(data) {
  if (!Array.isArray(data?.items)) {
    return [];
  }

  const merged = new Map();
  data.items.forEach((item) => {
    const id = item?.id;
    if (!id) return;

    merged.set(id, {
      ...item,
      id,
      kind: item?.kind || item?.type || "channel",
    });
  });

  return Array.from(merged.values());
}

function renderRoomSelection(items) {
  roomSelectionList.innerHTML = "";

  if (!items.length) {
    const empty = document.createElement("div");
    empty.className = "room-selection-empty";
    empty.textContent = "No chats/channels found.";
    roomSelectionList.appendChild(empty);
    return;
  }

  items.forEach((room) => {
    const roomId = room.id || room.channelId;
    if (!roomId) return;

    const row = document.createElement("label");
    row.className = "room-selection-item";
    row.dataset.roomId = roomId;
    row.dataset.channelName = room.name || room.title || "Untitled";
    row.dataset.channelKind = room.kind || room.type || "channel";

    const visBox = document.createElement("span");
    visBox.className = "room-selection-box";

    const setBoxState = (isChecked) => {
      row.classList.toggle("is-selected", isChecked);
      row.style.background = isChecked ? "#ecfdf5" : "";
      visBox.style.borderColor = isChecked ? "#16a34a" : "#9ca3af";
      visBox.style.background = isChecked ? "#16a34a" : "#ffffff";
      visBox.textContent = isChecked ? "\u2713" : "";
    };

    let checked = false;
    setBoxState(false);

    row.addEventListener("click", () => {
      checked = !checked;
      setBoxState(checked);
    });

    const labelContent = document.createElement("span");
    labelContent.className = "room-selection-label";

    const name = document.createElement("span");
    name.className = "room-selection-name";
    name.textContent = row.dataset.channelName;

    const kind = document.createElement("span");
    kind.className = "room-selection-kind";
    kind.textContent = row.dataset.channelKind;

    labelContent.appendChild(name);
    labelContent.appendChild(kind);
    row.appendChild(visBox);
    row.appendChild(labelContent);
    roomSelectionList.appendChild(row);
  });
}

function getSelectedRooms() {
  return Array.from(roomSelectionList.querySelectorAll("label.room-selection-item.is-selected")).map((label) => ({
    id: label.dataset.roomId || "",
    name: label.dataset.channelName || "Channel",
  }));
}

function normalizeNotesItems(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.notes)) return data.notes;
  if (Array.isArray(data?.items)) return data.items;
  return [];
}

function getJobLabel(job) {
  const title = job.title || job.jobTitle || "Untitled job";
  const company = job.company || "Unknown company";
  return `${title} — ${company}`;
}

function setRecruiterControlsVisibility() {
  const hasRecruiters = Array.isArray(recruiterPayload?.recruiters) && recruiterPayload.recruiters.length > 0;
  saveRecruitersBtn.style.display = hasRecruiters ? "block" : "none";

  if (!hasRecruiters) {
    recruitersJobField.style.display = "none";
    recruitersJobSelect.innerHTML = '<option value="">Select a saved job</option>';
  }
}

async function loadRecruitersFromStorage() {
  const stored = await readLocal([RECRUITERS_STORAGE_KEY]);
  recruiterPayload = stored?.[RECRUITERS_STORAGE_KEY] || null;
  setRecruiterControlsVisibility();
}

async function loadSavedJobsForRecruiters() {
  if (!backendUrl || !authToken) {
    setStatus("Please log in to Bloomvey first", true);
    return false;
  }

  const response = await fetch(`${backendUrl}/api/notes`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error || "Could not load saved jobs.");
  }

  const jobs = normalizeNotesItems(data);
  recruitersJobSelect.innerHTML = '<option value="">Select a saved job</option>';

  jobs.forEach((job) => {
    const jobId = job.id || job.jobId || job.noteId || job._id;
    if (!jobId) return;

    const option = document.createElement("option");
    option.value = jobId;
    option.textContent = getJobLabel(job);
    recruitersJobSelect.appendChild(option);
  });

  return true;
}

async function fetchChannels() {
  if (isFetchingChannels) {
    return;
  }

  isFetchingChannels = true;

  if (!authToken) {
    setStatus("Please log in to Bloomvey first", true);
    isFetchingChannels = false;
    return;
  }

  const account = await readAccountFromStorage();
  const userId = account.userId || account.currentUserId || "";
  const detectedOrigin = await detectBloomveyOriginFromTabs();
  const backendCandidates = getFallbackBackendCandidates(detectedOrigin);

  try {
    setStatus("Loading channels...");

    let response = null;
    let data = null;
    let lastError = null;

    for (const candidate of backendCandidates) {
      try {
        const candidateResponse = await fetch(`${candidate}/api/channels`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${authToken}`,
            "X-Bloomve-User-Id": userId,
          },
        });

        const candidateData = await candidateResponse.json();

        if (candidateResponse.ok || candidateResponse.status === 401) {
          response = candidateResponse;
          data = candidateData;

          if (candidate !== backendUrl) {
            backendUrl = candidate;
            await writeLocal({ backendUrl: candidate });
          }
          break;
        }

        lastError = new Error(candidateData?.error || "Could not fetch channels.");
      } catch (error) {
        lastError = error;
      }
    }

    if (!response) {
      throw lastError || new Error("Could not fetch channels.");
    }

    if (response.status === 401) {
      setStatus("Session expired — please log in again.", true);
      setAuthRequiredUi(true);
      return;
    }

    if (!response.ok) {
      throw new Error(data?.error || "Could not fetch channels.");
    }

    const channels = normalizeChannelItems(data);
    renderRoomSelection(channels);

    setStatus(`Loaded ${channels.length} channels/chats.`);
  } catch (error) {
    console.error("Failed to fetch channels:", error);
    setStatus("Failed to fetch channels - check console for details", true);
  } finally {
    isFetchingChannels = false;
  }
}

function stopChannelsAutoRefresh() {
  if (channelsRefreshTimer) {
    window.clearInterval(channelsRefreshTimer);
    channelsRefreshTimer = null;
  }
}

function startChannelsAutoRefresh() {
  stopChannelsAutoRefresh();

  channelsRefreshTimer = window.setInterval(() => {
    if (document.hidden || !authToken) {
      return;
    }

    void fetchChannels();
  }, CHANNELS_REFRESH_INTERVAL_MS);
}

openLoginBtn.addEventListener("click", async () => {
  const detectedOrigin = await detectBloomveyOriginFromTabs();
  const loginUrl = `${detectedOrigin || backendUrl || "http://localhost:3000"}/login`;
  await safeCreateTab(loginUrl);
});

refreshRoomsBtn.addEventListener("click", async () => {
  await fetchChannels();
});

window.addEventListener("focus", () => {
  if (!authToken) return;
  void fetchChannels();
});

document.addEventListener("visibilitychange", () => {
  if (!document.hidden && authToken) {
    void fetchChannels();
  }
});

window.addEventListener("beforeunload", () => {
  stopChannelsAutoRefresh();
});

saveRecruitersBtn.addEventListener("click", async () => {
  try {
    if (!Array.isArray(recruiterPayload?.recruiters) || recruiterPayload.recruiters.length === 0) {
      setStatus("No recruiter data available yet.", true);
      return;
    }

    saveRecruitersBtn.disabled = true;
    setStatus("Loading saved jobs...");
    const loaded = await loadSavedJobsForRecruiters();

    if (loaded) {
      recruitersJobField.style.display = "block";
      setStatus("Pick a saved job for these recruiters.");
    }
  } catch (error) {
    setStatus(error.message || "Failed to load saved jobs.", true);
  } finally {
    saveRecruitersBtn.disabled = false;
  }
});

confirmSaveRecruitersBtn.addEventListener("click", async () => {
  const jobId = recruitersJobSelect.value;
  const recruiters = Array.isArray(recruiterPayload?.recruiters) ? recruiterPayload.recruiters : [];

  if (!backendUrl || !authToken || !jobId || recruiters.length === 0) {
    setStatus("Choose a job and ensure recruiter data is available.", true);
    return;
  }

  try {
    confirmSaveRecruitersBtn.disabled = true;
    setStatus("Saving recruiters...");

    const response = await fetch(`${backendUrl}/api/notes/${encodeURIComponent(jobId)}/recruiters`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ recruiters }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.error || "Failed to save recruiters.");
    }

    setStatus("Recruiters saved ✓");
  } catch (error) {
    setStatus(error.message || "Failed to save recruiters.", true);
  } finally {
    confirmSaveRecruitersBtn.disabled = false;
  }
});

if (getChromeApi()?.runtime?.onMessage?.addListener) {
  getChromeApi().runtime.onMessage.addListener((message) => {
    if (message?.type === "BLOOMVE_RECRUITERS_READY") {
      recruiterPayload = message.payload || recruiterPayload;
      setRecruiterControlsVisibility();
    }
  });
}

saveJobBtn.addEventListener("click", async () => {
  if (!backendUrl) {
    setStatus("Failed to save — please try again", true);
    return;
  }

  saveJobBtn.disabled = true;

  try {
    const { bloomveCurrentJob } = await readLocal(["bloomveCurrentJob"]);
    const auth = await readAccountFromStorage();
    const userId = auth.userId || auth.currentUserId || "";

    if (!authToken || !bloomveCurrentJob) {
      throw new Error("missing-auth-or-job-data");
    }

    const payload = bloomveCurrentJob.onlyUrlAvailable
      ? {
          url: bloomveCurrentJob.url || activeTabUrl || "",
          userId,
        }
      : {
          userId,
          title: bloomveCurrentJob.title || "",
          company: bloomveCurrentJob.company || "",
          location: bloomveCurrentJob.location || "",
          salary: bloomveCurrentJob.salary || "Not listed",
          url: bloomveCurrentJob.url || activeTabUrl || "",
        };

    const response = await fetch(`${backendUrl}/api/notes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error("save-failed");
    }

    setStatus("Job saved to Bloomvey Notes ✓");
  } catch {
    setStatus("Failed to save — please try again", true);
  } finally {
    saveJobBtn.disabled = false;
  }
});

addToNotesIconBtn.addEventListener("click", async () => {
  saveJobBtn.click();
});

shareBtn.addEventListener("click", async () => {
  const selectedRooms = getSelectedRooms();

  if (!backendUrl || !authToken || selectedRooms.length === 0) {
    setStatus("API base URL, auth token, and at least one chat/channel selection are required.", true);
    return;
  }

  if (!activeTabUrl) {
    setStatus("Could not read the current tab URL.", true);
    return;
  }

  try {
    setStatus("Sharing...");
    shareBtn.disabled = true;

    const results = await Promise.all(
      selectedRooms.map(async (room) => {
        const response = await fetch(`${backendUrl}/api/channels/${encodeURIComponent(room.id)}/messages`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            message: activeTabUrl,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.error || `Share failed for ${room.name}.`);
        }

        return room.name;
      })
    );

    setStatus(`Shared to ${results.length} chat(s)/channel(s) ✓`);
  } catch (error) {
    setStatus(error.message || "Share failed.", true);
  } finally {
    shareBtn.disabled = false;
  }
});

(async function init() {
  animatePopupOpen();
  await loadConfig();
  await getCurrentTabUrl();
  await loadAuthAndBackend();

  if (!authToken) {
    await trySyncAuthFromBloomveyTab();
    await loadAuthAndBackend();
  }

  if (!authToken) {
    setAuthRequiredUi(true);
    setStatus("Please log in to Bloomvey first", true);
    return;
  }

  setAuthRequiredUi(false);
  await loadRecruitersFromStorage();
  await fetchChannels();
  startChannelsAutoRefresh();
})();
