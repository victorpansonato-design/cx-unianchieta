/**
 * Contrato do armazenamento.
 *
 * É a única fronteira entre o sistema e o lugar onde os dados moram. Hoje:
 * localStorage + IndexedDB (src/data/adapters/local). Amanhã: um banco
 * compartilhado (Supabase, um serviço do TI, uma integração com o Lyceum) —
 * basta escrever outro adaptador que cumpra esta interface e trocar UMA linha
 * em src/data/index.ts. Nenhuma tela muda.
 *
 * Tudo é assíncrono de propósito: um banco remoto é, e as telas já são
 * escritas para isso (atualização otimista + indicador de salvamento).
 */
import type { Andamento, Anexo, Config, Demanda, ID, Meta, Nota, Processo, Snapshot, Tarefa } from './types';

/** Conteúdo binário dos anexos (PDFs, imagens, documentos). */
export interface ArmazenamentoDeArquivos {
  salvar(id: ID, conteudo: Blob): Promise<void>;
  obter(id: ID): Promise<Blob | null>;
  remover(id: ID): Promise<void>;
  /** Apaga todos os arquivos (usado ao importar um backup). */
  limpar(): Promise<void>;
}

export interface CxRepository {
  /** Carrega tudo. Na primeira abertura, cria a configuração inicial. */
  carregar(): Promise<Snapshot>;

  salvarConfig(config: Config): Promise<void>;
  salvarMeta(meta: Meta): Promise<void>;

  salvarProcesso(processo: Processo): Promise<void>;
  removerProcesso(id: ID): Promise<void>;

  salvarTarefa(tarefa: Tarefa): Promise<void>;
  removerTarefa(id: ID): Promise<void>;

  salvarAndamento(andamento: Andamento): Promise<void>;
  removerAndamento(id: ID): Promise<void>;

  salvarAnexo(anexo: Anexo): Promise<void>;
  removerAnexo(id: ID): Promise<void>;

  salvarDemanda(demanda: Demanda): Promise<void>;
  removerDemanda(id: ID): Promise<void>;

  salvarNota(nota: Nota): Promise<void>;
  removerNota(id: ID): Promise<void>;

  /** Substitui todos os dados (import de backup). */
  substituirTudo(snapshot: Snapshot): Promise<void>;

  arquivos: ArmazenamentoDeArquivos;

  /**
   * Avisa quando os dados mudaram por fora deste app (outra aba aberta; num
   * banco remoto, outra pessoa). Devolve a função que cancela a inscrição.
   */
  observar(aoMudar: () => void): () => void;
}

/** Erro de armazenamento com mensagem pronta para a tela. */
export class ErroArmazenamento extends Error {
  constructor(
    mensagem: string,
    readonly causa: 'cota' | 'indisponivel' | 'desconhecido' = 'desconhecido',
  ) {
    super(mensagem);
  }
}
