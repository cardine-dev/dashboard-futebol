"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { useI18n } from "@/contexts/I18nContext";
import { getPlayers, onPlayersInvalidated } from "@/lib/client/playersStore";
import { useAuth } from "@/app/auth/AuthContext";

/**
 * Lista de observação (shortlist). Fica no navegador de quem usa: é uma
 * conveniência pessoal, não dado do clube. Leitura e escrita protegidas por
 * try/catch porque o storage pode estar bloqueado (aba anônima, preview).
 */

const KEY = "fs_shortlist_v1";
const MAX = 24;

type Ctx = {
  ids: string[];
  has: (id: string) => boolean;
  toggle: (id: string, nome?: string) => void;
  clear: () => void;
};

const ShortlistCtx = createContext<Ctx | null>(null);

function read(): string[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter((x) => typeof x === "string").slice(0, MAX) : [];
  } catch {
    return [];
  }
}

function write(ids: string[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(ids));
  } catch {
    /* storage indisponível: a lista vale só nesta aba */
  }
}

export function ShortlistProvider({ children }: { children: React.ReactNode }) {
  const [ids, setIds] = useState<string[]>([]);
  const toast = useToast();
  const { t } = useI18n();

  useEffect(() => {
    setIds(read());
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) setIds(read());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Tira da lista atletas que saíram do cadastro (o contador do topo não mente).
  const { user } = useAuth();
  useEffect(() => {
    if (!user) return;
    let alive = true;
    const prune = () =>
      getPlayers()
        .then((all) => {
          if (!alive) return;
          const valid = new Set(all.map((p) => p.id));
          setIds((cur) => {
            const next = cur.filter((x) => valid.has(x));
            if (next.length === cur.length) return cur;
            write(next);
            return next;
          });
        })
        .catch(() => {});
    prune();
    const off = onPlayersInvalidated(prune);
    return () => {
      alive = false;
      off();
    };
  }, [user]);

  const has = useCallback((id: string) => ids.includes(id), [ids]);

  // Ref com a lista mais recente: toggles rápidos não leem estado velho, e o
  // aviso (outro componente) é disparado fora do updater do setState.
  const idsRef = useRef<string[]>([]);
  useEffect(() => {
    idsRef.current = ids;
  }, [ids]);

  const toggle = useCallback(
    (id: string, nome?: string) => {
      const prev = idsRef.current;
      const exists = prev.includes(id);
      if (!exists && prev.length >= MAX) {
        toast({ tone: "info", title: t.ui.shortlist.cheia });
        return;
      }
      const next = exists ? prev.filter((x) => x !== id) : [id, ...prev].slice(0, MAX);
      idsRef.current = next;
      setIds(next);
      write(next);
      if (nome) {
        toast({
          tone: exists ? "info" : "success",
          title: `${nome} ${exists ? t.ui.shortlist.removido : t.ui.shortlist.adicionado}`,
          action: {
            label: t.ui.toast.desfazer,
            onClick: () => {
              // desfaz só este item, sem apagar o que foi marcado depois
              const cur = idsRef.current;
              const undone = exists ? [id, ...cur.filter((x) => x !== id)].slice(0, MAX) : cur.filter((x) => x !== id);
              idsRef.current = undone;
              setIds(undone);
              write(undone);
            },
          },
        });
      }
    },
    [toast, t],
  );

  const clear = useCallback(() => {
    idsRef.current = [];
    setIds([]);
    write([]);
  }, []);

  const value = useMemo(() => ({ ids, has, toggle, clear }), [ids, has, toggle, clear]);

  return <ShortlistCtx.Provider value={value}>{children}</ShortlistCtx.Provider>;
}

export function useShortlist() {
  const ctx = useContext(ShortlistCtx);
  if (!ctx) throw new Error("useShortlist precisa de <ShortlistProvider>");
  return ctx;
}
