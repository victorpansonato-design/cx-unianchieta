/**
 * Regras do processo.
 *
 * - Situação é paralela à etapa: um processo pode estar em "Diagnóstico" e
 *   pausado. A exceção é a conclusão: a última etapa e a situação "Concluído"
 *   andam juntas, nos dois sentidos.
 * - Toda mudança de etapa grava a data de entrada (historicoEtapas), gera um
 *   andamento automático e acrescenta as tarefas padrão da etapa nova.
 * - Toda mudança de prazo entra no histórico do prazo (com o motivo, quando a
 *   pessoa escreve um) e gera um andamento. É isso que mostra à diretoria
 *   quantas vezes um prazo foi adiado.
 * - Um processo que volta para uma etapa do TI depois de entregue volta a
 *   "Em desenvolvimento": o TI tem trabalho de novo.
 * - Funções puras: recebem o snapshot, devolvem as Ops. Quem aplica é a store.
 */
import { CODE_PREFIX } from '../config/app';
import { agoraISO, diasEntre, formatarData, hoje, paraDateOnly } from '../lib/dates';
import { uid } from '../lib/ids';
import type { Op } from '../data/ops';
import type { Autor, Config, DateOnly, Etapa, ID, MudancaPrazo, Processo, Situacao, Snapshot } from '../data/types';
import { andamentoAutomatico } from './andamentos';
import { tarefasPadraoPara } from './tarefas';

/* -- Situação -------------------------------------------------------------- */

export const SITUACOES: ReadonlyArray<{ id: Situacao; nome: string }> = [
  { id: 'andamento', nome: 'Em andamento' },
  { id: 'pausado', nome: 'Pausado' },
  { id: 'cancelado', nome: 'Cancelado' },
  { id: 'concluido', nome: 'Concluído' },
];

export function infoSituacao(s: Situacao) {
  return SITUACOES.find((x) => x.id === s) ?? SITUACOES[0];
}

/** Situações em que o processo ainda está vivo (e o prazo conta). */
export function estaAtivo(p: Processo): boolean {
  return p.situacao === 'andamento' || p.situacao === 'pausado';
}

/* -- Prazo e tempo na etapa ------------------------------------------------ */

/** Prazo previsto já passou e o processo não terminou. */
export function estaVencido(p: Processo, referencia: string = hoje()): boolean {
  return estaAtivo(p) && p.prazo !== null && p.prazo < referencia;
}

/** Dias de atraso (0 se não vencido). */
export function diasDeAtraso(p: Processo, referencia: string = hoje()): number {
  if (!estaVencido(p, referencia) || !p.prazo) return 0;
  return diasEntre(p.prazo, referencia);
}

export function contarVencidos(processos: Processo[], referencia: string = hoje()): number {
  return processos.filter((p) => estaVencido(p, referencia)).length;
}

/** Texto do andamento de uma mudança de prazo. */
export function textoMudancaPrazo(de: DateOnly | null, para: DateOnly | null): string {
  if (!de && para) return `Prazo definido para ${formatarData(para)}.`;
  if (de && !para) return `Prazo removido. Era ${formatarData(de)}.`;
  if (de && para && para > de) return `Prazo adiado de ${formatarData(de)} para ${formatarData(para)}.`;
  return `Prazo antecipado de ${formatarData(de)} para ${formatarData(para)}.`;
}

/** Mudança que empurrou para mais tarde um prazo que já existia. */
export function ehAdiamento(m: MudancaPrazo): boolean {
  return m.de !== null && m.para !== null && m.para > m.de;
}

/** Quantas vezes o prazo foi adiado. */
export function vezesAdiado(p: Processo): number {
  return p.historicoPrazos.filter(ehAdiamento).length;
}

