import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";
export async function GET() {
  const locales = await prisma.locale.findMany({ where: { isEnabled: true }, select: { code: true, name: true, nativeName: true, isDefault: true, direction: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
  return NextResponse.json({ locales }, { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } });
}
