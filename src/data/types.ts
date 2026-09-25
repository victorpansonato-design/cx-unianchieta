/**
 * Entidades do sistema.
 *
 * O desenho já é o de tabelas: tarefas, andamentos, anexos, demandas e notas
 * são coleções próprias ligadas por id, e não listas dentro do processo.
 * Quando o armazenamento sair do navegador para um banco compartilhado, cada
 * coleção vira uma tabela sem remodelar nada (ver docs/DADOS.md).
 */
import type { DateOnly, ISODateTime } from '../lib/dates';

export type { DateOnly, ISODateTime };
export type ID = string;

/* -- Configuração ---------------------------------------------------------- */

/** Item de uma lista configurável (setor, origem, nível…). */
export interface ItemLista {
  id: ID;
  nome: string;
  /**
   * Arquivado = removido da lista, mas ainda referenciado por algum registro.
   * Some dos seletores; o nome continua aparecendo onde já foi usado.
   */
  arquivado?: boolean;
}

export interface Membro extends ItemLista {
  funcao: string;
}

/** O que a etapa sinaliza no painel. É isso que alimenta "aguardando diretoria" e "com o TI". */
export type SinalEtapa = 'diretoria' | 'ti' | null;

export interface Etapa {
  id: ID;
  nome: string;
  /** Ajuda curta: o que se espera nesta etapa. Aparece dentro do processo. */
  descricao: string;
  sinal: SinalEtapa;
  /**
   * Tarefas que entram sozinhas no checklist quando um processo chega nesta
   * etapa. Escritas pela equipe; começam vazias.
   */
  tarefasPadrao: string[];
}

export interface Config {
  /** Em ordem. A última etapa encerra o processo. */
  etapas: Etapa[];
  membros: Membro[];
  /**
   * Pessoas do TI. Cada uma se cadastra ao entrar ("Sou do TI") e só vê a
   * Fila do TI. Ficam separadas da equipe CX: não são responsáveis de
   * processo nem de tarefa.
   */
  equipeTi: Membro[];
  setores: ItemLista[];
  origens: ItemLista[];
  /** Do menor para o maior. O mais alto aparece destacado. */
  prioridades: ItemLista[];
  /** Do menor para o maior. O mais alto aparece destacado. */
  impactos: ItemLista[];
}

export type ListaConfig = 'membros' | 'equipeTi' | 'setores' | 'origens' | 'prioridades' | 'impactos';

/* -- Processo -------------------------------------------------------------- */

export type Situacao = 'andamento' | 'pausado' | 'cancelado' | 'concluido';

export interface EntradaEtapa {
  etapaId: ID;
  /** Momento em que o processo entrou na etapa (registrado automaticamente). */
  entrada: ISODateTime;
}

/** Um passo do fluxo proposto (cenário "depois"). */
export interface PassoFluxo {
  id: ID;
  nome: string;
  responsavel: string;
  sistema: string;
}

/**
 * Uma mudança do prazo previsto. Guardada no processo (e não só no texto do
 * andamento) para dar para contar quantas vezes o prazo foi adiado.
 */
export interface MudancaPrazo {
  de: DateOnly | null;
  para: DateOnly | null;
  em: ISODateTime;
  motivo: string;
  autor: Autor;
}

/**
 * Onde o processo está do lado do TI. É paralelo à etapa do CX: o TI nunca
 * muda a etapa, só este status.
 * - fila: ninguém do TI puxou o processo ainda;
 * - desenvolvimento: alguém do TI está com ele;
 * - validar: o TI entregou e espera o CX conferir.
 */
export type StatusTi = 'fila' | 'desenvolvimento' | 'validar';

export interface TrabalhoTi {
  /** Pessoas do TI que puxaram o processo (config.equipeTi). */
  responsaveisIds: ID[];
  status: StatusTi;
  /** Previsão de entrega informada pelo TI. */
  previsao: DateOnly | null;
  /** Link do protótipo ou da entrega. */
  link: string;
}

/** Métrica definida pela própria equipe. Nunca pré-preenchida. */
export interface Indicador {
  id: ID;
  nome: string;
  antes: string;
  depois: string;
  fonte: string;
}

export interface Processo {
  id: ID;
  /** Código sequencial legível: CX-001. Nunca reaproveitado. */
  codigo: string;
  titulo: string;

  setorId: ID | null;
  /** Membros da equipe CX responsáveis. Pode ser mais de um. */
  responsaveisIds: ID[];
  /** Pessoas envolvidas de outros setores (texto livre). */
  envolvidos: string;
  origemId: ID | null;
  prioridadeId: ID | null;
  impactoId: ID | null;
  tags: string[];

  abertura: DateOnly;
  prazo: DateOnly | null;
  /** Toda mudança do prazo depois de definido, da mais antiga para a mais recente. */
  historicoPrazos: MudancaPrazo[];
  conclusao: DateOnly | null;

  etapaId: ID;
  historicoEtapas: EntradaEtapa[];
  situacao: Situacao;

  problema: {
    descricao: string;
    dores: string;
    efeitoAluno: string;
  };

