/**
 * Versão do schema, normalização e leitura de backup.
 *
 * Tudo que entra no sistema vindo de fora da memória — localStorage na
 * abertura, arquivo de backup no import — passa por `normalizarSnapshot`. Ele
 * tolera campos faltando (preenche com o padrão) e descarta o que não tem a
 * forma certa, para que um dado antigo ou meio corrompido nunca derrube a tela.
 *
 * Migrações: quando SCHEMA_VERSION subir, acrescente um passo em MIGRACOES
 * que leva o dado da versão N para N+1.
 */
import { BACKUP_FORMATO } from '../config/app';
import { agoraISO, ehDateOnly, hoje } from '../lib/dates';
import { uid } from '../lib/ids';
import { criarConfigInicial, criarMetaInicial } from './defaults';
import type {
  Andamento,
  Anexo,
  Autor,
  Config,
  ContextoAnexo,
  Demanda,
  Etapa,
  Indicador,
  ItemLista,
  Membro,
  Meta,
  Nota,
  PassoFluxo,
  Processo,
  SinalEtapa,
  Situacao,
  Snapshot,
  StatusDemanda,
  Tarefa,
  TipoAndamento,
} from './types';

export const SCHEMA_VERSION = 1;

type Bruto = Record<string, unknown>;
type Migracao = (dado: Bruto) => Bruto;

/** MIGRACOES[n] leva o dado da versão n para n + 1. */
const MIGRACOES: Record<number, Migracao> = {};

/* -- Leitores tolerantes --------------------------------------------------- */

function obj(v: unknown): Bruto {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Bruto) : {};
}
function arr(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}
function str(v: unknown, padrao = ''): string {
  return typeof v === 'string' ? v : padrao;
}
function strOuNull(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 ? v : null;
}
function dataOuNull(v: unknown): string | null {
  return ehDateOnly(v) ? v : null;
}
function num(v: unknown, padrao: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : padrao;
}
function bool(v: unknown): boolean {
  return v === true;
}
function um<T extends string>(v: unknown, opcoes: readonly T[], padrao: T): T {
  return opcoes.includes(v as T) ? (v as T) : padrao;
}

/* -- Entidades ------------------------------------------------------------- */

function item(v: unknown): ItemLista | null {
  const o = obj(v);
  const nome = str(o.nome).trim();
  if (!nome) return null;
  return { id: str(o.id) || uid(), nome, ...(o.arquivado === true ? { arquivado: true } : {}) };
}

function itens(v: unknown): ItemLista[] {
  return arr(v)
    .map(item)
    .filter((x): x is ItemLista => x !== null);
}

function membro(v: unknown): Membro | null {
  const base = item(v);
  if (!base) return null;
  return { ...base, funcao: str(obj(v).funcao) };
}

const SINAIS: readonly Exclude<SinalEtapa, null>[] = ['diretoria', 'ti'];

function etapa(v: unknown): Etapa | null {
  const o = obj(v);
  const nome = str(o.nome).trim();
  if (!nome) return null;
  return {
    id: str(o.id) || uid(),
    nome,
    descricao: str(o.descricao),
    sinal: SINAIS.includes(o.sinal as 'diretoria') ? (o.sinal as SinalEtapa) : null,
    tarefasPadrao: arr(o.tarefasPadrao).filter((t): t is string => typeof t === 'string' && t.trim().length > 0),
  };
}

function config(v: unknown): Config {
  const o = obj(v);
  const inicial = criarConfigInicial();
  const etapas = arr(o.etapas)
    .map(etapa)
    .filter((x): x is Etapa => x !== null);
  return {
    // Um fluxo precisa de ao menos duas etapas (uma para começar, outra para encerrar).
    etapas: etapas.length >= 2 ? etapas : inicial.etapas,
    membros: arr(o.membros)
      .map(membro)
      .filter((x): x is Membro => x !== null),
    setores: itens(o.setores),
    origens: 'origens' in o ? itens(o.origens) : inicial.origens,
    prioridades: 'prioridades' in o ? itens(o.prioridades) : inicial.prioridades,
    impactos: 'impactos' in o ? itens(o.impactos) : inicial.impactos,
  };
}

