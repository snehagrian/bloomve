"use client";

import { useEffect } from "react";
import { onIdTokenChanged } from "firebase/auth";
import { getClientAuth } from "@/lib/firebase";

function syncExtensionStorage(payload: {
  authToken?: string;
  backendUrl: string;
  userId?: string;
  currentUserId?: string;
}) {
  const chromeApi = (
    window as Window & {
      chrome?: {
        storage?: {
          local?: { set: (value: Record<string, string>) => void };
          sync?: { set: (value: Record<string, string>) => void };
        };
      };
    }
  ).chrome;

  if (payload.authToken && chromeApi?.storage?.local?.set) {
    chromeApi.storage.local.set({
      authToken: payload.authToken,
      backendUrl: payload.backendUrl,
      userId: payload.userId || "",
      currentUserId: payload.currentUserId || payload.userId || "",
    });
  }

  if (payload.authToken && chromeApi?.storage?.sync?.set) {
    chromeApi.storage.sync.set({
      authToken: payload.authToken,
      userId: payload.userId || "",
      currentUserId: payload.currentUserId || payload.userId || "",
      apiBaseUrl: payload.backendUrl,
    });
  }
}

export default function AuthTokenSync() {
  useEffect(() => {
    const auth = getClientAuth();

    return onIdTokenChanged(auth, async (user) => {
      const backendUrl = window.location.origin;
      window.localStorage.setItem("bloomveyBackendUrl", backendUrl);

      if (!user) {
        window.localStorage.removeItem("bloomveyAuthToken");
        window.localStorage.removeItem("bloomveyUserId");
        window.sessionStorage.removeItem("bloomveyAuthToken");
        window.sessionStorage.removeItem("bloomveyUserId");
        return;
      }

      const token = await user.getIdToken();
      const userId = user.uid;

      window.localStorage.setItem("bloomveyAuthToken", token);
      window.localStorage.setItem("bloomveyUserId", userId);
      window.localStorage.setItem("bloomveyBackendUrl", backendUrl);
      window.sessionStorage.setItem("bloomveyAuthToken", token);
      window.sessionStorage.setItem("bloomveyUserId", userId);
      window.sessionStorage.setItem("bloomveyBackendUrl", backendUrl);

      syncExtensionStorage({
        authToken: token,
        backendUrl,
        userId,
        currentUserId: userId,
      });
    });
  }, []);

  return null;
}