"use client";

/**
 * AppShell — the authenticated layout shell.
 * Renders the collapsible Sidebar alongside the main content area.
 * Sidebar state persists across page navigations via localStorage.
 */
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import Sidebar from "./Sidebar";
import Spinner from "@/components/ui/Spinner";

export default function AppShell({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [collapsed, setCollapsed] = useState(false);

    // Persist sidebar state
    useEffect(() => {
        const stored = localStorage.getItem("sidebar-collapsed");
        if (stored !== null) setCollapsed(stored === "true");
    }, []);

    const toggleSidebar = () => {
        const next = !collapsed;
        setCollapsed(next);
        localStorage.setItem("sidebar-collapsed", String(next));
    };

    // Redirect to login if unauthenticated
    useEffect(() => {
        if (!loading && !user) {
            router.push("/login");
        }
    }, [user, loading, router]);

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Spinner size={28} />
            </div>
        );
    }

    if (!user) return null; // prevents flash before redirect

    return (
        <div className="flex h-screen overflow-hidden bg-[var(--notion-bg)]">
            <Sidebar collapsed={collapsed} onToggle={toggleSidebar} />
            <main className="flex-1 overflow-y-auto min-w-0">
                {children}
            </main>
        </div>
    );
}
