import { NextRequest, NextResponse } from "next/server";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function isAllowedOrigin(origin: string, extensionId?: string) {
  if (!origin) return false;

  if (extensionId && origin === `chrome-extension://${extensionId}`) {
    return true;
  }

  return [
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i,
    /^https:\/\/([\w-]+\.)?(bloomve|bloomvey)\.app$/i,
    /^https:\/\/([\w-]+\.)?linkedin\.com$/i,
    /^https:\/\/([\w-]+\.)?indeed\.com$/i,
    /^https:\/\/([\w-]+\.)?myworkdayjobs\.com$/i,
    /^https:\/\/([\w-]+\.)?greenhouse\.io$/i,
  ].some((pattern) => pattern.test(origin));
}

function getCorsHeaders(request?: NextRequest) {
  const origin = request?.headers.get("origin") || "";
  const extensionId = process.env.BLOOMVEY_EXTENSION_ID;
  const allowedOrigin = isAllowedOrigin(origin, extensionId) ? origin : "";

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Bloomve-User-Id",
    "Access-Control-Allow-Credentials": "true",
    "Vary": "Origin",
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

function getAdminAuth() {
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

  return getAuth();
}

export async function OPTIONS(request: NextRequest) {
  const corsHeaders = getCorsHeaders(request);
  return NextResponse.json({ ok: true }, { headers: corsHeaders });
}

export async function GET(request: NextRequest) {
  const corsHeaders = getCorsHeaders(request);

  try {
    const authorization = request.headers.get("authorization") || "";
    if (!authorization.toLowerCase().startsWith("bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
    }

    const idToken = authorization.replace(/^Bearer\s+/i, "").trim();
    if (!idToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
    }

    const decoded = await getAdminAuth().verifyIdToken(idToken);
    const userId = decoded.uid || "";

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

    return NextResponse.json({ items }, { headers: corsHeaders });
  } catch (error) {
    console.error("GET /api/channels error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500, headers: corsHeaders });
  }
}
