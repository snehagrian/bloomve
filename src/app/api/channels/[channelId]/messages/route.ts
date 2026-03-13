import { NextRequest, NextResponse } from "next/server";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

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
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
    "Vary": "Origin",
  };
}

function ensureAdminApp() {
  if (getApps().length) return;

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

function getAdminAuth() {
  ensureAdminApp();
  return getAuth();
}

function getAdminDb() {
  ensureAdminApp();
  return getFirestore();
}

async function getAuthorizedUserId(request: NextRequest) {
  const authorization = request.headers.get("authorization") || "";
  if (!authorization.toLowerCase().startsWith("bearer ")) {
    return "";
  }

  const idToken = authorization.replace(/^Bearer\s+/i, "").trim();
  if (!idToken) {
    return "";
  }

  const decoded = await getAdminAuth().verifyIdToken(idToken);
  return decoded.uid || "";
}

export async function OPTIONS(request: NextRequest) {
  const corsHeaders = getCorsHeaders(request);
  return NextResponse.json({ ok: true }, { headers: corsHeaders });
}

export async function POST(request: NextRequest, context: { params: Promise<{ channelId: string }> }) {
  const corsHeaders = getCorsHeaders(request);
  try {
    const userId = await getAuthorizedUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
    }

    const { channelId } = await context.params;
    const roomId = String(channelId || "").trim();
    if (!roomId) {
      return NextResponse.json({ error: "channelId is required." }, { status: 400, headers: corsHeaders });
    }

    const body = (await request.json()) as { message?: string };
    const message = String(body?.message ?? "").trim();
    if (!message) {
      return NextResponse.json({ error: "message is required." }, { status: 400, headers: corsHeaders });
    }

    const db = getAdminDb();
    const roomRef = db.collection("rooms").doc(roomId);
    const roomSnapshot = await roomRef.get();

    if (!roomSnapshot.exists) {
      return NextResponse.json({ error: "Room not found." }, { status: 404, headers: corsHeaders });
    }

    const room = roomSnapshot.data() as { ownerId?: string; memberIds?: string[]; type?: string };
    const memberIds = Array.isArray(room.memberIds) ? room.memberIds : [];
    const isMember = memberIds.includes(userId) || room.ownerId === userId;

    if (!isMember) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: corsHeaders });
    }

    await roomRef.collection("posts").add({
      roomId,
      userId,
      title: "Shared job link",
      text: "",
      jobUrl: message,
      createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ ok: true }, { status: 201, headers: corsHeaders });
  } catch (error) {
    console.error("POST /api/channels/[channelId]/messages error:", error);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
  }
}