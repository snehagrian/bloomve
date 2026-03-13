const chatListEl = document.getElementById("chatList");
const saveJobBtn = document.getElementById("saveJobBtn");
const shareBtn = document.getElementById("shareBtn");
const brandLogo = document.getElementById("brandLogo");
const statusEl = document.getElementById("status");
const currentUrlEl = document.getElementById("currentUrl");
const unsupportedEl = document.getElementById("unsupported");

let activeTabUrl = "";
let selectedChatIds = new Set();
let chats = [];
let apiBaseUrl = "http://localhost:3000";

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

async function readSync(keys) {
  return readStorage("sync", keys);
}

async function readAuthFromStorage() {
  const localAuth = await readLocal(["authToken", "idToken"]);
  if (localAuth?.authToken || localAuth?.idToken) {
    return localAuth;
  }
  return readSync(["authToken", "idToken"]);
}

async function readAccountFromStorage() {
  const localAccount = await readLocal(["userId", "currentUserId"]);
  if (localAccount?.userId || localAccount?.currentUserId) {
    return localAccount;
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

async function safeExecuteScript(tabId, func) {
  try {
    const chromeApi = getChromeApi();
    if (!chromeApi?.scripting?.executeScript || !tabId) return [];
    return (await chromeApi.scripting.executeScript({ target: { tabId }, func })) || [];
  } catch {
    return [];
  }
}

function ensureBrandLogo() {
  if (!brandLogo) return;

  brandLogo.addEventListener("error", () => {
    brandLogo.src = "icons/bloomve-icon.svg";
  });
}

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.style.color = isError ? "#dc2626" : "#4b5563";
}

function isSupportedJobUrl(url = "") {
  return /https?:\/\/(?:[^/]+\.)?(linkedin\.com\/jobs\/|indeed\.com\/|myworkdayjobs\.com\/)/i.test(url);
}

function normalizeChannelItems(data) {
  const items = [];

  if (Array.isArray(data?.channels)) {
    data.channels.forEach((channel) => items.push({ ...channel, kind: "channel" }));
  }

  if (Array.isArray(data?.chats)) {
    data.chats.forEach((chat) => items.push({ ...chat, kind: "chat" }));
  }

  if (Array.isArray(data?.items)) {
    data.items.forEach((item) => items.push(item));
  }

  return items;
}

async function getCurrentTab() {
  const tabs = await safeTabsQuery({ active: true, lastFocusedWindow: true });
  return tabs?.[0] || null;
}

async function extractJobDataFromTab(tabId) {
  if (!tabId) return null;

  try {
    const results = await safeExecuteScript(tabId, () => {
        const currentUrl = window.location.href;

        const pickText = (selectors) => {
          for (const selector of selectors) {
            const element = document.querySelector(selector);
            const value = element?.textContent?.replace(/\s+/g, " ").trim();
            if (value) return value;
          }
          return "";
        };

        const normalizeSalary = (value) => {
          if (!value) return "Not listed";
          return value;
        };

        if (currentUrl.includes("myworkdayjobs.com") || currentUrl.includes("greenhouse.io/jobs")) {
          return {
            source: currentUrl.includes("myworkdayjobs.com") ? "workday" : "greenhouse",
            onlyUrlAvailable: true,
            url: currentUrl,
            extractedAt: new Date().toISOString(),
          };
        }

        if (currentUrl.includes("linkedin.com/jobs")) {
          const title = pickText(["h1.top-card-layout__title", "h1.t-24.t-bold.inline", "h1"]);
          const company = pickText([
            ".topcard__org-name-link",
            ".topcard__flavor-row .topcard__flavor",
            ".job-details-jobs-unified-top-card__company-name a",
            ".job-details-jobs-unified-top-card__company-name",
          ]);
          const location = pickText([
            ".topcard__flavor.topcard__flavor--bullet",
            ".jobs-unified-top-card__bullet",
            ".job-details-jobs-unified-top-card__primary-description-container span",
          ]);
          const salary = normalizeSalary(
            pickText([
              ".salary.compensation__salary",
              ".job-details-jobs-unified-top-card__job-insight span",
              ".jobs-box__html-content strong",
            ])
          );

          return {
            source: "linkedin",
            title: title || "",
            company: company || "",
            location: location || "",
            salary,
            url: currentUrl,
            extractedAt: new Date().toISOString(),
          };
        }

        if (currentUrl.includes("indeed.com/viewjob") || currentUrl.includes("indeed.com")) {
          const title = pickText([
            "h1.jobsearch-JobInfoHeader-title",
            "h1[data-testid='jobsearch-JobInfoHeader-title']",
            "h1",
          ]);
          const company = pickText([
            "[data-testid='inlineHeader-companyName']",
            ".jobsearch-InlineCompanyRating div:first-child",
            "[data-company-name='true']",
          ]);
          const location = pickText([
            "[data-testid='job-location']",
            "#jobLocationText",
            ".jobsearch-JobInfoHeader-subtitle div:last-child",
          ]);
          const salary = normalizeSalary(
            pickText([
              "#salaryInfoAndJobType",
              "[data-testid='jobsearch-JobMetadataHeader-item']",
              ".js-match-insights-provider-tvvxwd.e1wnkr790",
            ])
          );

          return {
            source: "indeed",
            title: title || "",
            company: company || "",
            location: location || "",
            salary,
            url: currentUrl,
            extractedAt: new Date().toISOString(),
          };
        }

        return {
          onlyUrlAvailable: true,
          url: currentUrl,
          extractedAt: new Date().toISOString(),
        };
      });

    return results?.[0]?.result || null;
  } catch {
    return null;
  }
}

async function loadConfig() {
  const saved = await readSync(["apiBaseUrl"]);
  apiBaseUrl = saved.apiBaseUrl || "http://localhost:3000";
}

function getAuthTokenFromStorage(auth) {
  return auth.authToken || auth.idToken || "";
}

function renderChats() {
  chatListEl.innerHTML = "";

  if (!chats.length) {
    const empty = document.createElement("li");
    empty.className = "chat-item";
    empty.textContent = "No chats found.";
    chatListEl.appendChild(empty);
    return;
  }

  chats.forEach((chat) => {
    const chatId = chat.id || chat.channelId;
    if (!chatId) return;

    const isSelected = selectedChatIds.has(chatId);
    const item = document.createElement("li");
    item.className = `chat-item${isSelected ? " active" : ""}`;
    item.dataset.chatId = chatId;

    const visBox = document.createElement("span");
    visBox.className = "chat-item-checkbox";
    visBox.style.borderColor = isSelected ? "#4f46e5" : "#9ca3af";
    visBox.style.background = isSelected ? "#4f46e5" : "#ffffff";
    visBox.textContent = isSelected ? "\u2713" : "";

    const content = document.createElement("div");
    content.className = "chat-item-content";

    const name = document.createElement("p");
    name.className = "chat-name";
    name.textContent = chat.name || chat.title || "Untitled chat";

    const meta = document.createElement("p");
    meta.className = "chat-meta";
    meta.textContent = "Chat";

    content.appendChild(name);
    content.appendChild(meta);

    item.appendChild(visBox);
    item.appendChild(content);

    const toggleSelection = () => {
      if (selectedChatIds.has(chatId)) {
        selectedChatIds.delete(chatId);
      } else {
        selectedChatIds.add(chatId);
      }

      renderChats();
      const selectedCount = selectedChatIds.size;
      if (selectedCount === 0) {
        setStatus("No chat selected.");
        return;
      }

      setStatus(`Selected ${selectedCount} chat(s).`);
    };

    item.addEventListener("click", toggleSelection);

    chatListEl.appendChild(item);
  });
}

function getSelectedChats() {
  return chats.filter((item) => {
    const id = item.id || item.channelId;
    return !!id && selectedChatIds.has(id);
  });
}

async function fetchChats() {
  const auth = await readAuthFromStorage();
  const authToken = getAuthTokenFromStorage(auth);
  const account = await readAccountFromStorage();
  const userId = account.userId || account.currentUserId || "";

  if (!apiBaseUrl || !authToken) {
    setStatus("Please log in to Bloomvey website first.", true);
    chats = [];
    renderChats();
    return;
  }

  try {
    setStatus("Loading chats...");
    const response = await fetch(`${apiBaseUrl}/api/channels`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${authToken}`,
        "X-Bloomve-User-Id": userId,
      },
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.error || "Could not fetch chats.");
    }

    const allItems = normalizeChannelItems(data);
    chats = allItems.filter((item) => {
      const type = (item.kind || item.type || "").toLowerCase();
      return type === "chat";
    });

    if (!chats.length) {
      chats = allItems;
    }

    if (!selectedChatIds.size && chats.length > 0) {
      const firstChatId = chats[0].id || chats[0].channelId || "";
      if (firstChatId) {
        selectedChatIds = new Set([firstChatId]);
      }
    }

    const validChatIds = new Set(chats.map((item) => item.id || item.channelId).filter(Boolean));
    selectedChatIds = new Set(Array.from(selectedChatIds).filter((id) => validChatIds.has(id)));

    if (!selectedChatIds.size && chats.length > 0) {
      const firstChatId = chats[0].id || chats[0].channelId || "";
      if (firstChatId) {
        selectedChatIds = new Set([firstChatId]);
      }
    }

    renderChats();
    setStatus(`Loaded ${chats.length} chats.`);
  } catch (error) {
    chats = [];
    renderChats();
    setStatus(error.message || "Chat load failed.", true);
  }
}

async function saveJob() {
  const tab = await getCurrentTab();
  const url = tab?.url || activeTabUrl;

  if (!isSupportedJobUrl(url)) {
    setStatus("Open a LinkedIn, Indeed, or Workday job page first.", true);
    return;
  }

  saveJobBtn.disabled = true;

  try {
    const authDetails = await readAuthFromStorage();
    const account = await readAccountFromStorage();
    const auth = {
      authToken: authDetails?.authToken,
      idToken: authDetails?.idToken,
      userId: account?.userId,
      currentUserId: account?.currentUserId,
    };
    const authToken = getAuthTokenFromStorage(auth);
    const userId = auth.userId || auth.currentUserId || "";
    const extractedJob = await extractJobDataFromTab(tab?.id);
    const { bloomveCurrentJob } = await readLocal(["bloomveCurrentJob"]);
    const candidateJob = extractedJob || bloomveCurrentJob;

    if (!authToken || !candidateJob) {
      throw new Error("missing-auth-or-job-data");
    }

    const payload = candidateJob.onlyUrlAvailable
      ? {
          url: candidateJob.url || url || "",
          userId,
        }
      : {
          userId,
          title: candidateJob.title || "",
          company: candidateJob.company || "",
          location: candidateJob.location || "",
          salary: candidateJob.salary || "Not listed",
          url: candidateJob.url || url || "",
        };

    const response = await fetch(`${apiBaseUrl}/api/notes`, {
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
}

async function shareJob() {
  const auth = await readAuthFromStorage();
  const authToken = getAuthTokenFromStorage(auth);
  const selectedChats = getSelectedChats();

  if (!apiBaseUrl || !authToken || selectedChats.length === 0) {
    setStatus("Please log in to Bloomvey and select at least one chat.", true);
    return;
  }

  if (!activeTabUrl) {
    setStatus("Could not read the current tab URL.", true);
    return;
  }

  if (!isSupportedJobUrl(activeTabUrl)) {
    setStatus("Open a LinkedIn, Indeed, or Workday job page first.", true);
    return;
  }

  try {
    setStatus("Sharing...");
    shareBtn.disabled = true;

    const shareResults = await Promise.allSettled(
      selectedChats.map(async (chat) => {
        const chatId = chat.id || chat.channelId;
        const chatName = chat?.name || chat?.title || "Chat";

        const response = await fetch(`${apiBaseUrl}/api/channels/${encodeURIComponent(chatId)}/messages`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ message: activeTabUrl }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.error || `Share failed for ${chatName}.`);
        }

        return chatName;
      })
    );

    const fulfilled = shareResults.filter((result) => result.status === "fulfilled");
    const rejected = shareResults.filter((result) => result.status === "rejected");

    if (!fulfilled.length) {
      throw new Error(rejected[0]?.reason?.message || "Share failed.");
    }

    if (rejected.length) {
      setStatus(`Shared to ${fulfilled.length} chat(s), ${rejected.length} failed.`, true);
    } else {
      setStatus(`Shared to ${fulfilled.length} chat(s) ✓`);
    }
  } catch (error) {
    setStatus(error.message || "Share failed.", true);
  } finally {
    shareBtn.disabled = false;
  }
}

async function syncPanelState() {
  const tab = await getCurrentTab();
  const url = tab?.url || "";
  activeTabUrl = url;
  const supported = isSupportedJobUrl(url);

  unsupportedEl.style.display = supported ? "none" : "block";
  currentUrlEl.textContent = url || "No active tab URL found.";

  if (supported) {
    await fetchChats();
  } else {
    setStatus("Open a supported job page to save and share.", true);
  }
}

saveJobBtn.addEventListener("click", saveJob);
shareBtn.addEventListener("click", shareJob);

(async function init() {
  ensureBrandLogo();
  await loadConfig();
  await syncPanelState();
})();
