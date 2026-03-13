import { NextRequest, NextResponse } from "next/server";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import * as cheerio from "cheerio";

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

type NotesPayload = {
  userId?: string;
  title?: string;
  jobTitle?: string;
  company?: string;
  location?: string;
  salary?: string;
  url?: string;
};

function getCorsHeaders(request?: NextRequest) {
  const origin = request?.headers.get("origin") || "";
  const extensionId = process.env.BLOOMVEY_EXTENSION_ID;
  const allowedOrigin = isAllowedOrigin(origin, extensionId) ? origin : "";

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
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

function isValidUrl(input: string) {
  try {
    const parsed = new URL(input);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function getMetaContent($: cheerio.CheerioAPI, selectors: string[]) {
  for (const selector of selectors) {
    const value = $(selector).attr("content")?.trim();
    if (value) return value;
  }
  return "";
}

function cleanText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function findSalary(text: string) {
  const salaryMatch = text.match(/([$€£₹]\s?\d[\d,]*(?:\.\d+)?(?:\s?[kKmM])?(?:\s?[-–to]{1,3}\s?[$€£₹]?\s?\d[\d,]*(?:\.\d+)?(?:\s?[kKmM])?)?)/);
  return salaryMatch?.[0]?.trim() || "";
}

function findLocation(text: string) {
  const locationMatch = text.match(/\b([A-Z][a-zA-Z]+(?:\s[A-Z][a-zA-Z]+)*,\s?[A-Z]{2}|Remote|Hybrid|On-site|Onsite)\b/);
  return locationMatch?.[0]?.trim() || "";
}

async function scrapeJobData(url: string) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; BloomVeBot/1.0; +https://bloomve.app)",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch URL (${response.status}).`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  const title = cleanText(
    getMetaContent($, [
      'meta[property="og:title"]',
      'meta[name="twitter:title"]',
      'meta[name="title"]',
    ]) ||
      $("h1").first().text() ||
      $("title").first().text() ||
      ""
  );

  const description = cleanText(
    getMetaContent($, [
      'meta[property="og:description"]',
      'meta[name="twitter:description"]',
      'meta[name="description"]',
    ]) || ""
  );

  const company = cleanText(
    getMetaContent($, ['meta[property="og:site_name"]', 'meta[name="application-name"]']) ||
      $('[itemprop="hiringOrganization"]').first().text() ||
      $('[data-testid*="company"], [class*="company"]').first().text() ||
      new URL(url).hostname.replace(/^www\./, "")
  );

  const bodyText = cleanText($("body").text());
  const location = cleanText(
    $('[itemprop="jobLocation"]').first().text() ||
      $('[data-testid*="location"], [class*="location"]').first().text() ||
      findLocation(description) ||
      findLocation(bodyText)
  );

  const salary = cleanText(
    $('[itemprop="baseSalary"]').first().text() ||
      $('[data-testid*="salary"], [class*="salary"]').first().text() ||
      findSalary(description) ||
      findSalary(bodyText)
  );

  return {
    jobTitle: title || "Untitled job",
    company: company || "Unknown company",
    location: location || "",
    salary: salary || "",
    url,
  };
}

export async function OPTIONS(request: NextRequest) {
  const corsHeaders = getCorsHeaders(request);
  return NextResponse.json({ ok: true }, { headers: corsHeaders });
}

export async function GET(request: NextRequest) {
  const corsHeaders = getCorsHeaders(request);
  try {
    const userId = await getAuthorizedUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
    }

    const db = getAdminDb();
    const snapshot = await db
      .collection("notes")
      .where("userId", "==", userId)
      .orderBy("dateAdded", "desc")
      .get();

    const notes = snapshot.docs.map((noteDoc) => {
      const note = noteDoc.data();
      return {
        id: noteDoc.id,
        userId,
        title: note.jobTitle || note.title || "Untitled job",
        jobTitle: note.jobTitle || note.title || "Untitled job",
        company: note.company || "Unknown company",
        location: note.location || "",
        salary: note.salary || "",
        url: note.url || "",
        recruiters: Array.isArray(note.recruiters) ? note.recruiters : [],
      };
    });

    return NextResponse.json({ notes, items: notes }, { headers: corsHeaders });
  } catch (error) {
    console.error("GET /api/notes error:", error);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
  }
}

export async function POST(request: NextRequest) {
  const corsHeaders = getCorsHeaders(request);
  try {
    const authedUserId = await getAuthorizedUserId(request);
    if (!authedUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
    }

    const body = (await request.json()) as NotesPayload;

    const inputUrl = String(body.url ?? "").trim();
    const inputTitle = String(body.title ?? body.jobTitle ?? "").trim();
    const inputCompany = String(body.company ?? "").trim();
    const inputLocation = String(body.location ?? "").trim();
    const inputSalary = String(body.salary ?? "").trim();

    if (!inputUrl) {
      return NextResponse.json({ error: "url is required." }, { status: 400, headers: corsHeaders });
    }

    if (!isValidUrl(inputUrl)) {
      return NextResponse.json({ error: "url must be a valid http/https URL." }, { status: 400, headers: corsHeaders });
    }

    const hasFullData = !!(inputTitle && inputCompany && inputLocation && inputSalary);

    const jobData = hasFullData
      ? {
          jobTitle: inputTitle,
          company: inputCompany,
          location: inputLocation,
          salary: inputSalary,
          url: inputUrl,
        }
      : await scrapeJobData(inputUrl);

    const db = getAdminDb();
    const nowIso = new Date().toISOString();
    const persistedUserId = authedUserId;

    const docRef = await db.collection("notes").add({
      userId: persistedUserId,
      jobTitle: jobData.jobTitle,
      company: jobData.company,
      location: jobData.location,
      salary: jobData.salary,
      url: jobData.url,
      dateAdded: FieldValue.serverTimestamp(),
    });

    return NextResponse.json(
      {
        job: {
          id: docRef.id,
          userId: persistedUserId,
          jobTitle: jobData.jobTitle,
          company: jobData.company,
          location: jobData.location,
          salary: jobData.salary,
          url: jobData.url,
          dateAdded: nowIso,
        },
      },
      { status: 201, headers: corsHeaders }
    );
  } catch (error) {
    console.error("POST /api/notes error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";

    if (message.includes("Failed to fetch URL")) {
      return NextResponse.json(
        { error: "Could not fetch the provided URL for scraping." },
        { status: 422, headers: corsHeaders }
      );
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500, headers: corsHeaders });
  }
}
