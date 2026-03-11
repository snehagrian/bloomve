import { NextRequest, NextResponse } from "next/server";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

function getCorsHeaders() {
  const extensionId = process.env.BLOOMVEY_EXTENSION_ID || "YOUR_EXTENSION_ID";
  return {
    "Access-Control-Allow-Origin": `chrome-extension://${extensionId}`,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Bloomve-Secret",
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
    const sharedSecret = process.env.EXTENSION_SHARED_SECRET;
    const incomingSecret = request.headers.get("x-bloomve-secret");

    if (!sharedSecret || incomingSecret !== sharedSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
    }

    const db = getAdminDb();
    const snapshot = await db
      .collection("rooms")
      .where("privacy", "==", "public")
      .orderBy("createdAt", "desc")
      .get();

    const rooms = snapshot.docs.map((roomDoc) => {
      const room = roomDoc.data();
      return {
        id: roomDoc.id,
        name: room.name,
        type: room.type,
        privacy: room.privacy,
      };
    });

    return NextResponse.json({ rooms }, { headers: corsHeaders });
  } catch (error) {
    console.error("GET /api/share error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500, headers: corsHeaders });
  }
}

export async function POST(request: NextRequest) {
  const corsHeaders = getCorsHeaders();
  try {
    const sharedSecret = process.env.EXTENSION_SHARED_SECRET;
    const incomingSecret = request.headers.get("x-bloomve-secret");

    if (!sharedSecret || incomingSecret !== sharedSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
    }

    const body = await request.json();
    const roomId = String(body.roomId ?? "").trim();
    const jobUrl = String(body.jobUrl ?? "").trim();
    const title = String(body.title ?? "Shared from BloomVe extension").trim();

    if (!roomId || !jobUrl) {
      return NextResponse.json(
        { error: "roomId and jobUrl are required." },
        { status: 400, headers: corsHeaders }
      );
    }

    try {
      new URL(jobUrl);
    } catch {
      return NextResponse.json({ error: "jobUrl must be a valid URL." }, { status: 400, headers: corsHeaders });
    }

    const db = getAdminDb();
    const roomRef = db.collection("rooms").doc(roomId);
    const roomSnap = await roomRef.get();

    if (!roomSnap.exists) {
      return NextResponse.json({ error: "Room not found." }, { status: 404, headers: corsHeaders });
    }

    await roomRef.collection("posts").add({
      roomId,
      userId: "extension",
      title: title || "Shared from BloomVe extension",
      text: "",
      jobUrl,
      createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ ok: true }, { status: 201, headers: corsHeaders });
  } catch (error) {
    console.error("/api/share error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500, headers: corsHeaders });
  }
}
