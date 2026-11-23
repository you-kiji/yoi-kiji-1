import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

async function adminOnly(){const user=await requireAdmin();return user?.role==="ADMIN";}
const schema=z.object({
 platform:z.string().trim().min(2).max(40),
 label:z.string().trim().min(1).max(80),
 url:z.string().url().max(500),
 placement:z.enum(["header","footer","both"]).default("footer"),
 sortOrder:z.number().int().min(0).max(10000).default(0),
 isActive:z.boolean().default(true),
});
export async function GET(){
 if(!await adminOnly())return NextResponse.json({error:"Administrator permission required."},{status:403});
 const accounts=await prisma.socialAccount.findMany({orderBy:[{placement:"asc"},{sortOrder:"asc"}]});
 return NextResponse.json({accounts});
}
export async function POST(request:NextRequest){
 if(!await adminOnly())return NextResponse.json({error:"Administrator permission required."},{status:403});
 const body=await request.json().catch(()=>null);const parsed=schema.safeParse(body);
 if(!parsed.success)return NextResponse.json({error:"Invalid social account.",details:parsed.error.flatten()},{status:400});
 const account=await prisma.socialAccount.create({data:parsed.data});
 return NextResponse.json({account},{status:201});
}
export async function PATCH(request:NextRequest){
 if(!await adminOnly())return NextResponse.json({error:"Administrator permission required."},{status:403});
 const body=await request.json().catch(()=>null);
 if(typeof body?.id!=="string")return NextResponse.json({error:"Account id is required."},{status:400});
 const parsed=schema.partial().safeParse(body.data);
 if(!parsed.success)return NextResponse.json({error:"Invalid social account.",details:parsed.error.flatten()},{status:400});
 try{return NextResponse.json({account:await prisma.socialAccount.update({where:{id:body.id},data:parsed.data})});}
 catch{return NextResponse.json({error:"Social account not found."},{status:404});}
}
export async function DELETE(request:NextRequest){
 if(!await adminOnly())return NextResponse.json({error:"Administrator permission required."},{status:403});
 const id=request.nextUrl.searchParams.get("id");if(!id)return NextResponse.json({error:"Account id is required."},{status:400});
 try{return NextResponse.json({account:await prisma.socialAccount.update({where:{id},data:{isActive:false}})});}
 catch{return NextResponse.json({error:"Social account not found."},{status:404});}
}
