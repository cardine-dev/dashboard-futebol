import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/app/auth/AuthContext";
import { I18nProvider } from "@/contexts/I18nContext";
import AppShell from "../components/AppShell";
import { CLUBE, accentVars } from "@/config/clube";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: `Football Scouting · ${CLUBE.nome}`,
    template: `%s · ${CLUBE.nome}`,
  },
  description: "Gestão e scouting de elenco: atletas, contratos, direitos econômicos e mercado.",
};

export const viewport: Viewport = {
  themeColor: "#0a110e",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable}`}
      style={accentVars() as React.CSSProperties}
    >
      <body>
        <I18nProvider>
          <AuthProvider>
            <AppShell>{children}</AppShell>
          </AuthProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
