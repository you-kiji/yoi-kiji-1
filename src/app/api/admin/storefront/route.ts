import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

async function authorised() {
  const admin = await requireAdmin();
  return admin?.role === "ADMIN" ? admin : null;
}
const slideSchema = z.object({
  imageUrl: z.union([z.string().url(), z.literal("")]).optional().default(""),
  imageAlt: z.string().max(200).optional().default(""),
  eyebrow: z.string().max(120).optional().default(""),
  title: z.string().max(180).optional().default(""),
  body: z.string().max(1000).optional().default(""),
  ctaLabel: z.string().max(80).optional().default(""),
  ctaHref: z.string().max(300).optional().default(""),
});
const sectionSchema = z.object({
  key: z.string().trim().min(2).max(60).regex(/^[a-z0-9-]+$/),
  sectionType: z.enum(["slideshow","image-banner","rich-text","image-with-text","featured-collections","product-grid","testimonial","blog-grid","spacer","hero-video","photo-collage","text-strip","trust-bar"]).default("rich-text"),
  settings: z.record(z.string(), z.unknown()).optional(),
  slides: z.array(slideSchema).max(30).optional(),
  eyebrow: z.string().max(120).optional().nullable(),
  title: z.string().max(180).optional().nullable(),
  body: z.string().max(3000).optional().nullable(),
  imageUrl: z.union([z.string().url(), z.literal("")]).optional().nullable(),
  imageAlt: z.string().max(200).optional().nullable(),
  ctaLabel: z.string().max(80).optional().nullable(),
  ctaHref: z.string().max(300).optional().nullable(),
  position: z.number().int().min(0).max(10000).default(0),
  isActive: z.boolean().default(true),
});
const collectionSchema = z.object({
  name: z.string().trim().min(2).max(100),
  slug: z.string().trim().min(2).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().max(1000).optional().nullable(),
  imageUrl: z.union([z.string().url(), z.literal("")]).optional().nullable(),
  sortOrder: z.number().int().min(0).max(10000).default(0),
  isActive: z.boolean().default(true),
  productIds: z.array(z.string().min(1)).max(200).optional().default([]),
});

