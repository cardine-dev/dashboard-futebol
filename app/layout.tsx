// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/app/auth/AuthContext";
import { I18nProvider } from "@/contexts/I18nContext";
import AppShell from "../components/AppShell";

export const metadata: Metadata = {
  title: "Football Scouting",
  description: "Football Scouting Dashboard",
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="bg-gray-50">
        <I18nProvider>
          <AuthProvider>
            <AppShell>{children}</AppShell>
          </AuthProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
