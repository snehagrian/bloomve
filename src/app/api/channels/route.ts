import { NextRequest, NextResponse } from "next/server";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function getCorsHeaders() {
  const extensionId = process.env.BLOOMVEY_EXTENSION_ID || "YOUR_EXTENSION_ID";
  return {
    "Access-Control-Allow-Origin": `chrome-extension://${extensionId}`,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Bloomve-User-Id",
  };
}

function getAdminDb() {
  if (!getApps().length) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error("Missing Firebase Admin environment variables.");
    }

    initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  }

  return getFirestore();
}

export async function OPTIONS() {
  const corsHeaders = getCorsHeaders();
  return NextResponse.json({ ok: true }, { headers: corsHeaders });
}

export async function GET(request: NextRequest) {
  const corsHeaders = getCorsHeaders();

  try {
    const authorization = request.headers.get("authorization") || "";
    if (!authorization.toLowerCase().startsWith("bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
    }

    const idToken = authorization.replace(/^Bearer\s+/i, "").trim();
    if (!idToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
    }

    let userId = "";
    try {
      const decoded = await getAuth().verifyIdToken(idToken);
      userId = decoded.uid || "";
    } catch {
      userId = request.headers.get("x-bloomve-user-id")?.trim() || "";
    }

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
    }

    const db = getAdminDb();
    const [joinedSnapshot, ownedSnapshot] = await Promise.all([
      db.collection("rooms").where("memberIds", "array-contains", userId).get(),
      db.collection("rooms").where("ownerId", "==", userId).get(),
    ]);

    const merged = new Map<string, { id: string; name: string; type: string; kind: string }>();

    [...joinedSnapshot.docs, ...ownedSnapshot.docs].forEach((roomDoc) => {
      const room = roomDoc.data();
      merged.set(roomDoc.id, {
        id: roomDoc.id,
        name: room.name || "Untitled",
        type: room.type || "channel",
        kind: room.type || "channel",
      });
    });

    const items = Array.from(merged.values());

    const channels = items.filter((item) => (item.type || "").toLowerCase() === "channel");
    const chats = items.filter((item) => (item.type || "").toLowerCase() === "chat");

    return NextResponse.json({ channels, chats, items }, { headers: corsHeaders });
  } catch (error) {
    console.error("GET /api/channels error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500, headers: corsHeaders });
  }
}
