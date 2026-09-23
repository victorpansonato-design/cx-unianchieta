/**
 * Roteador por hash, sem dependência.
 *
 * Por que hash (#/processos/CX-001): o sistema roda dentro do Funcionário
 * Online, num subcaminho que não controlamos. Com hash, nenhum servidor precisa
 * reescrever URL — qualquer link aberto direto funciona, e o build é só um
 * punhado de arquivos estáticos.
 */
import { useMemo, useSyncExternalStore } from 'react';

export type AbaProcesso = 'visao-geral' | 'antes-e-depois' | 'tarefas' | 'andamentos' | 'anexos';
export type SecaoConfig =
  | 'etapas'
  | 'equipe'
  | 'setores'
  | 'origens'
  | 'niveis'
  | 'aparencia'
  | 'backup';

export type Rota =
  | { nome: 'painel' }
  | { nome: 'meu-trabalho' }
  | { nome: 'demandas'; demandaId: string | null }
  | { nome: 'notas'; notaId: string | null }
  | { nome: 'relatorio' }
  | { nome: 'processos'; query: URLSearchParams }
  | { nome: 'concluidos'; query: URLSearchParams }
  | { nome: 'processo'; codigo: string; aba: AbaProcesso }
  | { nome: 'comparacao'; codigo: string }
  | { nome: 'resumo'; codigo: string }
  | { nome: 'configuracoes'; secao: SecaoConfig }
  | { nome: 'nao-encontrada' };

export const ABAS_PROCESSO: readonly AbaProcesso[] = [
  'visao-geral',
  'antes-e-depois',
  'tarefas',
  'andamentos',
  'anexos',
];

export const SECOES_CONFIG: readonly SecaoConfig[] = [
  'etapas',
  'equipe',
  'setores',
  'origens',
  'niveis',
  'aparencia',
  'backup',
];

export function lerRota(hash: string): Rota {
  const semHash = hash.replace(/^#/, '') || '/';
  const [caminho, busca = ''] = semHash.split('?');
  const partes = caminho.split('/').filter(Boolean).map(decodeURIComponent);

  if (partes.length === 0) return { nome: 'painel' };
  if (partes[0] === 'meu-trabalho') return { nome: 'meu-trabalho' };
  if (partes[0] === 'demandas') return { nome: 'demandas', demandaId: partes[1] ?? null };
  if (partes[0] === 'notas') return { nome: 'notas', notaId: partes[1] ?? null };
  if (partes[0] === 'relatorio') return { nome: 'relatorio' };
  if (partes[0] === 'concluidos') return { nome: 'concluidos', query: new URLSearchParams(busca) };

  if (partes[0] === 'processos') {
    if (partes.length === 1) return { nome: 'processos', query: new URLSearchParams(busca) };
    const codigo = partes[1];
    if (partes[2] === 'comparacao') return { nome: 'comparacao', codigo };
    if (partes[2] === 'resumo') return { nome: 'resumo', codigo };
    const aba = (partes[2] ?? 'visao-geral') as AbaProcesso;
    if (ABAS_PROCESSO.includes(aba)) return { nome: 'processo', codigo, aba };
    return { nome: 'nao-encontrada' };
  }

  if (partes[0] === 'configuracoes') {
    const secao = (partes[1] ?? 'etapas') as SecaoConfig;
    if (SECOES_CONFIG.includes(secao)) return { nome: 'configuracoes', secao };
  }

  return { nome: 'nao-encontrada' };
}

function comQuery(base: string, filtros?: Record<string, string | undefined>) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(filtros ?? {})) if (v) q.set(k, v);
  const s = q.toString();
  return s ? `${base}?${s}` : base;
}

/** Construtores de link — nenhuma tela monta string de rota à mão. */
export const rotas = {
  painel: () => '#/',
  meuTrabalho: () => '#/meu-trabalho',
  demandas: (id?: string) => (id ? `#/demandas/${encodeURIComponent(id)}` : '#/demandas'),
  notas: (id?: string) => (id ? `#/notas/${encodeURIComponent(id)}` : '#/notas'),
  relatorio: () => '#/relatorio',
  processos: (filtros?: Record<string, string | undefined>) => comQuery('#/processos', filtros),
  concluidos: (filtros?: Record<string, string | undefined>) => comQuery('#/concluidos', filtros),
  processo: (codigo: string, aba: AbaProcesso = 'visao-geral') =>
    aba === 'visao-geral'
      ? `#/processos/${encodeURIComponent(codigo)}`
      : `#/processos/${encodeURIComponent(codigo)}/${aba}`,
  comparacao: (codigo: string) => `#/processos/${encodeURIComponent(codigo)}/comparacao`,
  resumo: (codigo: string) => `#/processos/${encodeURIComponent(codigo)}/resumo`,
  configuracoes: (secao: SecaoConfig = 'etapas') =>
    secao === 'etapas' ? '#/configuracoes' : `#/configuracoes/${secao}`,
};

const EVENTO = 'cx:navegar';

function assinar(fn: () => void) {
  window.addEventListener('hashchange', fn);
  window.addEventListener(EVENTO, fn);
  return () => {
    window.removeEventListener('hashchange', fn);
    window.removeEventListener(EVENTO, fn);
  };
}

/** Navega para um link de `rotas`. `substituir` não cria entrada no histórico. */
export function navegar(href: string, opcoes: { substituir?: boolean } = {}) {
  if (opcoes.substituir) {
    history.replaceState(null, '', href);
    // replaceState não dispara hashchange; avisa os ouvintes por conta própria.
    window.dispatchEvent(new Event(EVENTO));
  } else {
    window.location.hash = href.replace(/^#/, '');
  }
}

export function useRota(): Rota {
  const hash = useSyncExternalStore(assinar, () => window.location.hash);
  return useMemo(() => lerRota(hash), [hash]);
}

/**
 * Chave de transição de página: muda quando a TELA muda, não quando a aba
 * interna muda — trocar de aba não refaz a animação de entrada da página.
 */
export function chaveDaTela(rota: Rota): string {
  switch (rota.nome) {
    case 'processo':
      return `processo:${rota.codigo}`;
    case 'comparacao':
    case 'resumo':
      return `${rota.nome}:${rota.codigo}`;
    // Abrir uma demanda ou nota abre um painel lateral: a página por trás não muda.
    case 'demandas':
    case 'notas':
      return rota.nome;
    default:
      return rota.nome;
  }
}
