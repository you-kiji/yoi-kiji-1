import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

async function adminOnly(){const user=await requireAdmin();return user?.role==="ADMIN";}
const hrefSchema=z.string().trim().min(1).max(500).refine(value=>value.startsWith("/")&&!value.startsWith("//")||/^https:\/\//i.test(value), "Use a site path or secure https URL.");
const schema=z.object({
 label:z.string().trim().min(1).max(80),
 href:hrefSchema,
 location:z.enum(["HEADER","FOOTER"]).default("HEADER"),
 sortOrder:z.number().int().min(0).max(10000).default(0),
 isActive:z.boolean().default(true),
 openInNewTab:z.boolean().default(false),
});
export async function GET(){
 if(!await adminOnly())return NextResponse.json({error:"Administrator permission required."},{status:403});
 const items=await prisma.storeNavigationItem.findMany({orderBy:[{location:"asc"},{sortOrder:"asc"},{createdAt:"asc"}]});
 return NextResponse.json({items});
}
export async function POST(request:NextRequest){
 if(!await adminOnly())return NextResponse.json({error:"Administrator permission required."},{status:403});
 const parsed=schema.safeParse(await request.json().catch(()=>null));
 if(!parsed.success)return NextResponse.json({error:"Invalid navigation item.",details:parsed.error.flatten()},{status:400});
 const item=await prisma.storeNavigationItem.create({data:parsed.data});
 return NextResponse.json({item},{status:201});
}
export async function PATCH(request:NextRequest){
 if(!await adminOnly())return NextResponse.json({error:"Administrator permission required."},{status:403});
 const body=await request.json().catch(()=>null);
 if(typeof body?.id!=="string")return NextResponse.json({error:"Navigation item id is required."},{status:400});
 const parsed=schema.partial().safeParse(body.data);
 if(!parsed.success)return NextResponse.json({error:"Invalid navigation item.",details:parsed.error.flatten()},{status:400});
 try{return NextResponse.json({item:await prisma.storeNavigationItem.update({where:{id:body.id},data:parsed.data})});}
 catch{return NextResponse.json({error:"Navigation item not found."},{status:404});}
}
export async function DELETE(request:NextRequest){
 if(!await adminOnly())return NextResponse.json({error:"Administrator permission required."},{status:403});
 const id=request.nextUrl.searchParams.get("id");if(!id)return NextResponse.json({error:"Navigation item id is required."},{status:400});
 try{return NextResponse.json({item:await prisma.storeNavigationItem.update({where:{id},data:{isActive:false}})});}
 catch{return NextResponse.json({error:"Navigation item not found."},{status:404});}
}
