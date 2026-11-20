import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

async function adminOnly() {
  const admin = await requireAdmin();
  return admin?.role === "ADMIN" ? admin : null;
}

const schema = z.object({
  slug: z.string().trim().min(2).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.string().trim().min(2).max(180),
  content: z.string().min(10).max(50000),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("DRAFT"),
  seoTitle: z.string().max(180).optional().nullable(),
  seoDescription: z.string().max(320).optional().nullable(),
});

export async function GET() {
  if (!await adminOnly()) return NextResponse.json({ error: "Administrator permission required." }, { status: 403 });
  const pages = await prisma.legalPage.findMany({ include: { _count: { select: { revisions: true } } }, orderBy: [{ updatedAt: "desc" }] });
  return NextResponse.json({ pages });
}

export async function POST(request: NextRequest) {
  const admin = await adminOnly();
  if (!admin) return NextResponse.json({ error: "Administrator permission required." }, { status: 403 });
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Check the page details.", details: parsed.error.flatten() }, { status: 400 });
  try {
    const page = await prisma.$transaction(async tx => {
      const created = await tx.legalPage.create({ data: { ...parsed.data, publishedAt: parsed.data.status === "PUBLISHED" ? new Date() : null } });
      await tx.legalPageRevision.create({ data: { pageId: created.id, title: created.title, content: created.content, status: created.status, editorId: admin.id } });
      return created;
    });
    return NextResponse.json({ page }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "A legal page with this URL slug already exists." }, { status: 409 });
  }
}

export async function PATCH(request: NextRequest) {
  const admin = await adminOnly();
  if (!admin) return NextResponse.json({ error: "Administrator permission required." }, { status: 403 });
  const body = await request.json().catch(() => null);
  if (!body?.id) return NextResponse.json({ error: "Page id is required." }, { status: 400 });
  const parsed = schema.partial().safeParse(body.data);
  if (!parsed.success) return NextResponse.json({ error: "Check the page details.", details: parsed.error.flatten() }, { status: 400 });
  try {
    const page = await prisma.$transaction(async tx => {
      const previous = await tx.legalPage.findUniqueOrThrow({ where: { id: body.id } });
      const updated = await tx.legalPage.update({
        where: { id: body.id },
        data: { ...parsed.data, ...(parsed.data.status === "PUBLISHED" && !previous.publishedAt ? { publishedAt: new Date() } : {}) },
      });
      if (previous.title !== updated.title || previous.content !== updated.content || previous.status !== updated.status) {
        await tx.legalPageRevision.create({ data: { pageId: updated.id, title: previous.title, content: previous.content, status: previous.status, editorId: admin.id } });
      }
      return updated;
    });
    return NextResponse.json({ page });
  } catch {
    return NextResponse.json({ error: "Page could not be updated. Check whether the slug is already in use." }, { status: 404 });
  }
}