export async function GET() {
  const admin = await authorised();
  if (!admin) return NextResponse.json({ error: "Administrator permission required." }, { status: 403 });
  const [sections, collections, products] = await Promise.all([
    prisma.homepageSection.findMany({ orderBy: [{ position: "asc" }, { key: "asc" }] }),
    prisma.storeCollection.findMany({
      include: {
        products: { include: { product: { select: { id: true, name: true, sku: true } } } },
        _count: { select: { products: true } },
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.product.findMany({ where: { isActive: true }, select: { id: true, name: true, sku: true }, orderBy: { name: "asc" }, take: 300 }),
  ]);
  return NextResponse.json({ sections, collections, products });
}

export async function POST(request: NextRequest) {
  const admin = await authorised();
  if (!admin) return NextResponse.json({ error: "Administrator permission required." }, { status: 403 });
  const body = await request.json().catch(() => null);
  if (!body || !["section", "collection"].includes(body.resource)) return NextResponse.json({ error: "Choose a valid content type." }, { status: 400 });
  if (body.resource === "section") {
    const parsed = sectionSchema.safeParse(body.data);
    if (!parsed.success) return NextResponse.json({ error: "Invalid homepage section.", details: parsed.error.flatten() }, { status: 400 });
    try {
      const { settings, ...sectionFields } = parsed.data;
      const data: Prisma.HomepageSectionUncheckedCreateInput = {
        ...sectionFields,
        ...(settings !== undefined ? { settings: settings as Prisma.InputJsonValue } : {}),
      };
      const section = await prisma.homepageSection.create({ data });
      return NextResponse.json({ section }, { status: 201 });
    } catch {
      return NextResponse.json({ error: "That section key already exists." }, { status: 409 });
    }
  }
  const parsed = collectionSchema.safeParse(body.data);
  if (!parsed.success) return NextResponse.json({ error: "Invalid collection.", details: parsed.error.flatten() }, { status: 400 });
  const { productIds, ...data } = parsed.data;
  const existing = await prisma.product.findMany({ where: { id: { in: productIds }, isActive: true }, select: { id: true } });
  if (existing.length !== new Set(productIds).size) return NextResponse.json({ error: "One or more selected products are unavailable." }, { status: 400 });
  try {
    const collection = await prisma.$transaction(async tx => {
      const created = await tx.storeCollection.create({ data });
      if (productIds.length) await tx.storeCollectionProduct.createMany({ data: productIds.map((productId, index) => ({ collectionId: created.id, productId, sortOrder: index })) });
      return created;
    });
    const fullCollection = await prisma.storeCollection.findUnique({ where: { id: collection.id }, include: { products: { include: { product: { select: { id: true, name: true, sku: true } } } }, _count: { select: { products: true } } } });
    return NextResponse.json({ collection: fullCollection }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Collection slug already exists." }, { status: 409 });
  }
}

export async function PATCH(request: NextRequest) {
  const admin = await authorised();
  if (!admin) return NextResponse.json({ error: "Administrator permission required." }, { status: 403 });
  const body = await request.json().catch(() => null);
  if (!body?.id || !["section", "collection"].includes(body.resource)) return NextResponse.json({ error: "A valid content id and type are required." }, { status: 400 });
  if (body.resource === "section") {
    const parsed = sectionSchema.partial().safeParse(body.data);
    if (!parsed.success) return NextResponse.json({ error: "Invalid homepage section.", details: parsed.error.flatten() }, { status: 400 });
    try {
      const { settings, ...sectionFields } = parsed.data;
      const data: Prisma.HomepageSectionUncheckedUpdateInput = {
        ...sectionFields,
        ...(settings !== undefined ? { settings: settings as Prisma.InputJsonValue } : {}),
      };
      const section = await prisma.homepageSection.update({ where: { id: body.id }, data });
      return NextResponse.json({ section });
    } catch {
      return NextResponse.json({ error: "Section not found or its key is already in use." }, { status: 404 });
    }
  }
  const parsed = collectionSchema.partial().safeParse(body.data);
  if (!parsed.success) return NextResponse.json({ error: "Invalid collection.", details: parsed.error.flatten() }, { status: 400 });
  const { productIds, ...data } = parsed.data;
  if (productIds) {
    const existing = await prisma.product.findMany({ where: { id: { in: productIds }, isActive: true }, select: { id: true } });
    if (existing.length !== new Set(productIds).size) return NextResponse.json({ error: "One or more selected products are unavailable." }, { status: 400 });
  }
  try {
    const collection = await prisma.$transaction(async tx => {
      const updated = await tx.storeCollection.update({ where: { id: body.id }, data });
      if (productIds) {
        await tx.storeCollectionProduct.deleteMany({ where: { collectionId: body.id } });
        if (productIds.length) await tx.storeCollectionProduct.createMany({ data: productIds.map((productId, index) => ({ collectionId: body.id, productId, sortOrder: index })) });
      }
      return updated;
    });
    const fullCollection = await prisma.storeCollection.findUnique({ where: { id: collection.id }, include: { products: { include: { product: { select: { id: true, name: true, sku: true } } } }, _count: { select: { products: true } } } });
    return NextResponse.json({ collection: fullCollection });
  } catch {
    return NextResponse.json({ error: "Collection could not be updated." }, { status: 404 });
  }
}

export async function DELETE(request: NextRequest) {
  const admin = await authorised();
  if (!admin) return NextResponse.json({ error: "Administrator permission required." }, { status: 403 });
  const id = request.nextUrl.searchParams.get("id");
  const resource = request.nextUrl.searchParams.get("resource");
  if (!id || !["section", "collection"].includes(resource ?? "")) return NextResponse.json({ error: "Content id and type are required." }, { status: 400 });
  try {
    const result = resource === "section"
      ? await prisma.homepageSection.update({ where: { id }, data: { isActive: false } })
      : await prisma.storeCollection.update({ where: { id }, data: { isActive: false } });
    return NextResponse.json({ item: result });
  } catch {
    return NextResponse.json({ error: "Content item not found." }, { status: 404 });
  }
}