function autor(v: unknown): Autor {
  const o = obj(v);
  return { id: str(o.id, 'desconhecido'), nome: str(o.nome, 'Sem autor') };
}

const SITUACOES: readonly Situacao[] = ['andamento', 'pausado', 'cancelado', 'concluido'];

function passo(v: unknown): PassoFluxo {
  const o = obj(v);
  return {
    id: str(o.id) || uid(),
    nome: str(o.nome),
    responsavel: str(o.responsavel),
    sistema: str(o.sistema),
  };
}

function indicador(v: unknown): Indicador {
  const o = obj(v);
  return {
    id: str(o.id) || uid(),
    nome: str(o.nome),
    antes: str(o.antes),
    depois: str(o.depois),
    fonte: str(o.fonte),
  };
}

function processo(v: unknown, etapaPadrao: string): Processo | null {
  const o = obj(v);
  const id = str(o.id);
  const codigo = str(o.codigo);
  if (!id || !codigo) return null;
  const problema = obj(o.problema);
  const antes = obj(o.antes);
  const depois = obj(o.depois);
  const criadoEm = str(o.criadoEm) || agoraISO();
  return {
    id,
    codigo,
    titulo: str(o.titulo, 'Processo sem título'),
    setorId: strOuNull(o.setorId),
    // Compatível com o formato antigo, de um responsável só.
    responsaveisIds: Array.isArray(o.responsaveisIds)
      ? o.responsaveisIds.filter((x): x is string => typeof x === 'string')
      : strOuNull(o.responsavelId)
        ? [o.responsavelId as string]
        : [],
    envolvidos: str(o.envolvidos),
    origemId: strOuNull(o.origemId),
    prioridadeId: strOuNull(o.prioridadeId),
    impactoId: strOuNull(o.impactoId),
    tags: arr(o.tags).filter((t): t is string => typeof t === 'string' && t.trim().length > 0),
    abertura: dataOuNull(o.abertura) ?? hoje(),
    prazo: dataOuNull(o.prazo),
    conclusao: dataOuNull(o.conclusao),
    etapaId: str(o.etapaId) || etapaPadrao,
    historicoEtapas: arr(o.historicoEtapas)
      .map((h) => obj(h))
      .filter((h) => typeof h.etapaId === 'string' && typeof h.entrada === 'string')
      .map((h) => ({ etapaId: h.etapaId as string, entrada: h.entrada as string })),
    situacao: um(o.situacao, SITUACOES, 'andamento'),
    problema: {
      descricao: str(problema.descricao),
      dores: str(problema.dores),
      efeitoAluno: str(problema.efeitoAluno),
    },
    antes: { observacoes: str(antes.observacoes) },
    depois: {
      passos: arr(depois.passos).map(passo),
      prototipoUrl: str(depois.prototipoUrl),
      observacoes: str(depois.observacoes),
    },
    indicadores: arr(o.indicadores).map(indicador),
    lyceum: str(o.lyceum),
    demandaId: strOuNull(o.demandaId),
    criadoEm,
    atualizadoEm: str(o.atualizadoEm) || criadoEm,
  };
}

function tarefa(v: unknown): Tarefa | null {
  const o = obj(v);
  const id = str(o.id);
  const processoId = str(o.processoId);
  if (!id || !processoId) return null;
  return {
    id,
    processoId,
    titulo: str(o.titulo),
    responsavelId: strOuNull(o.responsavelId),
    responsavelExterno: str(o.responsavelExterno) || str(o.responsavel),
    prazo: dataOuNull(o.prazo),
    etapaId: strOuNull(o.etapaId),
    concluida: bool(o.concluida),
    concluidaEm: strOuNull(o.concluidaEm),
    concluidaPor: strOuNull(o.concluidaPor),
    padrao: bool(o.padrao),
    criadaEm: str(o.criadaEm) || agoraISO(),
  };
}

