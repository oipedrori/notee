/**
 * Root page — redirects to /dashboard (authenticated) or /login.
 * The actual auth check is done in AppShell and middleware.
 */
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/dashboard");
}
