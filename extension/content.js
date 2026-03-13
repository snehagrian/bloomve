(() => {
  const ROOT_ID = "bloomve-mini-root";
  const LAUNCHER_ID = "bloomve-mini-launcher";
  const PANEL_ID = "bloomve-mini-panel";
  const MESSAGE_INPUT_ID = "bloomve-mini-message";
  const STORAGE_KEY = "bloomveCurrentJob";

  let activeUrl = window.location.href;
  let selectedRoomIds = new Set();
  let availableRooms = [];

  function noop() {}

  function getChromeApi() {
    try {
      if (typeof globalThis === "undefined") return null;
      return globalThis.chrome || null;
    } catch {
      return null;
    }
  }

  function safeSendMessage(message) {
    return new Promise((resolve) => {
      try {
        const chromeApi = getChromeApi();
        if (!chromeApi?.runtime?.sendMessage) {
          resolve(null);
          return;
        }

        chromeApi.runtime.sendMessage(message, (response) => {
          if (chromeApi?.runtime?.lastError) {
            resolve(null);
            return;
          }
          resolve(response || null);
        });
      } catch {
        resolve(null);
      }
    });
  }

  function canUseLocalStorageApi() {
    return !!getChromeApi()?.runtime?.id;
  }

  async function readFromExtensionLocal(keys) {
    if (!hasExtensionContext() || !canUseLocalStorageApi()) {
      return {};
    }

    const response = await safeSendMessage({ type: "BLOOMVE_STORAGE_GET", keys });
    if (!response?.ok) return {};
    return response.data || {};
  }

  async function writeToExtensionLocal(payload) {
    if (!hasExtensionContext() || !canUseLocalStorageApi()) {
      return false;
    }

    const response = await safeSendMessage({ type: "BLOOMVE_STORAGE_SET", payload });
    return !!response?.ok;
  }

  function hasExtensionContext() {
    try {
      const chromeApi = getChromeApi();
      return !!chromeApi?.runtime?.id;
    } catch {
      return false;
    }
  }

  function isSupportedJobUrl(url = "") {
    return /https?:\/\/(?:[^/]+\.)?(linkedin\.com\/jobs\/|indeed\.com\/|myworkdayjobs\.com\/|greenhouse\.io\/jobs\/)/i.test(url);
  }

  function normalizeRoomItems(data) {
    const items = [];
    if (Array.isArray(data?.channels)) data.channels.forEach((channel) => items.push({ ...channel, kind: "channel" }));
    if (Array.isArray(data?.chats)) data.chats.forEach((chat) => items.push({ ...chat, kind: "chat" }));
    if (Array.isArray(data?.items)) data.items.forEach((item) => items.push(item));
    if (Array.isArray(data?.rooms)) data.rooms.forEach((room) => items.push(room));
    return items;
  }

  function pickText(selectors) {
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      const value = element?.textContent?.replace(/\s+/g, " ").trim();
      if (value) return value;
    }
    return "";
  }

  function normalizeSalary(value) {
    return value || "Not listed";
  }

  function extractJobDataForCurrentPage() {
    const currentUrl = window.location.href;

    if (currentUrl.includes("myworkdayjobs.com") || currentUrl.includes("greenhouse.io/jobs")) {
      return {
        source: currentUrl.includes("myworkdayjobs.com") ? "workday" : "greenhouse",
        onlyUrlAvailable: true,
        url: currentUrl,
        extractedAt: new Date().toISOString(),
      };
    }

    if (currentUrl.includes("linkedin.com/jobs")) {
      return {
        source: "linkedin",
        title: pickText(["h1.top-card-layout__title", "h1.t-24.t-bold.inline", "h1"]),
        company: pickText([
          ".topcard__org-name-link",
          ".topcard__flavor-row .topcard__flavor",
          ".job-details-jobs-unified-top-card__company-name a",
          ".job-details-jobs-unified-top-card__company-name",
        ]),
        location: pickText([
          ".topcard__flavor.topcard__flavor--bullet",
          ".jobs-unified-top-card__bullet",
          ".job-details-jobs-unified-top-card__primary-description-container span",
        ]),
        salary: normalizeSalary(
          pickText([
            ".salary.compensation__salary",
            ".job-details-jobs-unified-top-card__job-insight span",
            ".jobs-box__html-content strong",
          ])
        ),
        url: currentUrl,
        extractedAt: new Date().toISOString(),
      };
    }

    if (currentUrl.includes("indeed.com/viewjob") || currentUrl.includes("indeed.com")) {
      return {
        source: "indeed",
        title: pickText(["h1.jobsearch-JobInfoHeader-title", "h1[data-testid='jobsearch-JobInfoHeader-title']", "h1"]),
        company: pickText([
          "[data-testid='inlineHeader-companyName']",
          ".jobsearch-InlineCompanyRating div:first-child",
          "[data-company-name='true']",
        ]),
        location: pickText([
          "[data-testid='job-location']",
          "#jobLocationText",
          ".jobsearch-JobInfoHeader-subtitle div:last-child",
        ]),
        salary: normalizeSalary(
          pickText([
            "#salaryInfoAndJobType",
            "[data-testid='jobsearch-JobMetadataHeader-item']",
            ".js-match-insights-provider-tvvxwd.e1wnkr790",
          ])
        ),
        url: currentUrl,
        extractedAt: new Date().toISOString(),
      };
    }

    return null;
  }

  async function saveExtractedJobData() {
    if (!hasExtensionContext()) return;

    const jobData = extractJobDataForCurrentPage();
    if (!jobData) return;

    await writeToExtensionLocal({ [STORAGE_KEY]: jobData });
  }

  async function getConfig() {
    const saved = await readFromExtensionLocal(["backendUrl", "authToken", "idToken"]);
    return {
      apiBaseUrl: saved.backendUrl || "http://localhost:3000",
      authToken: saved.authToken || saved.idToken || "",
    };
  }

  function getFallbackBackendCandidates(primaryBaseUrl = "") {
    const defaultCandidates = ["http://localhost:3000", "http://localhost:3002", "http://localhost:5000"];

    if (!primaryBaseUrl) {
      return defaultCandidates;
    }

    const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(primaryBaseUrl);
    if (!isLocalhost) {
      return [...new Set([primaryBaseUrl, ...defaultCandidates])];
    }

    if (/^https?:\/\/(localhost|127\.0\.0\.1):5000$/i.test(primaryBaseUrl)) {
      return [...new Set(["http://localhost:3000", "http://localhost:3002", primaryBaseUrl])];
    }

    return [...new Set([primaryBaseUrl, ...defaultCandidates])];
  }

  async function fetchJsonAcrossBackends(path, init, options = { acceptUnauthorized: false }) {
    const config = await getConfig();
    const candidates = getFallbackBackendCandidates(config.apiBaseUrl);
    let lastError = null;

    for (const baseUrl of candidates) {
      try {
        const response = await fetch(`${baseUrl}${path}`, init);

        let data = {};
        try {
          data = await response.json();
        } catch {
          data = {};
        }

        if (response.ok || (options.acceptUnauthorized && response.status === 401)) {
          if (baseUrl !== config.apiBaseUrl) {
            await writeToExtensionLocal({ backendUrl: baseUrl });
          }

          return { response, data, baseUrl };
        }

        lastError = new Error(data?.error || `Request failed (${response.status})`);
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error("Request failed.");
  }

  async function getAccountInfo() {
    const account = await readFromExtensionLocal(["userId", "currentUserId"]);
    return {
      userId: account?.userId || "",
      currentUserId: account?.currentUserId || "",
    };
  }

  function setStatus(message, isError = false) {
    const statusEl = document.getElementById("bloomve-mini-status");
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.style.color = isError ? "#dc2626" : "#6b7280";
  }

  function getSelectedRooms() {
    return availableRooms.filter((room) => {
      const roomId = room.id || room.channelId;
      return !!roomId && selectedRoomIds.has(roomId);
    });
  }

  function getCurrentJobUrl() {
    return window.location.href || activeUrl;
  }

  function getShareMessage() {
    const messageInput = document.getElementById(MESSAGE_INPUT_ID);
    const typedValue = messageInput?.value?.trim() || "";
    return typedValue || getCurrentJobUrl();
  }

  async function fetchRooms() {
    const listEl = document.getElementById("bloomve-mini-rooms");
    if (!listEl) return;

    const { authToken } = await getConfig();
    const account = await getAccountInfo();
    const userId = account.userId || account.currentUserId || "";

    if (!authToken) {
      setStatus("Please log in to Bloomvey website to sync your account.", true);
      listEl.innerHTML = "";
      return;
    }

    try {
      setStatus("Loading chats/channels...");
      const { response, data } = await fetchJsonAcrossBackends(
        "/api/channels",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${authToken}`,
            "X-Bloomve-User-Id": userId,
          },
        },
        { acceptUnauthorized: true }
      );

      if (response.status === 401) {
        setStatus("Session expired — please log in again.", true);
        listEl.innerHTML = "";
        return;
      }

      if (!response.ok) {
        throw new Error(data?.error || "Could not load chats/channels.");
      }

      const rooms = normalizeRoomItems(data);
      availableRooms = rooms;
      listEl.innerHTML = "";

      if (!rooms.length) {
        const empty = document.createElement("li");
        empty.textContent = "No chats/channels found.";
        empty.style.padding = "10px";
        empty.style.fontSize = "12px";
        empty.style.color = "#6b7280";
        listEl.appendChild(empty);
        setStatus("No chats/channels available.", true);
        return;
      }

      rooms.forEach((room, index) => {
        const roomId = room.id || room.channelId;
        if (!roomId) return;

        const isSelected = selectedRoomIds.has(roomId);

        const row = document.createElement("li");
        row.className = "bloomve-room-row";
        row.dataset.roomId = roomId;
        row.style.padding = "10px";
        row.style.display = "flex";
        row.style.alignItems = "flex-start";
        row.style.gap = "8px";
        row.style.borderBottom = "1px solid #f3f4f6";
        row.style.cursor = "pointer";
        row.style.background = isSelected ? "#eef2ff" : "#ffffff";

        const checkbox = document.createElement("span");
        checkbox.style.display = "inline-flex";
        checkbox.style.alignItems = "center";
        checkbox.style.justifyContent = "center";
        checkbox.style.width = "16px";
        checkbox.style.height = "16px";
        checkbox.style.minWidth = "16px";
        checkbox.style.flexShrink = "0";
        checkbox.style.borderRadius = "4px";
        checkbox.style.border = isSelected ? "1.5px solid #ec4899" : "1.5px solid #9ca3af";
        checkbox.style.background = isSelected ? "#ec4899" : "#ffffff";
        checkbox.style.color = "#ffffff";
        checkbox.style.fontSize = "10px";
        checkbox.style.fontWeight = "700";
        checkbox.style.lineHeight = "1";
        checkbox.style.margin = "2px 0 0";
        checkbox.style.userSelect = "none";
        checkbox.style.transition = "border-color 120ms ease, background 120ms ease";
        checkbox.style.boxSizing = "border-box";
        checkbox.textContent = isSelected ? "\u2713" : "";

        const content = document.createElement("div");
        content.style.minWidth = "0";
        content.style.flex = "1";

        const name = document.createElement("div");
        name.textContent = room.name || room.title || "Untitled";
        name.style.fontSize = "12px";
        name.style.fontWeight = "600";
        name.style.color = "#111827";

        const kind = document.createElement("div");
        kind.textContent = (room.kind || room.type || "room").toString();
        kind.style.fontSize = "11px";
        kind.style.color = "#6b7280";

        content.appendChild(name);
        content.appendChild(kind);

        row.appendChild(checkbox);
        row.appendChild(content);

        const toggleSelection = () => {
          if (selectedRoomIds.has(roomId)) {
            selectedRoomIds.delete(roomId);
          } else {
            selectedRoomIds.add(roomId);
          }

          void fetchRooms();

          const selectedCount = selectedRoomIds.size;
          if (!selectedCount) {
            setStatus("No chat/channel selected.");
          } else {
            setStatus(`Selected ${selectedCount} chats/channels.`);
          }
        };

        checkbox.addEventListener("click", (event) => {
          event.stopPropagation();
          toggleSelection();
        });

        row.addEventListener("click", toggleSelection);

        listEl.appendChild(row);

        if (!selectedRoomIds.size && index === 0) {
          selectedRoomIds = new Set([roomId]);
          row.style.background = "#eef2ff";
          checkbox.style.border = "1.5px solid #ec4899";
          checkbox.style.background = "#ec4899";
          checkbox.textContent = "\u2713";
        }
      });

      const validRoomIds = new Set(rooms.map((room) => room.id || room.channelId).filter(Boolean));
      selectedRoomIds = new Set(Array.from(selectedRoomIds).filter((roomId) => validRoomIds.has(roomId)));

      if (!selectedRoomIds.size && rooms[0]) {
        const firstRoomId = rooms[0].id || rooms[0].channelId;
        if (firstRoomId) {
          selectedRoomIds = new Set([firstRoomId]);
        }
      }

      setStatus(`Loaded ${rooms.length} chats/channels.`);
    } catch (error) {
      listEl.innerHTML = "";
      setStatus(error.message || "Failed to load chats/channels.", true);
    }
  }

  async function shareCurrentLink() {
    if (!isSupportedJobUrl(getCurrentJobUrl())) {
      setStatus("Open a LinkedIn/Indeed/Workday/Greenhouse job page first.", true);
      return;
    }

    const selectedRooms = getSelectedRooms();

    if (!selectedRooms.length) {
      setStatus("Select at least one chat/channel first.", true);
      return;
    }

    const { authToken } = await getConfig();
    if (!authToken) {
      setStatus("API URL/auth token missing.", true);
      return;
    }

    try {
      setStatus("Sharing...");
      const results = await Promise.allSettled(
        selectedRooms.map(async (room) => {
          const roomId = room.id || room.channelId;
          const roomName = room.name || room.title || "Room";
          const { response, data } = await fetchJsonAcrossBackends(`/api/channels/${encodeURIComponent(roomId)}/messages`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${authToken}`,
            },
            body: JSON.stringify({ message: getShareMessage() }),
          });

          if (!response.ok) throw new Error(data?.error || `Share failed for ${roomName}.`);
          return roomName;
        })
      );

      const successful = results.filter((result) => result.status === "fulfilled");
      const failed = results.filter((result) => result.status === "rejected");

      if (!successful.length) {
        throw new Error(failed[0]?.reason?.message || "Share failed.");
      }

      if (failed.length) {
        setStatus(`Shared to ${successful.length}, ${failed.length} failed.`, true);
      } else {
        setStatus(`Shared to ${successful.length} ✓`);
      }
    } catch (error) {
      setStatus(error.message || "Share failed.", true);
    }
  }

  async function addCurrentJobToNotes() {
    if (!isSupportedJobUrl(getCurrentJobUrl())) {
      setStatus("Open a LinkedIn/Indeed/Workday/Greenhouse job page first.", true);
      return;
    }

    const { authToken } = await getConfig();
    const account = await getAccountInfo();
    const userId = account.userId || account.currentUserId || "";

    if (!authToken) {
      setStatus("Please log in to Bloomvey website first.", true);
      return;
    }

    const jobData = extractJobDataForCurrentPage();
    if (!jobData) {
      setStatus("Could not capture job data from this page.", true);
      return;
    }

    const payload = jobData.onlyUrlAvailable
      ? {
          userId,
          url: jobData.url || getCurrentJobUrl(),
        }
      : {
          userId,
          title: jobData.title || "",
          company: jobData.company || "",
          location: jobData.location || "",
          salary: jobData.salary || "Not listed",
          url: jobData.url || getCurrentJobUrl(),
        };

    try {
      setStatus("Saving to notes...");
      const { response, data } = await fetchJsonAcrossBackends("/api/notes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(data?.error || "Failed to save note.");
      }

      setStatus("Job saved ✓");
      await saveExtractedJobData();
    } catch (error) {
      setStatus(error.message || "Failed to save note.", true);
    }
  }

  function createUI() {
    if (document.getElementById(ROOT_ID)) return;

    const root = document.createElement("div");
    root.id = ROOT_ID;

    const launcher = document.createElement("button");
    launcher.id = LAUNCHER_ID;
    launcher.type = "button";
    launcher.textContent = "✿";
    launcher.style.position = "fixed";
    launcher.style.right = "0";
    launcher.style.bottom = "150px";
    launcher.style.width = "52px";
    launcher.style.height = "52px";
    launcher.style.border = "none";
    launcher.style.borderRadius = "14px 0 0 14px";
    launcher.style.background = "linear-gradient(180deg, #f472b6, #ec4899)";
    launcher.style.color = "#ffffff";
    launcher.style.fontSize = "22px";
    launcher.style.fontWeight = "700";
    launcher.style.lineHeight = "1";
    launcher.style.cursor = "pointer";
    launcher.style.zIndex = "2147483646";
    launcher.style.boxShadow = "0 10px 24px rgba(190, 24, 93, 0.32)";

    const panel = document.createElement("div");
    panel.id = PANEL_ID;
    panel.style.position = "fixed";
    panel.style.right = "58px";
    panel.style.bottom = "86px";
    panel.style.width = "310px";
    panel.style.maxWidth = "calc(100vw - 70px)";
    panel.style.height = "420px";
    panel.style.background = "#ffffff";
    panel.style.border = "1px solid #f9a8d4";
    panel.style.borderRadius = "16px";
    panel.style.boxShadow = "0 16px 36px rgba(190, 24, 93, 0.25)";
    panel.style.display = "flex";
    panel.style.flexDirection = "column";
    panel.style.overflow = "hidden";
    panel.style.zIndex = "2147483647";
    panel.style.transform = "translateX(calc(100% + 20px))";
    panel.style.opacity = "0";
    panel.style.pointerEvents = "none";
    panel.style.transition = "transform 300ms cubic-bezier(0.22, 1, 0.36, 1), opacity 300ms ease";

    const header = document.createElement("div");
    header.style.display = "flex";
    header.style.alignItems = "center";
    header.style.justifyContent = "space-between";
    header.style.padding = "10px 12px";
    header.style.background = "#fce7f3";
    header.style.borderBottom = "1px solid #fbcfe8";

    const title = document.createElement("div");
    title.textContent = "BloomVe";
    title.style.fontSize = "13px";
    title.style.fontWeight = "700";
    title.style.color = "#9d174d";

    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.textContent = "×";
    closeBtn.style.border = "none";
    closeBtn.style.background = "transparent";
    closeBtn.style.color = "#9d174d";
    closeBtn.style.fontSize = "18px";
    closeBtn.style.cursor = "pointer";

    const subtitle = document.createElement("div");
    subtitle.textContent = "Chats & channels";
    subtitle.style.padding = "8px 12px";
    subtitle.style.fontSize = "12px";
    subtitle.style.color = "#6b7280";
    subtitle.style.borderBottom = "1px solid #f3f4f6";

    const roomList = document.createElement("ul");
    roomList.id = "bloomve-mini-rooms";
    roomList.style.listStyle = "none";
    roomList.style.margin = "0";
    roomList.style.padding = "0";
    roomList.style.flex = "1";
    roomList.style.overflowY = "auto";

    const footer = document.createElement("div");
    footer.style.padding = "10px";
    footer.style.borderTop = "1px solid #f3f4f6";
    footer.style.display = "grid";
    footer.style.gap = "8px";

    const messageInput = document.createElement("textarea");
    messageInput.id = MESSAGE_INPUT_ID;
    messageInput.value = getCurrentJobUrl();
    messageInput.placeholder = "Type any message or paste link";
    messageInput.style.width = "100%";
    messageInput.style.minHeight = "64px";
    messageInput.style.maxHeight = "110px";
    messageInput.style.resize = "vertical";
    messageInput.style.boxSizing = "border-box";
    messageInput.style.border = "1px solid #e5e7eb";
    messageInput.style.borderRadius = "8px";
    messageInput.style.padding = "8px";
    messageInput.style.fontSize = "11px";
    messageInput.style.color = "#374151";
    messageInput.style.background = "#f9fafb";
    messageInput.style.lineHeight = "1.35";

    const shareBtn = document.createElement("button");
    shareBtn.type = "button";
    shareBtn.textContent = "Share Link";
    shareBtn.style.border = "none";
    shareBtn.style.borderRadius = "999px";
    shareBtn.style.padding = "10px 12px";
    shareBtn.style.background = "linear-gradient(90deg, #ec4899, #db2777)";
    shareBtn.style.color = "#ffffff";
    shareBtn.style.fontSize = "12px";
    shareBtn.style.fontWeight = "700";
    shareBtn.style.cursor = "pointer";

    const addToNotesBtn = document.createElement("button");
    addToNotesBtn.type = "button";
    addToNotesBtn.textContent = "✿ Add to Notes";
    addToNotesBtn.style.border = "1px solid #e5e7eb";
    addToNotesBtn.style.borderRadius = "999px";
    addToNotesBtn.style.padding = "9px 12px";
    addToNotesBtn.style.background = "#ffffff";
    addToNotesBtn.style.color = "#111827";
    addToNotesBtn.style.fontSize = "12px";
    addToNotesBtn.style.fontWeight = "700";
    addToNotesBtn.style.cursor = "pointer";

    const refreshBtn = document.createElement("button");
    refreshBtn.type = "button";
    refreshBtn.textContent = "Refresh Rooms";
    refreshBtn.style.border = "1px solid #e5e7eb";
    refreshBtn.style.borderRadius = "999px";
    refreshBtn.style.padding = "9px 12px";
    refreshBtn.style.background = "#ffffff";
    refreshBtn.style.color = "#111827";
    refreshBtn.style.fontSize = "12px";
    refreshBtn.style.fontWeight = "600";
    refreshBtn.style.cursor = "pointer";

    const status = document.createElement("div");
    status.id = "bloomve-mini-status";
    status.style.fontSize = "11px";
    status.style.color = "#6b7280";
    status.textContent = "Ready";

    let isOpen = false;
    const openPanel = async () => {
      isOpen = true;
      activeUrl = getCurrentJobUrl();
      messageInput.value = activeUrl;

      panel.style.transform = "translateX(0)";
      panel.style.opacity = "1";
      panel.style.pointerEvents = "auto";
      await fetchRooms();
    };

    const closePanel = () => {
      isOpen = false;
      panel.style.transform = "translateX(calc(100% + 20px))";
      panel.style.opacity = "0";
      panel.style.pointerEvents = "none";
    };

    launcher.addEventListener("click", async () => {
      if (isOpen) {
        closePanel();
      } else {
        await openPanel();
      }
    });

    closeBtn.addEventListener("click", closePanel);

    refreshBtn.addEventListener("click", async () => {
      await fetchRooms();
    });

    shareBtn.addEventListener("click", async () => {
      shareBtn.disabled = true;
      await shareCurrentLink();
      shareBtn.disabled = false;
    });

    addToNotesBtn.addEventListener("click", async () => {
      addToNotesBtn.disabled = true;
      await addCurrentJobToNotes();
      addToNotesBtn.disabled = false;
    });

    header.appendChild(title);
    header.appendChild(closeBtn);
    footer.appendChild(messageInput);
    footer.appendChild(addToNotesBtn);
    footer.appendChild(shareBtn);
    footer.appendChild(refreshBtn);
    footer.appendChild(status);

    panel.appendChild(header);
    panel.appendChild(subtitle);
    panel.appendChild(roomList);
    panel.appendChild(footer);

    root.appendChild(launcher);
    root.appendChild(panel);
    document.body.appendChild(root);
  }

  function init() {
    if (!isSupportedJobUrl(window.location.href)) {
      return;
    }

    createUI();
    void saveExtractedJobData();

    const urlObserver = new MutationObserver(() => {
      const latest = window.location.href;
      if (latest !== activeUrl) {
        activeUrl = latest;
        void saveExtractedJobData();
        const messageInput = document.getElementById(MESSAGE_INPUT_ID);
        if (messageInput) {
          messageInput.value = activeUrl;
        }
      }
    });

    urlObserver.observe(document.documentElement, { subtree: true, childList: true });
  }

  window.addEventListener("unhandledrejection", (event) => {
    event.preventDefault();
    noop();
  });

  try {
    init();
  } catch {
    noop();
  }
})();
