import type { MetadataRoute } from "next";
export default function robots():MetadataRoute.Robots{
 const production=process.env.VERCEL_ENV==="production";
 if(!production)return {rules:{userAgent:"*",disallow:"/"}};
 const base=process.env.NEXT_PUBLIC_SITE_URL??"https://www.yoikiji.com";
 return {rules:{userAgent:"*",allow:"/",disallow:["/admin/","/account/","/api/","/checkout","/cart"]},sitemap:base+"/sitemap.xml"};
}
