/**
 * Store: o estado do sistema em memória.
 *
 * Fluxo de toda escrita:
 *   1. a regra de negócio (src/domain) devolve uma lista de Op;
 *   2. `aplicar` atualiza a memória na hora (a tela responde sem esperar);
 *   3. em seguida persiste cada Op pelo repositório, em ordem;
 *   4. o estado de salvamento vai de "salvando" a "salvo" — ou a "erro", e
 *      quem estiver ouvindo `aoFalhar` avisa a pessoa.
 *
 * As telas leem daqui via hooks (src/hooks/useStore.ts) e escrevem só por
 * src/services/acoes.ts. Nenhuma tela fala com o repositório diretamente.
 */
import { agoraISO } from '../lib/dates';
import { aplicarOps, type Op } from './ops';
import { ErroArmazenamento, type CxRepository } from './repository';
import { snapshotInicial } from './schema';
import type { Snapshot } from './types';

export type StatusCarga = 'carregando' | 'pronto' | 'falhou';

export interface EstadoSalvamento {
  status: 'ocioso' | 'salvando' | 'salvo' | 'erro';
  /** Última gravação bem-sucedida. */
  em: string | null;
  mensagem?: string;
}

export interface EstadoStore {
  carga: StatusCarga;
  erroCarga: string | null;
  snapshot: Snapshot;
  salvamento: EstadoSalvamento;
}

function mensagemDe(erro: unknown): string {
  if (erro instanceof ErroArmazenamento) return erro.message;
  return 'Não foi possível salvar a última alteração.';
}

async function persistir(repo: CxRepository, op: Op): Promise<void> {
  switch (op.tipo) {
    case 'processo':
      return repo.salvarProcesso(op.valor);
    case 'processo-remover':
      return repo.removerProcesso(op.id);
    case 'tarefa':
      return repo.salvarTarefa(op.valor);
    case 'tarefa-remover':
      return repo.removerTarefa(op.id);
    case 'andamento':
      return repo.salvarAndamento(op.valor);
    case 'andamento-remover':
      return repo.removerAndamento(op.id);
    case 'anexo':
      return repo.salvarAnexo(op.valor);
    case 'anexo-remover':
      return repo.removerAnexo(op.id);
    case 'demanda':
      return repo.salvarDemanda(op.valor);
    case 'demanda-remover':
      return repo.removerDemanda(op.id);
    case 'nota':
      return repo.salvarNota(op.valor);
    case 'nota-remover':
      return repo.removerNota(op.id);
    case 'config':
      return repo.salvarConfig(op.valor);
    case 'meta':
      return repo.salvarMeta(op.valor);
  }
}

export function criarStore(repo: CxRepository) {
  let estado: EstadoStore = {
    carga: 'carregando',
    erroCarga: null,
    snapshot: snapshotInicial(),
    salvamento: { status: 'ocioso', em: null },
  };
  const ouvintes = new Set<() => void>();
  const ouvintesFalha = new Set<(mensagem: string) => void>();
  let pendentes = 0;
  // Escritas em fila: a ordem de persistência é a ordem das ações.
  let fila: Promise<void> = Promise.resolve();

  function definir(parcial: Partial<EstadoStore>) {
    estado = { ...estado, ...parcial };
    ouvintes.forEach((f) => f());
  }

  function falhar(erro: unknown) {
    const mensagem = mensagemDe(erro);
    definir({ salvamento: { status: 'erro', em: estado.salvamento.em, mensagem } });
    ouvintesFalha.forEach((f) => f(mensagem));
  }

  return {
    getEstado: () => estado,

    subscribe(fn: () => void) {
      ouvintes.add(fn);
      return () => {
        ouvintes.delete(fn);
      };
    },

    /** Inscreve-se para ser avisado quando uma gravação falhar. */
    aoFalhar(fn: (mensagem: string) => void) {
      ouvintesFalha.add(fn);
      return () => {
        ouvintesFalha.delete(fn);
      };
    },

    async iniciar() {
      try {
        const snapshot = await repo.carregar();
        definir({ carga: 'pronto', snapshot });
        repo.observar(async () => {
          // Outra aba (ou, num banco remoto, outra pessoa) mudou os dados.
          definir({ snapshot: await repo.carregar() });
        });
      } catch (erro) {
        definir({
          carga: 'falhou',
          erroCarga:
            erro instanceof ErroArmazenamento
              ? erro.message
              : 'Não foi possível abrir os dados deste navegador.',
        });
      }
    },

    /** Aplica na memória na hora e persiste em seguida. */
    aplicar(ops: Op[]): Promise<void> {
      if (ops.length === 0) return Promise.resolve();
      definir({
        snapshot: aplicarOps(estado.snapshot, ops),
        salvamento: { status: 'salvando', em: estado.salvamento.em },
      });
      pendentes++;
      fila = fila.then(async () => {
        try {
          for (const op of ops) await persistir(repo, op);
          pendentes--;
          if (pendentes === 0) definir({ salvamento: { status: 'salvo', em: agoraISO() } });
        } catch (erro) {
          pendentes--;
          falhar(erro);
        }
      });
      return fila;
    },

    /** Troca todos os dados (import de backup). */
    async substituirTudo(snapshot: Snapshot) {
      await fila;
      await repo.substituirTudo(snapshot);
      definir({ snapshot, salvamento: { status: 'salvo', em: agoraISO() } });
    },

    arquivos: repo.arquivos,
  };
}

export type Store = ReturnType<typeof criarStore>;
