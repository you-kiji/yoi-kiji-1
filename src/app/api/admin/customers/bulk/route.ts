import { NextRequest,NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
const schema=z.object({
 userIds:z.array(z.string().min(1)).min(1).max(100),
 name:z.string().trim().min(2).max(40),
 color:z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#0e300e")
});
export async function POST(request:NextRequest){
 const admin=await requireAdmin();
 if(!admin||admin.role!=="ADMIN")return NextResponse.json({error:"Administrator permission required."},{status:403});
 const parsed=schema.safeParse(await request.json().catch(()=>null));
 if(!parsed.success)return NextResponse.json({error:"Select 1–100 customers and enter a valid tag name."},{status:400});
 const userIds=[...new Set(parsed.data.userIds)];
 const valid=await prisma.user.count({where:{id:{in:userIds},role:"CUSTOMER"}});
 if(valid!==userIds.length)return NextResponse.json({error:"One or more selected customers are unavailable."},{status:404});
 const result=await prisma.$transaction(async tx=>{
  const tag=await tx.customerTag.upsert({where:{name:parsed.data.name},create:{name:parsed.data.name,color:parsed.data.color},update:{color:parsed.data.color}});
  const assignments=await tx.customerTagAssignment.createMany({data:userIds.map(userId=>({userId,tagId:tag.id})),skipDuplicates:true});
  await tx.customerActivity.createMany({data:userIds.map(userId=>({userId,actorId:admin.id,type:"TAG_ADDED",summary:"Added customer tag: "+tag.name}))});
  return {tag,assigned:assignments.count,selected:userIds.length};
 });
 return NextResponse.json(result,{status:201});
}
