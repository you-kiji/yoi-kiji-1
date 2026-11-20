"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
export function LogoutButton({labels={}}:{labels?:Record<string,string>}){const t=(key:string,fallback:string)=>labels[key]??fallback;const router=useRouter();const [busy,setBusy]=useState(false);async function logout(){setBusy(true);await fetch("/api/auth/logout",{method:"POST"});router.push("/");router.refresh();}return <button className="logout-button" type="button" onClick={logout} disabled={busy}>{busy?t("account.signingOut","Signing out…"):t("account.signOut","Sign out")}</button>}
