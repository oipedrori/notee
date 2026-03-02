/**
 * Root layout — wraps all pages with the AuthProvider and Inter font.
 * AuthProvider is loaded client-side only to prevent Firebase SSR errors.
 */
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ClientProviders from "@/components/layout/ClientProviders";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Notee — Reuniões Inteligentes",
  description: "Grave, transcreva e analise reuniões com IA. Anotações que se organizam sozinhas.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body>
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
