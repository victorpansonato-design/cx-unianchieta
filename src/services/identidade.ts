/**
 * Quem está usando este navegador.
 *
 * Sem login nesta versão: na primeira abertura a pessoa escolhe quem é (um
 * membro da equipe CX ou "Diretoria"). A escolha fica salva no navegador, pode
 * ser trocada no header e serve para registrar o autor de cada andamento.
 */
import { STORAGE_KEYS } from '../config/app';
import { gravarPref, lerPref, removerPref } from '../lib/localPrefs';
import { AUTOR_DIRETORIA, type Autor, type Config, type Identidade } from '../data/types';

function validar(v: unknown): Identidade | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  if (o.tipo === 'diretoria') return { tipo: 'diretoria' };
  if (o.tipo === 'membro' && typeof o.membroId === 'string') {
    return { tipo: 'membro', membroId: o.membroId };
  }
  return null;
}

let atual: Identidade | null = validar(lerPref<unknown>(STORAGE_KEYS.identidade, null));
const ouvintes = new Set<() => void>();

export const identidade = {
  get: () => atual,
  definir(valor: Identidade | null) {
    atual = valor;
    if (valor) gravarPref(STORAGE_KEYS.identidade, valor);
    else removerPref(STORAGE_KEYS.identidade);
    ouvintes.forEach((f) => f());
  },
  subscribe(fn: () => void) {
    ouvintes.add(fn);
    return () => {
      ouvintes.delete(fn);
    };
  },
};

export interface Pessoa {
  id: string;
  nome: string;
  funcao: string | null;
  tipo: Identidade['tipo'];
}

/**
 * Resolve a identidade salva contra a equipe cadastrada. Um membro removido
 * (ou arquivado) não vale mais: a pessoa precisa escolher de novo.
 */
export function resolverPessoa(id: Identidade | null, config: Config): Pessoa | null {
  if (!id) return null;
  if (id.tipo === 'diretoria') {
    return { id: AUTOR_DIRETORIA.id, nome: AUTOR_DIRETORIA.nome, funcao: null, tipo: 'diretoria' };
  }
  const m = config.membros.find((x) => x.id === id.membroId && !x.arquivado);
  return m ? { id: m.id, nome: m.nome, funcao: m.funcao || null, tipo: 'membro' } : null;
}

/** Autor para gravar num registro. */
export function autorAtual(config: Config): Autor {
  const p = resolverPessoa(atual, config);
  return p ? { id: p.id, nome: p.nome } : { id: 'desconhecido', nome: 'Sem identificação' };
}
