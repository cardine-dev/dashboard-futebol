import { Suspense } from "react";
import LoginClient from "./LoginClient";
import pt from "@/locales/pt";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh bg-[var(--canvas)]" aria-busy="true" aria-label={pt.login.carregando} />
      }
    >
      <LoginClient />
    </Suspense>
  );
}
