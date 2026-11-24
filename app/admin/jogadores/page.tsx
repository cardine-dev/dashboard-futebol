"use client";

import { useEffect, useMemo, useState } from "react";
import { Eye, Pencil, Trash, PlusCircle } from "lucide-react";

import PageTitle from "@/components/Atoms/PageTitle";
import AdminRow, { AdminRowHeader } from "@/components/AdminRow";
import AdminButton from "@/components/Atoms/AdminButton";
import ConfirmDeleteDialog from "@/components/Atoms/ConfirmDeleteDialog";
import { useI18n } from "@/contexts/I18nContext";
import { getPlayers, invalidatePlayers } from "@/lib/client/playersStore";
import { useToast } from "@/components/ui/Toast";

function formatCreatedAt(input: any) {
  if (!input) return "--/--/----";
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return "--/--/----";
  return d.toLocaleDateString("pt-BR");
}

export default function AdminJogadoresPage() {
  const { t } = useI18n();
  const toast = useToast();
  const [jogadores, setJogadores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [delOpen, setDelOpen] = useState(false);
  const [delTarget, setDelTarget] = useState<any | null>(null);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const lista = await getPlayers();

        if (active) setJogadores(lista);
      } catch (e: any) {
        if (active) {
          setJogadores([]);
          setError(e?.message || t.adminJogadoresExtra.erroCarregar);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const expectedPhrase = useMemo(() => {
    if (!delTarget?.nome) return "DELETAR";
    return `DELETAR ${String(delTarget.nome).trim()}`;
  }, [delTarget]);

  async function confirmDelete() {
    if (!delTarget?.id) return;

    try {
      const res = await fetch(`/api/jogadores/${delTarget.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Erro HTTP ${res.status}`);
      }

      setJogadores((prev) => prev.filter((j) => j.id !== delTarget.id));
      invalidatePlayers();
      toast({ title: t.ui.toast.excluido, description: delTarget.nome });
      setDelOpen(false);
      setDelTarget(null);
    } catch (err: any) {
      console.error(err);
      throw new Error(err?.message ?? t.adminJogadores.erroDeletar);
    }
  }

  const headerActions = (
    <AdminButton label={t.adminJogadores.novoJogador} icon={PlusCircle} href="/admin/jogadores/novo" />
  );

  return (
    <section className="mx-auto w-full max-w-6xl">
      <ConfirmDeleteDialog
        open={delOpen}
        title={t.adminJogadores.deletarTitle}
        description={t.adminJogadores.deletarDesc}
        itemName={delTarget?.nome ?? ""}
        expectedPhrase={expectedPhrase}
        onCancel={() => {
          setDelOpen(false);
          setDelTarget(null);
        }}
        onConfirm={confirmDelete}
      />

      <PageTitle
        base="Admin"
        title={t.adminJogadores.title}
        subtitle={t.adminJogadores.subtitle}
        actions={headerActions}
        className="mb-6"
        crumbLabel={t.adminJogadores.title}
      />

      {error && !loading && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-hidden surface">
        {/* Cabeçalho */}
        <AdminRowHeader title={t.adminJogadores.jogador} col3={t.adminJogadores.criadoEm} actions={t.adminJogadores.acoes} />

        {/* Linhas */}
        {loading ? (
          <div className="py-10 text-center text-gray-500">{t.adminJogadores.carregando}</div>
        ) : jogadores.length === 0 ? (
          <div className="py-10 text-center text-gray-500">
            {t.adminJogadores.nenhumJogador}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {jogadores.map((j) => (
              <AdminRow
                key={j.id}
                foto={j.imagemUrl}
                title={j.nome}
                posicao={j.posicao}
                subtitle={(t.positions as any)[j.posicao] ?? j.posicao}
                createdAt={formatCreatedAt(j.createdAt)}
                actions={[
                  { icon: Eye, href: `/jogadores/${j.id}`, color: "blue" },
                  { icon: Pencil, href: `/admin/jogadores/${j.id}/editar`, color: "yellow" },
                  {
                    icon: Trash,
                    color: "red",
                    onClick: () => {
                      setDelTarget(j);
                      setDelOpen(true);
                    },
                  },
                ]}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