const TIPOS_ANDAMENTO: readonly TipoAndamento[] = [
  'nota',
  'reuniao',
  'decisao',
  'retorno-diretoria',
  'retorno-ti',
  'criacao',
  'etapa',
  'situacao',
  'responsavel',
  'anexo',
  'tarefa-concluida',
];

function andamento(v: unknown): Andamento | null {
  const o = obj(v);
  const id = str(o.id);
  const processoId = str(o.processoId);
  if (!id || !processoId) return null;
  const criadoEm = str(o.criadoEm) || agoraISO();
  return {
    id,
    processoId,
    tipo: um(o.tipo, TIPOS_ANDAMENTO, 'nota'),
    texto: str(o.texto),
    quando: str(o.quando) || criadoEm,
    autor: autor(o.autor),
    automatico: bool(o.automatico),
    criadoEm,
  };
}

const CONTEXTOS: readonly ContextoAnexo[] = ['antes-diagrama', 'antes-bpmn', 'depois', 'geral'];

function anexo(v: unknown): Anexo | null {
  const o = obj(v);
  const id = str(o.id);
  const processoId = str(o.processoId);
  if (!id || !processoId) return null;
  return {
    id,
    processoId,
    nome: str(o.nome, 'arquivo'),
    mime: str(o.mime, 'application/octet-stream'),
    tamanho: num(o.tamanho, 0),
    contexto: um(o.contexto, CONTEXTOS, 'geral'),
    adicionadoEm: str(o.adicionadoEm) || agoraISO(),
    autor: autor(o.autor),
  };
}

const STATUS_DEMANDA: readonly StatusDemanda[] = ['nova', 'aceita', 'recusada'];

function demanda(v: unknown): Demanda | null {
  const o = obj(v);
  const id = str(o.id);
  if (!id) return null;
  const criadaEm = str(o.criadaEm) || agoraISO();
  return {
    id,
    titulo: str(o.titulo, 'Demanda sem título'),
    descricao: str(o.descricao),
    origemId: strOuNull(o.origemId),
    setorId: strOuNull(o.setorId),
    solicitante: str(o.solicitante),
    recebidaEm: dataOuNull(o.recebidaEm) ?? hoje(),
    status: um(o.status, STATUS_DEMANDA, 'nova'),
    motivoRecusa: str(o.motivoRecusa),
    processoId: strOuNull(o.processoId),
    registradaPor: autor(o.registradaPor),
    criadaEm,
    atualizadaEm: str(o.atualizadaEm) || criadaEm,
  };
}

function nota(v: unknown): Nota | null {
  const o = obj(v);
  const id = str(o.id);
  if (!id) return null;
  const criadaEm = str(o.criadaEm) || agoraISO();
  return {
    id,
    titulo: str(o.titulo),
    texto: str(o.texto),
    fixada: bool(o.fixada),
    autor: autor(o.autor),
    criadaEm,
    atualizadaEm: str(o.atualizadaEm) || criadaEm,
  };
}

function meta(v: unknown, processos: Processo[]): Meta {
  const o = obj(v);
  const inicial = criarMetaInicial(SCHEMA_VERSION);
  // O próximo número nunca pode colidir com um código que já existe.
  const maiorExistente = processos.reduce((max, p) => {
    const n = Number(p.codigo.replace(/\D/g, ''));
    return Number.isFinite(n) && n > max ? n : max;
  }, 0);
  return {
    schemaVersion: SCHEMA_VERSION,
    proximoNumero: Math.max(num(o.proximoNumero, 1), maiorExistente + 1),
    ultimoBackup: strOuNull(o.ultimoBackup),
    criadoEm: str(o.criadoEm) || inicial.criadoEm,
  };
}

/* -- Snapshot -------------------------------------------------------------- */

