import { createHash, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
async function authorised(){const user=await requireAdmin();return user?.role==="ADMIN"?user:null;}
const schema=z.object({publicId:z.string().min(1).max(255),secureUrl:z.string().url().refine(v=>v.startsWith("https://res.cloudinary.com/")),signature:z.string().regex(/^[a-f0-9]{40}$/i),version:z.union([z.string(),z.number()]).transform(String),resourceType:z.enum(["IMAGE","VIDEO","RAW"]),format:z.string().min(1).max(20),bytes:z.number().int().positive(),width:z.number().int().positive().nullable().optional(),height:z.number().int().positive().nullable().optional(),duration:z.number().positive().nullable().optional(),originalFilename:z.string().max(255).optional().nullable(),folderId:z.string().min(1).nullable().optional(),title:z.string().max(160).optional().nullable(),altText:z.string().max(300).optional().nullable(),tags:z.array(z.string().trim().min(1).max(40)).max(20).default([])});
function validSignature(publicId:string,version:string,signature:string,secret:string){const expected=createHash("sha1").update(`public_id=${publicId}&version=${version}${secret}`).digest("hex"),a=Buffer.from(expected),b=Buffer.from(signature);return a.length===b.length&&timingSafeEqual(a,b);}
export async function GET(request:NextRequest){
 const admin=await authorised();if(!admin)return NextResponse.json({error:"Administrator permission required."},{status:403});
 const folderId=request.nextUrl.searchParams.get("folderId"),q=request.nextUrl.searchParams.get("q")?.trim().slice(0,100),type=request.nextUrl.searchParams.get("type");
 const page=Math.max(1,Math.min(10000,Number(request.nextUrl.searchParams.get("page"))||1)),pageSize=40;
 const where={...(folderId==="root"?{folderId:null}:folderId?{folderId}:{}),...(type&&["IMAGE","VIDEO","RAW"].includes(type)?{resourceType:type as "IMAGE"|"VIDEO"|"RAW"}:{}),...(q?{OR:[{title:{contains:q,mode:"insensitive" as const}},{originalFilename:{contains:q,mode:"insensitive" as const}},{altText:{contains:q,mode:"insensitive" as const}},{tags:{has:q}}]}:{})};
 const [assets,total,folders]=await Promise.all([
  prisma.mediaAsset.findMany({where,include:{folder:{select:{id:true,name:true}}},orderBy:{createdAt:"desc"},skip:(page-1)*pageSize,take:pageSize}),
  prisma.mediaAsset.count({where}),
  prisma.mediaFolder.findMany({orderBy:{name:"asc"},include:{_count:{select:{assets:true}}}})
 ]);
 return NextResponse.json({assets,total,page,pageSize,totalPages:Math.max(1,Math.ceil(total/pageSize)),folders});
}
export async function POST(request:NextRequest){
 const admin=await authorised();if(!admin)return NextResponse.json({error:"Administrator permission required."},{status:403});
 const parsed=schema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return NextResponse.json({error:"Invalid Cloudinary upload response or media metadata.",details:parsed.error.flatten()},{status:400});
 const d=parsed.data,secret=process.env.CLOUDINARY_API_SECRET;if(!secret)return NextResponse.json({error:"Media storage is not configured."},{status:503});
 if(!/^(?:yoi-kiji[/]library[/])?[0-9a-f-]{36}$/i.test(d.publicId)||!validSignature(d.publicId,d.version,d.signature,secret))return NextResponse.json({error:"The uploaded asset signature could not be verified."},{status:400});
 const max=d.resourceType==="IMAGE"?25*1024*1024:d.resourceType==="VIDEO"?200*1024*1024:50*1024*1024;if(d.bytes>max)return NextResponse.json({error:"The uploaded file exceeds the allowed size for this media type."},{status:413});
 if(d.folderId&&!await prisma.mediaFolder.findUnique({where:{id:d.folderId},select:{id:true}}))return NextResponse.json({error:"Media folder not found."},{status:404});
 try{const asset=await prisma.mediaAsset.create({data:{publicId:d.publicId,secureUrl:d.secureUrl,resourceType:d.resourceType,format:d.format.toLowerCase(),bytes:d.bytes,width:d.width??null,height:d.height??null,durationSeconds:d.duration??null,originalFilename:d.originalFilename??null,folderId:d.folderId??null,title:d.title??null,altText:d.altText??null,tags:d.tags,uploaderId:admin.id}});return NextResponse.json({asset},{status:201});}
 catch(error){if((error as {code?:string})?.code==="P2002")return NextResponse.json({error:"This uploaded asset is already registered."},{status:409});throw error;}
}

export async function PATCH(request:NextRequest){
 const admin=await authorised();if(!admin)return NextResponse.json({error:"Administrator permission required."},{status:403});
 const parsed=z.object({id:z.string().min(1),title:z.string().max(160).nullable().optional(),altText:z.string().max(300).nullable().optional(),folderId:z.string().min(1).nullable().optional(),tags:z.array(z.string().trim().min(1).max(40)).max(20).optional()}).safeParse(await request.json().catch(()=>null));
 if(!parsed.success)return NextResponse.json({error:"Invalid media metadata.",details:parsed.error.flatten()},{status:400});
 const {id,...data}=parsed.data;if(data.folderId&&!await prisma.mediaFolder.findUnique({where:{id:data.folderId},select:{id:true}}))return NextResponse.json({error:"Media folder not found."},{status:404});
 const asset=await prisma.mediaAsset.update({where:{id},data});return NextResponse.json({asset});
}
