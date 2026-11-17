import { redirect } from "next/navigation";
import { getStaffConfig } from "@/lib/staffTabsServer";
import { visibleTabs } from "@/lib/staffTabs";

export const dynamic = "force-dynamic";

// Opens the first tab an admin has switched on (in the order they chose).
export default async function StaffRoot() {
  const first = visibleTabs(await getStaffConfig())[0];
  if (first) redirect(first.href);
  return (
    <p className="rounded-lg border border-dashed border-hairline bg-surface/60 px-4 py-14 text-center text-sm text-muted">
      Nothing is available in the staff view right now.
    </p>
  );
}