  /** Cenário atual. O diagrama e o BPMN são anexos com contexto 'antes-*'. */
  antes: {
    observacoes: string;
  };

  /** Cenário proposto. */
  depois: {
    passos: PassoFluxo[];
    prototipoUrl: string;
    observacoes: string;
  };

  indicadores: Indicador[];

  /** Módulo ou rotina do Lyceum envolvida. Só registro, sem integração. */
  lyceum: string;

  /** O lado do TI: quem puxou, em que pé está, previsão e link da entrega. */
  ti: TrabalhoTi;

  /** Demanda da caixa de entrada que originou o processo, se houver. */
  demandaId: ID | null;

  criadoEm: ISODateTime;
  atualizadoEm: ISODateTime;
}

/* -- Tarefa ---------------------------------------------------------------- */

export interface Tarefa {
  id: ID;
  processoId: ID;
  titulo: string;
  /** Membro da equipe CX que faz a tarefa… */
  responsavelId: ID | null;
  /** …ou alguém de fora do CX, por nome. */
  responsavelExterno: string;
  prazo: DateOnly | null;
  etapaId: ID | null;
  concluida: boolean;
  concluidaEm: ISODateTime | null;
  concluidaPor: string | null;
  /** Criada automaticamente pelas tarefas padrão da etapa. */
  padrao: boolean;
  criadaEm: ISODateTime;
}

/* -- Andamento (linha do tempo) -------------------------------------------- */

export type TipoAndamentoManual = 'nota' | 'reuniao' | 'decisao' | 'retorno-diretoria' | 'retorno-ti';
export type TipoAndamentoAuto =
  | 'criacao'
  | 'etapa'
  | 'situacao'
  | 'responsavel'
  | 'anexo'
  | 'tarefa-concluida'
  | 'prazo'
  | 'ti';
export type TipoAndamento = TipoAndamentoManual | TipoAndamentoAuto;

export interface Autor {
  /** ID do membro da equipe CX ou do TI, ou 'diretoria'. */
  id: ID;
  /** Nome no momento do registro — sobrevive à remoção do membro. */
  nome: string;
}

export interface Andamento {
  id: ID;
  processoId: ID;
  tipo: TipoAndamento;
  texto: string;
  /** Quando aconteceu (editável nos manuais: a reunião pode ter sido ontem). */
  quando: ISODateTime;
  autor: Autor;
  automatico: boolean;
  criadoEm: ISODateTime;
}

/* -- Anexo ----------------------------------------------------------------- */

/** Onde o arquivo foi anexado. Todos aparecem também na aba Anexos. */
export type ContextoAnexo = 'antes-diagrama' | 'antes-bpmn' | 'depois' | 'geral' | 'ti';

/** Metadados do anexo. O conteúdo (Blob) vive no armazenamento de arquivos. */
export interface Anexo {
  id: ID;
  processoId: ID;
  nome: string;
  mime: string;
  tamanho: number;
  contexto: ContextoAnexo;
  adicionadoEm: ISODateTime;
  autor: Autor;
}

/* -- Demanda (caixa de entrada) -------------------------------------------- */

export type StatusDemanda = 'nova' | 'aceita' | 'recusada';

/** O que chegou ao CX e ainda não virou processo — ou foi recusado. */
export interface Demanda {
  id: ID;
  titulo: string;
  descricao: string;
  origemId: ID | null;
  setorId: ID | null;
  /** Quem pediu ou de onde veio (texto livre). */
  solicitante: string;
  recebidaEm: DateOnly;
  status: StatusDemanda;
  motivoRecusa: string;
  /** Processo criado a partir dela, quando aceita. */
  processoId: ID | null;
  registradaPor: Autor;
  criadaEm: ISODateTime;
  atualizadaEm: ISODateTime;
}

/* -- Nota da equipe -------------------------------------------------------- */

/** Ata ou anotação que não pertence a um processo específico. */
export interface Nota {
  id: ID;
  titulo: string;
  texto: string;
  fixada: boolean;
  autor: Autor;
  criadaEm: ISODateTime;
  atualizadaEm: ISODateTime;
}

/* -- Meta e snapshot ------------------------------------------------------- */

export interface Meta {
  schemaVersion: number;
  /** Próximo número do código sequencial. */
  proximoNumero: number;
  ultimoBackup: ISODateTime | null;
  criadoEm: ISODateTime;
}

/** Tudo o que o sistema sabe, num objeto. É o que a store mantém em memória. */
export interface Snapshot {
  config: Config;
  processos: Processo[];
  tarefas: Tarefa[];
  andamentos: Andamento[];
  anexos: Anexo[];
  demandas: Demanda[];
  notas: Nota[];
  meta: Meta;
}

export type Colecao = keyof Snapshot;

/* -- Identidade (preferência do navegador) --------------------------------- */

export type Identidade =
  | { tipo: 'membro'; membroId: ID }
  | { tipo: 'ti'; membroId: ID }
  | { tipo: 'diretoria' };

export const AUTOR_DIRETORIA: Autor = { id: 'diretoria', nome: 'Diretoria' };
