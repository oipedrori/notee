"use client";

/**
 * ClientProviders — wraps the app in client-only providers.
 * Rendered only on the client side to prevent Firebase SSR errors
 * during Next.js static page prerendering.
 */
import { AuthProvider } from "@/context/AuthContext";

export default function ClientProviders({ children }: { children: React.ReactNode }) {
    return <AuthProvider>{children}</AuthProvider>;
}
