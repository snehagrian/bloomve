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

type RecruiterInput = {
  name?: string;
  title?: string;
  profileUrl?: string;
  company?: string;
};

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

function normalizeRecruiters(input: unknown) {
  if (!Array.isArray(input)) return [];

  return input
    .map((item) => {
      const recruiter = item as RecruiterInput;
      const name = String(recruiter?.name ?? "").trim();
      const title = String(recruiter?.title ?? "").trim();
      const company = String(recruiter?.company ?? "").trim();
      const profileUrl = String(recruiter?.profileUrl ?? "").trim();

      if (!name && !title && !company && !profileUrl) {
        return null;
      }

      return {
        name,
        title,
        company,
        profileUrl,
      };
    })
    .filter(Boolean);
}

export async function OPTIONS(request: NextRequest) {
  const corsHeaders = getCorsHeaders(request);
  return NextResponse.json({ ok: true }, { headers: corsHeaders });
}

export async function POST(request: NextRequest, context: { params: Promise<{ noteId: string }> }) {
  const corsHeaders = getCorsHeaders(request);
  try {
    const userId = await getAuthorizedUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
    }

    const { noteId } = await context.params;
    const resolvedNoteId = String(noteId || "").trim();
    if (!resolvedNoteId) {
      return NextResponse.json({ error: "noteId is required." }, { status: 400, headers: corsHeaders });
    }

    const body = (await request.json()) as { recruiters?: unknown };
    const recruiters = normalizeRecruiters(body?.recruiters);
    if (!recruiters.length) {
      return NextResponse.json({ error: "recruiters are required." }, { status: 400, headers: corsHeaders });
    }

    const db = getAdminDb();
    const noteRef = db.collection("notes").doc(resolvedNoteId);
    const noteSnapshot = await noteRef.get();

    if (!noteSnapshot.exists) {
      return NextResponse.json({ error: "Note not found." }, { status: 404, headers: corsHeaders });
    }

    const note = noteSnapshot.data() as { userId?: string };
    if (note.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: corsHeaders });
    }

    await noteRef.set(
      {
        recruiters,
        recruitersUpdatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return NextResponse.json({ ok: true, recruitersCount: recruiters.length }, { headers: corsHeaders });
  } catch (error) {
    console.error("POST /api/notes/[noteId]/recruiters error:", error);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
  }
}