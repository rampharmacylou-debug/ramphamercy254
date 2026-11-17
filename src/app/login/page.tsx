import { redirect } from "next/navigation";
import { getViewer } from "@/lib/staffAuth";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";

// Only same-site relative addresses are allowed as a "go here after signing in" target.
function safeNext(next: string | undefined) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : null;
}

type SearchParams = Promise<{ as?: string; next?: string }>;

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const { as, next } = await searchParams;
  const target = safeNext(next);

  // Already signed in? Go straight to the right place.
  const viewer = await getViewer();
  if (viewer.kind === "admin") redirect(target ?? "/products");
  if (viewer.kind === "staff") redirect(target ?? "/staff");

  return <LoginForm initialMode={as === "admin" ? "admin" : "staff"} next={target} />;
}
