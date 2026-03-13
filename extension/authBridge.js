(() => {
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
    if (!storageArea || typeof storageArea.set !== "function") {
      return null;
    }
    return storageArea;
  }

  function hasExtensionContext() {
    try {
      const chromeApi = getChromeApi();
      return !!chromeApi?.runtime?.id;
    } catch {
      return false;
    }
  }

  function extractFirebaseAuth() {
    const directToken = window.localStorage.getItem("bloomveyAuthToken") || window.sessionStorage.getItem("bloomveyAuthToken") || "";
    const directUserId = window.localStorage.getItem("bloomveyUserId") || window.sessionStorage.getItem("bloomveyUserId") || "";

    if (directToken) {
      return { token: directToken, userId: directUserId };
    }

    const storages = [window.localStorage, window.sessionStorage];

    for (const store of storages) {
      if (!store) continue;
      const keys = Object.keys(store);
      const firebaseAuthKey = keys.find((key) => key.startsWith("firebase:authUser:"));
      if (!firebaseAuthKey) continue;

      try {
        const raw = store.getItem(firebaseAuthKey);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        const token = parsed?.stsTokenManager?.accessToken || "";
        const userId = parsed?.uid || "";

        if (!token) continue;
        return { token, userId };
      } catch {
        continue;
      }
    }

    return null;
  }

  async function linkTokenWithBackend(token, backendUrl) {
    if (!token || !backendUrl) return null;

    try {
      const response = await fetch(`${backendUrl}/api/extension/auth-link`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        return null;
      }

      const linked = await response.json();
      return {
        userId: linked?.userId || "",
      };
    } catch {
      return null;
    }
  }

  async function syncAuthToExtension() {
    if (!hasExtensionContext()) return;

    const auth = extractFirebaseAuth();

    try {
      const localStorageArea = getStorageArea("local");
      const syncStorageArea = getStorageArea("sync");
      if (!localStorageArea || !syncStorageArea) return;

      if (!auth?.token) {
        await localStorageArea.set({
          authToken: "",
          userId: "",
          currentUserId: "",
        });
        await syncStorageArea.set({
          authToken: "",
          userId: "",
          currentUserId: "",
        });
        return;
      }

      const backendUrl =
        window.localStorage.getItem("bloomveyBackendUrl") ||
        window.sessionStorage.getItem("bloomveyBackendUrl") ||
        window.location.origin;

      const linked = await linkTokenWithBackend(auth.token, backendUrl);
      const resolvedUserId = linked?.userId || auth.userId || "";

      await localStorageArea.set({
        authToken: auth.token,
        backendUrl,
        userId: resolvedUserId,
        currentUserId: resolvedUserId,
      });

      await syncStorageArea.set({
        authToken: auth.token,
        userId: resolvedUserId,
        currentUserId: resolvedUserId,
        apiBaseUrl: window.location.origin,
      });
    } catch {
      return;
    }
  }

  void syncAuthToExtension();
  window.addEventListener("focus", () => {
    void syncAuthToExtension();
  });
  window.addEventListener("storage", () => {
    void syncAuthToExtension();
  });
  window.setInterval(() => {
    void syncAuthToExtension();
  }, 4000);
})();