/** A mudança de prazo no histórico do processo e o andamento que a conta. */
function mudarPrazo(p: Processo, para: DateOnly | null, motivo: string, autor: Autor, agora: string, sufixo = '') {
  const mudanca: MudancaPrazo = { de: p.prazo, para, em: agora, motivo: motivo.trim(), autor };
  const texto = `${textoMudancaPrazo(p.prazo, para)}${sufixo}${mudanca.motivo ? ` Motivo: ${mudanca.motivo}` : ''}`;
  return {
    historicoPrazos: [...p.historicoPrazos, mudanca],
    andamento: andamentoAutomatico(p.id, 'prazo', texto, autor, agora),
  };
}

/** Última entrada em cada etapa (voltar a uma etapa atualiza a data). */
export function entradasPorEtapa(p: Processo): Map<ID, string> {
  const mapa = new Map<ID, string>();
  for (const h of p.historicoEtapas) {
    const atual = mapa.get(h.etapaId);
    if (!atual || h.entrada > atual) mapa.set(h.etapaId, h.entrada);
  }
  return mapa;
}

/** Há quantos dias o processo está na etapa atual. Null se não está ativo. */
export function diasNaEtapa(p: Processo, referencia: string = hoje()): number | null {
  if (!estaAtivo(p)) return null;
  const entrada = entradasPorEtapa(p).get(p.etapaId) ?? p.criadoEm;
  return Math.max(0, diasEntre(paraDateOnly(new Date(entrada)), referencia));
}

/* -- Etapas ---------------------------------------------------------------- */

export function indiceEtapa(config: Config, etapaId: ID): number {
  return config.etapas.findIndex((e) => e.id === etapaId);
}

export function etapaDe(config: Config, etapaId: ID): Etapa | undefined {
  return config.etapas.find((e) => e.id === etapaId);
}

export function ehEtapaFinal(config: Config, etapaId: ID): boolean {
  return config.etapas[config.etapas.length - 1]?.id === etapaId;
}

export function proximaEtapa(config: Config, etapaId: ID): Etapa | null {
  const i = indiceEtapa(config, etapaId);
  return i >= 0 && i < config.etapas.length - 1 ? config.etapas[i + 1] : null;
}

/* -- Código ---------------------------------------------------------------- */

export function formatarCodigo(numero: number): string {
  return `${CODE_PREFIX}-${String(numero).padStart(3, '0')}`;
}

export function processoPorCodigo(s: Snapshot, codigo: string): Processo | undefined {
  const alvo = codigo.toUpperCase();
  return s.processos.find((p) => p.codigo.toUpperCase() === alvo);
}

/* -- Nomes (para textos e busca) ------------------------------------------- */

export function nomesResponsaveis(p: Processo, config: Config): string[] {
  return p.responsaveisIds
    .map((id) => config.membros.find((m) => m.id === id)?.nome)
    .filter((n): n is string => Boolean(n));
}

function listaNomes(nomes: string[]): string {
  if (nomes.length <= 1) return nomes[0] ?? '';
  return `${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1]}`;
}

/* -- Criar ----------------------------------------------------------------- */

export interface DadosNovoProcesso {
  titulo: string;
  etapaId?: ID | null;
  setorId?: ID | null;
  origemId?: ID | null;
  responsaveisIds?: ID[];
  prioridadeId?: ID | null;
  impactoId?: ID | null;
  prazo?: string | null;
  descricao?: string;
  envolvidos?: string;
  demandaId?: ID | null;
}