function migrar(dado: Bruto): Bruto {
  let atual = dado;
  let versao = num(obj(atual.meta).schemaVersion, SCHEMA_VERSION);
  while (versao < SCHEMA_VERSION) {
    const passoMigracao = MIGRACOES[versao];
    if (passoMigracao) atual = passoMigracao(atual);
    versao++;
  }
  return atual;
}

export function snapshotInicial(): Snapshot {
  return {
    config: criarConfigInicial(),
    processos: [],
    tarefas: [],
    andamentos: [],
    anexos: [],
    demandas: [],
    notas: [],
    meta: criarMetaInicial(SCHEMA_VERSION),
  };
}

export function normalizarSnapshot(bruto: unknown): Snapshot {
  const dado = migrar(obj(bruto));
  const cfg = config(dado.config);
  const etapaPadrao = cfg.etapas[0].id;
  const processos = arr(dado.processos)
    .map((p) => processo(p, etapaPadrao))
    .filter((x): x is Processo => x !== null);
  const idsProcessos = new Set(processos.map((p) => p.id));
  const pertence = <T extends { processoId: string }>(x: T | null): x is T =>
    x !== null && idsProcessos.has(x.processoId);

  // Um processo cuja etapa foi removida volta para a primeira, em vez de sumir.
  const idsEtapas = new Set(cfg.etapas.map((e) => e.id));
  for (const p of processos) if (!idsEtapas.has(p.etapaId)) p.etapaId = etapaPadrao;

  return {
    config: cfg,
    processos,
    tarefas: arr(dado.tarefas).map(tarefa).filter(pertence),
    andamentos: arr(dado.andamentos).map(andamento).filter(pertence),
    anexos: arr(dado.anexos).map(anexo).filter(pertence),
    demandas: arr(dado.demandas)
      .map(demanda)
      .filter((x): x is Demanda => x !== null)
      // Uma demanda aceita cujo processo foi excluído volta a ser apenas "aceita", sem vínculo.
      .map((d) => (d.processoId && !idsProcessos.has(d.processoId) ? { ...d, processoId: null } : d)),
    notas: arr(dado.notas)
      .map(nota)
      .filter((x): x is Nota => x !== null),
    meta: meta(dado.meta, processos),
  };
}

/* -- Backup ---------------------------------------------------------------- */

export interface ArquivoNoBackup {
  id: string;
  mime: string;
  base64: string;
}

export interface ConteudoBackup {
  formato: typeof BACKUP_FORMATO;
  schemaVersion: number;
  exportadoEm: string;
  exportadoPor: string;
  dados: Snapshot;
  arquivos: ArquivoNoBackup[] | null;
}

export interface BackupLido {
  snapshot: Snapshot;
  arquivos: ArquivoNoBackup[] | null;
  exportadoEm: string | null;
  exportadoPor: string | null;
}

export class ErroBackup extends Error {}

/** Lê o texto de um arquivo de backup. Lança ErroBackup com mensagem pronta para a tela. */
export function lerBackup(texto: string): BackupLido {
  let bruto: unknown;
  try {
    bruto = JSON.parse(texto);
  } catch {
    throw new ErroBackup('O arquivo não é um backup válido: não foi possível ler o conteúdo.');
  }
  const o = obj(bruto);
  if (o.formato !== BACKUP_FORMATO) {
    throw new ErroBackup('Este arquivo não é um backup do Customer Experience.');
  }
  if (num(o.schemaVersion, 0) > SCHEMA_VERSION) {
    throw new ErroBackup(
      'Este backup foi feito por uma versão mais nova do sistema. Atualize o sistema antes de importar.',
    );
  }
  const arquivos = Array.isArray(o.arquivos)
    ? o.arquivos
        .map((a) => obj(a))
        .filter((a) => typeof a.id === 'string' && typeof a.base64 === 'string')
        .map((a) => ({ id: a.id as string, mime: str(a.mime), base64: a.base64 as string }))
    : null;
  return {
    snapshot: normalizarSnapshot(o.dados),
    arquivos,
    exportadoEm: strOuNull(o.exportadoEm),
    exportadoPor: strOuNull(o.exportadoPor),
  };
}
