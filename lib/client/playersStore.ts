"use client";

import type { Jogador } from "@/type/jogador";

/**
 * Cache do elenco no cliente. Busca global, comparador e lista de observação
 * leem daqui: uma chamada a /api/jogadores por sessão em vez de uma por tela.
 * Quem altera o cadastro chama `invalidatePlayers()`.
 */

let cache: Promise<Jogador[]> | null = null;
const listeners = new Set<() => void>();

export function getPlayers(): Promise<Jogador[]> {
  if (!cache) {
    cache = fetch("/api/jogadores", { credentials: "same-origin" })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json();
        return (Array.isArray(data) ? data : data?.jogadores ?? []) as Jogador[];
      })
      .catch((err) => {
        cache = null;
        throw err;
      });
  }
  return cache;
}

export function invalidatePlayers() {
  cache = null;
  listeners.forEach((fn) => fn());
}

export function onPlayersInvalidated(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