export function criarProcesso(
  s: Snapshot,
  dados: DadosNovoProcesso,
  autor: Autor,
  textoOrigem?: string,
): { ops: Op[]; processo: Processo } {
  const agora = agoraISO();
  const { config, meta } = s;
  const etapa = (dados.etapaId && etapaDe(config, dados.etapaId)) || config.etapas[0];
  const final = ehEtapaFinal(config, etapa.id);

  const processo: Processo = {
    id: uid(),
    codigo: formatarCodigo(meta.proximoNumero),
    titulo: dados.titulo.trim(),
    setorId: dados.setorId ?? null,
    responsaveisIds: dados.responsaveisIds ?? [],
    envolvidos: dados.envolvidos?.trim() ?? '',
    origemId: dados.origemId ?? null,
    prioridadeId: dados.prioridadeId ?? null,
    impactoId: dados.impactoId ?? null,
    tags: [],
    abertura: hoje(),
    prazo: dados.prazo ?? null,
    historicoPrazos: [],
    conclusao: final ? hoje() : null,
    etapaId: etapa.id,
    historicoEtapas: [{ etapaId: etapa.id, entrada: agora }],
    situacao: final ? 'concluido' : 'andamento',
    problema: { descricao: dados.descricao?.trim() ?? '', dores: '', efeitoAluno: '' },
    antes: { observacoes: '' },
    depois: { passos: [], prototipoUrl: '', observacoes: '' },
    indicadores: [],
    lyceum: '',
    ti: { responsaveisIds: [], status: 'fila', previsao: null, link: '' },
    demandaId: dados.demandaId ?? null,
    criadoEm: agora,
    atualizadoEm: agora,
  };

  const ops: Op[] = [
    { tipo: 'meta', valor: { ...meta, proximoNumero: meta.proximoNumero + 1 } },
    { tipo: 'processo', valor: processo },
    {
      tipo: 'andamento',
      valor: andamentoAutomatico(
        processo.id,
        'criacao',
        textoOrigem ?? `Processo criado na etapa “${etapa.nome}”.`,
        autor,
        agora,
      ),
    },
  ];
  // Processo novo não tem tarefa nenhuma: entram todas as tarefas padrão da etapa inicial.
  for (const t of tarefasPadraoPara(s, processo.id, etapa, agora)) ops.push({ tipo: 'tarefa', valor: t });
  return { ops, processo };
}

/* -- Mudar de etapa -------------------------------------------------------- */

export function moverParaEtapa(s: Snapshot, processoId: ID, etapaId: ID, autor: Autor): Op[] {
  const p = s.processos.find((x) => x.id === processoId);
  const destino = etapaDe(s.config, etapaId);
  if (!p || !destino || p.etapaId === etapaId) return [];
  const origem = etapaDe(s.config, p.etapaId);
  const agora = agoraISO();
  const entraNaFinal = ehEtapaFinal(s.config, etapaId);
  const saiDaFinal = ehEtapaFinal(s.config, p.etapaId) && !entraNaFinal;

  const atualizado: Processo = {
    ...p,
    etapaId,
    historicoEtapas: [...p.historicoEtapas, { etapaId, entrada: agora }],
    atualizadoEm: agora,
  };
  const ops: Op[] = [
    {
      tipo: 'andamento',
      valor: andamentoAutomatico(
        p.id,
        'etapa',
        origem ? `Moveu de “${origem.nome}” para “${destino.nome}”.` : `Moveu para “${destino.nome}”.`,
        autor,
        agora,
      ),
    },
  ];

  if (entraNaFinal && p.situacao !== 'concluido') {
    atualizado.situacao = 'concluido';
    atualizado.conclusao = hoje();
    ops.push({
      tipo: 'andamento',
      valor: andamentoAutomatico(p.id, 'situacao', `Processo concluído em ${formatarData(hoje())}.`, autor, agora),
    });
  } else if (saiDaFinal && p.situacao === 'concluido') {
    atualizado.situacao = 'andamento';
    atualizado.conclusao = null;
    ops.push({
      tipo: 'andamento',
      valor: andamentoAutomatico(p.id, 'situacao', 'Processo reaberto: situação voltou para “Em andamento”.', autor, agora),
    });
  }

  // Voltou para o TI depois de entregue (ajustes): o TI tem trabalho de novo.
  if (destino.sinal === 'ti' && origem?.sinal !== 'ti' && p.ti.status === 'validar') {
    const status = p.ti.responsaveisIds.length ? 'desenvolvimento' : 'fila';
    atualizado.ti = { ...p.ti, status };
    ops.push({
      tipo: 'andamento',
      valor: andamentoAutomatico(
        p.id,
        'ti',
        status === 'fila' ? 'Voltou para a fila do TI.' : 'Voltou para o TI: status “Em desenvolvimento”.',
        autor,
        agora,
      ),
    });
  }

  ops.unshift({ tipo: 'processo', valor: atualizado });
  for (const t of tarefasPadraoPara(s, p.id, destino, agora)) ops.push({ tipo: 'tarefa', valor: t });
  return ops;
}

