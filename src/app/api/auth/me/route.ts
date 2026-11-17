import { NextResponse } from "next/server";
import { getAdminAccess } from "@/lib/adminAuth";
import { getStaffAccessSettings, getViewer } from "@/lib/staffAuth";

export async function GET() {
  const access = await getAdminAccess();
  const viewer = await getViewer(access);
  // Only visitors who are not admins need to know whether staff sign-in is on (the login page shows a guest link if it is off).
  const staffLoginRequired = access.isAdmin ? true : (await getStaffAccessSettings()).requireLogin;
  return NextResponse.json(
    {
      isAdmin: access.isAdmin,
      via: access.via,
      thisDeviceTrusted: Boolean(access.deviceId),
      viewer: viewer.kind,
      staff: viewer.kind === "staff" ? { username: viewer.username, name: viewer.name } : null,
      staffLoginRequired,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
