"use client";

import { StaffTabKey } from "@/lib/staffTabs";
import { useStaffTab } from "@/lib/staffConfigContext";

/** Shows a friendly message instead of the page if an admin has hidden this tab. */
export default function StaffTabGate({
  tab,
  children,
}: {
  tab: StaffTabKey;
  children: React.ReactNode;
}) {
  const { visible } = useStaffTab(tab);
  if (!visible) {
    return (
      <p className="rounded-lg border border-dashed border-hairline bg-surface/60 px-4 py-14 text-center text-sm text-muted">
        This section isn&apos;t available right now.
      </p>
    );
  }
  return <>{children}</>;
}
