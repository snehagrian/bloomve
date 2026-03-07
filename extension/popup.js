const apiBaseUrlInput = document.getElementById("apiBaseUrl");
const secretInput = document.getElementById("secret");
const roomIdInput = document.getElementById("roomId");
const titleInput = document.getElementById("title");
const roomSelect = document.getElementById("roomSelect");
const currentUrlEl = document.getElementById("currentUrl");
const statusEl = document.getElementById("status");
const shareBtn = document.getElementById("shareBtn");
const refreshRoomsBtn = document.getElementById("refreshRooms");

let activeTabUrl = "";

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.style.color = isError ? "#dc2626" : "#4b5563";
}

async function getCurrentTabUrl() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs?.[0];
  activeTabUrl = tab?.url || "";
  currentUrlEl.textContent = activeTabUrl || "No active tab URL found.";
}

function getConfig() {
  return {
    apiBaseUrl: apiBaseUrlInput.value.trim(),
    secret: secretInput.value.trim(),
    roomId: roomIdInput.value.trim(),
  };
}

async function saveConfig() {
  const config = getConfig();
  await chrome.storage.sync.set(config);
}

async function loadConfig() {
  const saved = await chrome.storage.sync.get(["apiBaseUrl", "secret", "roomId"]);
  apiBaseUrlInput.value = saved.apiBaseUrl || "http://localhost:3000";
  secretInput.value = saved.secret || "";
  roomIdInput.value = saved.roomId || "";
}

async function fetchRooms() {
  const { apiBaseUrl, secret } = getConfig();

  if (!apiBaseUrl || !secret) {
    setStatus("Set API base URL and secret first.", true);
    return;
  }

  try {
    setStatus("Loading rooms...");

    const response = await fetch(`${apiBaseUrl}/api/share`, {
      method: "GET",
      headers: {
        "X-Bloomve-Secret": secret,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.error || "Could not fetch rooms.");
    }

    roomSelect.innerHTML = '<option value="">Select a room</option>';

    data.rooms.forEach((room) => {
      const option = document.createElement("option");
      option.value = room.id;
      option.textContent = `${room.name} (${room.type}/${room.privacy})`;
      roomSelect.appendChild(option);
    });

    if (roomIdInput.value) {
      roomSelect.value = roomIdInput.value;
    }

    setStatus(`Loaded ${data.rooms.length} rooms.`);
  } catch (error) {
    setStatus(error.message || "Room load failed.", true);
  }
}

roomSelect.addEventListener("change", () => {
  if (roomSelect.value) {
    roomIdInput.value = roomSelect.value;
    saveConfig();
  }
});

[apiBaseUrlInput, secretInput, roomIdInput].forEach((el) => {
  el.addEventListener("change", saveConfig);
});

refreshRoomsBtn.addEventListener("click", async () => {
  await saveConfig();
  await fetchRooms();
});

shareBtn.addEventListener("click", async () => {
  const { apiBaseUrl, secret, roomId } = getConfig();
  const title = titleInput.value.trim();

  if (!apiBaseUrl || !secret || !roomId) {
    setStatus("API base URL, secret, and room ID are required.", true);
    return;
  }

  if (!activeTabUrl) {
    setStatus("Could not read the current tab URL.", true);
    return;
  }

  try {
    setStatus("Sharing...");
    shareBtn.disabled = true;

    const response = await fetch(`${apiBaseUrl}/api/share`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Bloomve-Secret": secret,
      },
      body: JSON.stringify({
        roomId,
        jobUrl: activeTabUrl,
        title,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.error || "Share failed.");
    }

    setStatus("Job URL shared successfully.");
  } catch (error) {
    setStatus(error.message || "Share failed.", true);
  } finally {
    shareBtn.disabled = false;
  }
});

(async function init() {
  await loadConfig();
  await getCurrentTabUrl();
  await fetchRooms();
})();
