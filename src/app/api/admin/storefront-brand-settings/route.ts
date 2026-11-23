import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

async function isAdmin() {
  const user = await requireAdmin();
  return user?.role === "ADMIN";
}

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a six-digit hex color.");
const settingsSchema = z.object({
  background: hexColor,
  surface: hexColor,
  text: hexColor,
  muted: hexColor,
  accent: hexColor,
  contentMaxWidth: z.number().int().min(1080).max(1920),
  sectionSpacing: z.number().int().min(48).max(160),
  buttonRadius: z.number().int().min(0).max(24),
});

const defaults = {
  id: "global",
  background: "#0e300e",
  surface: "#19451b",
  text: "#e9e9e9",
  muted: "#c8d0c5",
  accent: "#c9a878",
  contentMaxWidth: 1440,
  sectionSpacing: 96,
  buttonRadius: 8,
};

export async function GET() {
  if (!await isAdmin()) return NextResponse.json({ error: "Administrator permission required." }, { status: 403 });
  const settings = await prisma.storefrontBrandSettings.findUnique({ where: { id: "global" } });
  return NextResponse.json({ settings: settings ?? defaults });
}

export async function PUT(request: NextRequest) {
  if (!await isAdmin()) return NextResponse.json({ error: "Administrator permission required." }, { status: 403 });
  const parsed = settingsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid brand settings.", details: parsed.error.flatten() }, { status: 400 });
  const settings = await prisma.storefrontBrandSettings.upsert({
    where: { id: "global" },
    create: { id: "global", ...parsed.data },
    update: parsed.data,
  });
  return NextResponse.json({ settings });
}