/* -- Reabrir --------------------------------------------------------------- */

/**
 * A etapa sugerida ao reabrir: a última em que o processo esteve antes de
 * concluir. Sem histórico, a penúltima do fluxo.
 */
export function etapaAntesDaConclusao(config: Config, p: Processo): ID {
  const final = config.etapas[config.etapas.length - 1];
  const validas = new Set(config.etapas.slice(0, -1).map((e) => e.id));
  const anterior = [...p.historicoEtapas].reverse().find((h) => h.etapaId !== final.id && validas.has(h.etapaId));
  return anterior?.etapaId ?? config.etapas[Math.max(0, config.etapas.length - 2)].id;
}

/**
 * Reabre um processo concluído numa etapa anterior, para ajustes. Tudo o que
 * ele já tem continua — textos, fluxo, indicadores, tarefas, anexos — e o
 * andamento guarda o motivo. A conclusão anterior fica na linha do tempo.
 */
export function reabrirProcesso(
  s: Snapshot,
  processoId: ID,
  dados: { etapaId: ID; motivo: string; prazo: string | null },
  autor: Autor,
): Op[] {
  const p = s.processos.find((x) => x.id === processoId);
  const destino = etapaDe(s.config, dados.etapaId);
  if (!p || !destino || p.situacao !== 'concluido' || ehEtapaFinal(s.config, dados.etapaId)) return [];

  const motivo = dados.motivo.trim();
  const novoPrazo = dados.prazo && dados.prazo !== p.prazo ? dados.prazo : null;
  const extras: Op[] = [];
  const ops = moverParaEtapa(s, processoId, dados.etapaId, autor).map((op): Op => {
    if (op.tipo === 'processo' && novoPrazo) {
      const m = mudarPrazo(p, novoPrazo, '', autor, op.valor.atualizadoEm, ' Na reabertura do processo.');
      extras.push({ tipo: 'andamento', valor: m.andamento });
      return { ...op, valor: { ...op.valor, prazo: novoPrazo, historicoPrazos: m.historicoPrazos } };
    }
    if (op.tipo === 'andamento' && op.valor.tipo === 'situacao') {
      const texto = `Processo reaberto para ajustes, de volta a “${destino.nome}”.${motivo ? ` Motivo: ${motivo}` : ''}`;
      return { ...op, valor: { ...op.valor, texto } };
    }
    return op;
  });
  return [...ops, ...extras];
}

/* -- Situação -------------------------------------------------------------- */

/**
 * Muda a situação. "Concluído" leva o processo para a última etapa. Para sair
 * de "Concluído" é preciso mudar de etapa — a tela explica isso.
 */
export function definirSituacao(s: Snapshot, processoId: ID, situacao: Situacao, autor: Autor): Op[] {
  const p = s.processos.find((x) => x.id === processoId);
  if (!p || p.situacao === situacao) return [];
  const final = s.config.etapas[s.config.etapas.length - 1];
  if (situacao === 'concluido') return moverParaEtapa(s, processoId, final.id, autor);
  if (ehEtapaFinal(s.config, p.etapaId)) return [];
  const agora = agoraISO();
  return [
    { tipo: 'processo', valor: { ...p, situacao, atualizadoEm: agora } },
    {
      tipo: 'andamento',
      valor: andamentoAutomatico(
        p.id,
        'situacao',
        `Situação: “${infoSituacao(p.situacao).nome}” → “${infoSituacao(situacao).nome}”.`,
        autor,
        agora,
      ),
    },
  ];
}

