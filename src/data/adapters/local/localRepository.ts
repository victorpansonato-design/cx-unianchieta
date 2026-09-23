/**
 * Adaptador local: dados em localStorage, arquivos em IndexedDB.
 *
 * Limitação que a tela de Backup explica ao usuário: tudo fica NESTE
 * navegador, neste computador. Outra pessoa não vê o que está aqui.
 */
import { FILES_DB_NAME, STORAGE_KEYS } from '../../../config/app';
import type { CxRepository } from '../../repository';
import { normalizarSnapshot, snapshotInicial } from '../../schema';
import type { ID, Snapshot } from '../../types';
import { criarArquivosIndexedDb } from './indexedDbFiles';
import { LocalStorageDb } from './localStorageDb';

type ColecaoLista = 'processos' | 'tarefas' | 'andamentos' | 'anexos' | 'demandas' | 'notas';

const COLECOES = ['config', 'processos', 'tarefas', 'andamentos', 'anexos', 'demandas', 'notas', 'meta'] as const;

export function criarRepositorioLocal(): CxRepository {
  const db = new LocalStorageDb(STORAGE_KEYS.db);
  const arquivos = criarArquivosIndexedDb(FILES_DB_NAME);

  /** Cópia em memória do que está gravado, para regravar coleções inteiras. */
  let atual: Snapshot = snapshotInicial();

  function lerTudo(): Snapshot | null {
    if (db.ler('meta') === undefined) return null;
    const bruto: Record<string, unknown> = {};
    for (const c of COLECOES) bruto[c] = db.ler(c);
    return normalizarSnapshot(bruto);
  }

  function gravarTudo(s: Snapshot) {
    for (const c of COLECOES) db.escrever(c, s[c]);
  }

  function upsert<C extends ColecaoLista>(colecao: C, valor: Snapshot[C][number]) {
    const lista = atual[colecao] as Array<{ id: ID }>;
    const i = lista.findIndex((x) => x.id === valor.id);
    const nova = i === -1 ? [...lista, valor] : lista.map((x, j) => (j === i ? valor : x));
    atual = { ...atual, [colecao]: nova };
    db.escrever(colecao, nova);
  }

  function remover(colecao: ColecaoLista, id: ID) {
    const nova = (atual[colecao] as Array<{ id: ID }>).filter((x) => x.id !== id);
    atual = { ...atual, [colecao]: nova };
    db.escrever(colecao, nova);
  }

  return {
    async carregar() {
      const lido = lerTudo();
      if (lido) {
        atual = lido;
      } else {
        // Primeira abertura neste navegador: grava a configuração inicial.
        atual = snapshotInicial();
        gravarTudo(atual);
      }
      return atual;
    },

    async salvarConfig(config) {
      atual = { ...atual, config };
      db.escrever('config', config);
    },
    async salvarMeta(meta) {
      atual = { ...atual, meta };
      db.escrever('meta', meta);
    },

    async salvarProcesso(p) {
      upsert('processos', p);
    },
    async removerProcesso(id) {
      remover('processos', id);
    },
    async salvarTarefa(t) {
      upsert('tarefas', t);
    },
    async removerTarefa(id) {
      remover('tarefas', id);
    },
    async salvarAndamento(a) {
      upsert('andamentos', a);
    },
    async removerAndamento(id) {
      remover('andamentos', id);
    },
    async salvarAnexo(a) {
      upsert('anexos', a);
    },
    async removerAnexo(id) {
      remover('anexos', id);
    },
    async salvarDemanda(d) {
      upsert('demandas', d);
    },
    async removerDemanda(id) {
      remover('demandas', id);
    },
    async salvarNota(n) {
      upsert('notas', n);
    },
    async removerNota(id) {
      remover('notas', id);
    },

    async substituirTudo(s) {
      atual = s;
      gravarTudo(s);
    },

    arquivos,

    observar(aoMudar) {
      // Outra aba do mesmo navegador gravou: relê e avisa.
      const ouvir = (e: StorageEvent) => {
        if (e.storageArea !== localStorage || !db.pertence(e.key)) return;
        const lido = lerTudo();
        if (lido) atual = lido;
        aoMudar();
      };
      window.addEventListener('storage', ouvir);
      return () => window.removeEventListener('storage', ouvir);
    },
  };
}
