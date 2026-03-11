import { NextRequest, NextResponse } from "next/server";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

type AuthLinkPayload = {
  token?: string;
};

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

function isAllowedOrigin(origin: string) {
  const extensionId = process.env.BLOOMVEY_EXTENSION_ID;

  if (extensionId && origin === `chrome-extension://${extensionId}`) {
    return true;
  }

  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) {
    return true;
  }

  if (/^https:\/\/([\w-]+\.)?(bloomve|bloomvey)\.app$/i.test(origin)) {
    return true;
  }

  return false;
}

function getCorsHeaders(request: NextRequest) {
  const origin = request.headers.get("origin") || "";
  const allowedOrigin = isAllowedOrigin(origin) ? origin : "";

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    Vary: "Origin",
  };
}

export async function OPTIONS(request: NextRequest) {
  const corsHeaders = getCorsHeaders(request);
  return NextResponse.json({ ok: true }, { headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  const corsHeaders = getCorsHeaders(request);

  try {
    const authorization = request.headers.get("authorization") || "";
    const bearerToken = authorization.toLowerCase().startsWith("bearer ")
      ? authorization.replace(/^Bearer\s+/i, "").trim()
      : "";

    let bodyToken = "";
    try {
      const body = (await request.json()) as AuthLinkPayload;
      bodyToken = String(body?.token || "").trim();
    } catch {
      bodyToken = "";
    }

    const token = bearerToken || bodyToken;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
    }

    const decoded = await getAdminAuth().verifyIdToken(token);
    const userId = decoded.uid || "";
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
    }

    return NextResponse.json(
      {
        ok: true,
        userId,
        email: decoded.email || "",
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("POST /api/extension/auth-link error:", error);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
  }
}
