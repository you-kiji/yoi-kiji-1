import type { ReactNode } from "react";
import { AdminShopifyShell } from "@/components/admin-shopify-shell";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminShopifyShell>{children}</AdminShopifyShell>;
}