/* -- Editar campos --------------------------------------------------------- */

/** O que a tela muda direto. Etapa, situação, os históricos e o lado do TI têm regras próprias. */
export type MudancaProcesso = Partial<
  Omit<
    Processo,
    'id' | 'codigo' | 'etapaId' | 'situacao' | 'historicoEtapas' | 'historicoPrazos' | 'ti' | 'criadoEm' | 'atualizadoEm'
  >
>;

/**
 * Edita campos do processo. Mudar o prazo entra no histórico do prazo e gera
 * um andamento; `motivoPrazo` vai junto quando a pessoa explicou a mudança.
 */
export function atualizarProcesso(
  s: Snapshot,
  processoId: ID,
  mudanca: MudancaProcesso,
  autor: Autor,
  motivoPrazo = '',
): Op[] {
  const p = s.processos.find((x) => x.id === processoId);
  if (!p) return [];
  const agora = agoraISO();
  const atualizado: Processo = { ...p, ...mudanca, atualizadoEm: agora };
  if (mudanca.titulo !== undefined && !mudanca.titulo.trim()) atualizado.titulo = p.titulo;
  const ops: Op[] = [{ tipo: 'processo', valor: atualizado }];

  if (mudanca.prazo !== undefined && mudanca.prazo !== p.prazo) {
    const m = mudarPrazo(p, mudanca.prazo, motivoPrazo, autor, agora);
    atualizado.historicoPrazos = m.historicoPrazos;
    ops.push({ tipo: 'andamento', valor: m.andamento });
  }

  if (mudanca.responsaveisIds) {
    const antes = new Set(p.responsaveisIds);
    const depois = new Set(mudanca.responsaveisIds);
    const nome = (id: ID) => s.config.membros.find((m) => m.id === id)?.nome ?? 'alguém';
    const entraram = mudanca.responsaveisIds.filter((id) => !antes.has(id)).map(nome);
    const sairam = p.responsaveisIds.filter((id) => !depois.has(id)).map(nome);
    const partes = [
      entraram.length ? `Adicionou ${listaNomes(entraram)} como ${entraram.length > 1 ? 'responsáveis' : 'responsável'}` : '',
      sairam.length ? `${entraram.length ? 'removeu' : 'Removeu'} ${listaNomes(sairam)}` : '',
    ].filter(Boolean);
    if (partes.length) {
      ops.push({
        tipo: 'andamento',
        valor: andamentoAutomatico(p.id, 'responsavel', `${partes.join(' e ')}.`, autor, agora),
      });
    }
  }
  return ops;
}

/* -- Excluir --------------------------------------------------------------- */

/** Exclui o processo e tudo o que pertence a ele. Devolve também os arquivos a apagar. */
export function removerProcesso(s: Snapshot, processoId: ID): { ops: Op[]; anexoIds: ID[] } {
  const anexoIds = s.anexos.filter((a) => a.processoId === processoId).map((a) => a.id);
  const ops: Op[] = [
    ...s.tarefas.filter((t) => t.processoId === processoId).map((t) => ({ tipo: 'tarefa-remover' as const, id: t.id })),
    ...s.andamentos
      .filter((a) => a.processoId === processoId)
      .map((a) => ({ tipo: 'andamento-remover' as const, id: a.id })),
    ...anexoIds.map((id) => ({ tipo: 'anexo-remover' as const, id })),
    // A demanda que originou o processo continua "aceita", sem o vínculo.
    ...s.demandas
      .filter((d) => d.processoId === processoId)
      .map((d) => ({ tipo: 'demanda' as const, valor: { ...d, processoId: null, atualizadaEm: agoraISO() } })),
    { tipo: 'processo-remover', id: processoId },
  ];
  return { ops, anexoIds };
}
