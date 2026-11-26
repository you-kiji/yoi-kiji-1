import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAllowedPreview(request: NextRequest) {
  const host = request.nextUrl.hostname;
  return process.env.VERCEL_ENV === "preview"
    && process.env.VERCEL_GIT_COMMIT_REF === "redesign/japanese-luxury-full-site"
    && host.endsWith(".vercel.app")
    && Boolean(process.env.PREVIEW_QA_BOOTSTRAP_TOKEN);
}

export async function POST(request: NextRequest) {
  if (!isAllowedPreview(request)) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const expected = Buffer.from(process.env.PREVIEW_QA_BOOTSTRAP_TOKEN ?? "");
  const supplied = Buffer.from(request.headers.get("x-preview-qa-token") ?? "");
  if (!expected.length || expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const user = await prisma.user.findUnique({
    where: { email: "shivam@yoikiji.com" },
    select: { id: true, role: true },
  });
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Staging administrator unavailable." }, { status: 403 });
  await createSession(user.id);
  return NextResponse.json({ ok: true });
}
