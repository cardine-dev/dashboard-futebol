"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import PageTitle from "@/components/Atoms/PageTitle";
import FormacaoView from "@/components/Formacao/FormacaoView";
import { useI18n } from "@/contexts/I18nContext";
import type { FormacaoResponse } from "@/type/formacao";

export default function FormacaoPage() {
  const { t } = useI18n();
  const [dados, setDados] = useState<FormacaoResponse | null>(null);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    fetch("/api/formacao")
      .then(async (r) => {
        if (!r.ok) throw new Error("erro");
        return r.json();
      })
      .then((d: FormacaoResponse) => setDados(d))
      .catch(() => setErro(true));
  }, []);

  return (
    <section className="w-full bg-gray-50 p-6">
      <div className="mx-auto w-full max-w-6xl">
        <PageTitle
          base={t.sidebar.analise}
          title={t.formacao.title}
          subtitle={t.formacao.subtitle}
        />
        <div className="mt-6">
          {erro ? (
            <p className="py-16 text-center text-sm text-red-600">{t.formacao.erro}</p>
          ) : !dados ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t.formacao.carregando}
            </div>
          ) : (
            <FormacaoView dados={dados} />
          )}
        </div>
      </div>
    </section>
  );
}
