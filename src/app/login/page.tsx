"use client";

/**
 * Login page — Notion-inspired centered card with Google Sign-In.
 */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Mic } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import Spinner from "@/components/ui/Spinner";

export default function LoginPage() {
    const { user, loading, signInWithGoogle } = useAuth();
    const router = useRouter();
    const [loginError, setLoginError] = useState<string | null>(null);

    // Already logged in → go to dashboard
    useEffect(() => {
        if (!loading && user) router.push("/dashboard");
    }, [user, loading, router]);

    const handleLogin = async () => {
        try {
            setLoginError(null);
            await signInWithGoogle();
        } catch (error: any) {
            console.error(error);
            if (error?.code === "auth/unauthorized-domain") {
                setLoginError("O domínio não está autorizado no Firebase. Adicione " + window.location.hostname + " em Authentication > Settings > Authorized Domains no painel do Firebase.");
            } else if (error?.code === "auth/popup-closed-by-user") {
                setLoginError(null); // Ignorar, o usuário só fechou o popup
            } else {
                setLoginError(error?.message || "Erro ao fazer login com o Google.");
            }
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Spinner size={28} />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--notion-bg-alt)] px-4">
            <div className="w-full max-w-sm">
                {/* Card */}
                <div className="bg-white rounded-2xl border border-[var(--notion-border)] shadow-sm p-8 fade-in">
                    {/* Logo mark */}
                    <div className="flex items-center justify-center mb-6">
                        <div className="flex items-center gap-2">
                            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-[var(--notion-text)]">
                                <Mic size={18} className="text-white" />
                            </div>
                            <span className="text-[1.6rem] font-bold tracking-tight text-[var(--notion-text)]">
                                notee
                            </span>
                        </div>
                    </div>

                    <h1 className="text-[22px] font-bold text-[var(--notion-text)] text-center mb-1">
                        Bem-vindo de volta
                    </h1>
                    <p className="text-[14px] text-[var(--notion-text-secondary)] text-center mb-8">
                        Suas reuniões, finalmente organizadas.
                    </p>

                    {loginError && (
                        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-[13px] text-center">
                            {loginError}
                        </div>
                    )}

                    {/* Google Sign-In button */}
                    <button
                        onClick={handleLogin}
                        className="flex items-center justify-center gap-3 w-full px-4 py-2.5 rounded-lg border border-[var(--notion-border)] bg-white hover:bg-[var(--notion-hover)] transition-colors text-[14px] font-medium text-[var(--notion-text)] focus-visible:ring-2 focus-visible:ring-[var(--notion-accent)]"
                        aria-label="Entrar com Google"
                    >
                        {/* Google SVG */}
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
                            <path d="M17.64 9.205c0-.638-.057-1.252-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.7-1.567 2.684-3.875 2.684-6.616Z" fill="#4285F4" />
                            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853" />
                            <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05" />
                            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335" />
                        </svg>
                        Entrar com Google
                    </button>

                    <p className="mt-6 text-[12px] text-[var(--notion-text-secondary)] text-center leading-relaxed">
                        Ao entrar, você concorda com os nossos{" "}
                        <span className="underline cursor-pointer">Termos de Uso</span> e{" "}
                        <span className="underline cursor-pointer">Política de Privacidade</span>.
                    </p>
                </div>
            </div>
        </div>
    );
}
