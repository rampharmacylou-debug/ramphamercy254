import { redirect } from "next/navigation";
import DashboardShell from "@/components/DashboardShell";
import { AdminAreaProvider } from "@/lib/roleContext";
import { getAdminAccess } from "@/lib/adminAuth";

// Always check the cookie on the server — never serve this area from a cache.
export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const access = await getAdminAccess();
  if (!access.isAdmin) redirect("/login?as=admin");

  return (
    <AdminAreaProvider via={access.via}>
      <DashboardShell>{children}</DashboardShell>
    </AdminAreaProvider>
  );
}
