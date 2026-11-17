import { redirect } from "next/navigation";
import { getStaffConfig } from "@/lib/staffTabsServer";
import { getViewer } from "@/lib/staffAuth";
import StaffShell from "./StaffShell";

// Tab names/icons/visibility are edited in Settings and must show up immediately,
// and every request must be checked against the sign-in cookie.
export const dynamic = "force-dynamic";

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  // Staff data is protected: nobody gets past this without signing in (unless the admin switched sign-in off).
  const viewer = await getViewer();
  if (viewer.kind === "none") redirect("/login?as=staff");

  const config = await getStaffConfig();
  return (
    <StaffShell
      config={config}
      isAdmin={viewer.kind === "admin"}
      userName={viewer.kind === "staff" ? viewer.name || viewer.username : null}
    >
      {children}
    </StaffShell>
  );
}
