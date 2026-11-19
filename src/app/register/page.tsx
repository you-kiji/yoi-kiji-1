import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
export const metadata = { title: "Create an account" };
export default async function RegisterPage({searchParams}:{searchParams:Promise<{next?:string}>}) {
 const {next}=await searchParams;
 const redirectTo=next&&next.startsWith("/")&&!next.startsWith("//")?next:"/account";
 return <main className="commerce-page"><div className="commerce-breadcrumb"><Link href="/">Home</Link><span>/</span> Create account</div><section className="auth-panel"><p className="eyebrow">JOIN YOI KIJI</p><h1>Make yourself<br/><em>at home.</em></h1><AuthForm mode="register" redirectTo={redirectTo}/><p className="auth-switch">Already have an account? <Link href={"/login?next="+encodeURIComponent(redirectTo)}>Sign in</Link></p></section></main>;
}
