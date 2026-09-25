/**
 * Números dos concluídos: o dashboard da página Concluídos e o relatório.
 *
 * Os períodos seguem o calendário, não uma janela móvel: "Mês" é o mês
 * (01/09 a 30/09), "3 meses" é o trimestre, "6 meses" o semestre e "1 ano" o
 * ano. Assim o número de setembro é sempre o mesmo, seja qual for o dia em que
 * alguém abre a tela, e dá para voltar período a período para ver o histórico.
 *
 * Cada indicador vem com o do período anterior do mesmo tamanho, para a
 * comparação.
 */
import { diasEntre, formatarData, hoje, lerDateOnly, NOMES_MESES, paraDateOnly } from '../lib/dates';
import type { DateOnly, Processo, Snapshot } from '../data/types';
import { nomeDe } from './config';
import { filtrarProcessos, ordenarConcluidos, type FiltrosProcessos } from './filtros';
import { nomesResponsaveis, vezesAdiado } from './processos';
import { nomesTi } from './ti';

export type Periodo = 'semana' | 'mes' | 'trimestre' | 'semestre' | 'ano';

/** `comparacao` completa "+3 em relação …". */
export const PERIODOS: ReadonlyArray<{ id: Periodo; nome: string; comparacao: string }> = [
  { id: 'semana', nome: 'Semana', comparacao: 'à semana anterior' },
  { id: 'mes', nome: 'Mês', comparacao: 'ao mês anterior' },
  { id: 'trimestre', nome: '3 meses', comparacao: 'aos 3 meses anteriores' },
  { id: 'semestre', nome: '6 meses', comparacao: 'aos 6 meses anteriores' },
  { id: 'ano', nome: '1 ano', comparacao: 'ao ano anterior' },
];

export const PERIODO_PADRAO: Periodo = 'mes';

export function infoPeriodo(p: Periodo) {
  return PERIODOS.find((x) => x.id === p) ?? PERIODOS[1];
}

/** O recorte vive na URL (#/concluidos?periodo=trimestre&em=-1), como os filtros. */
export function lerRecorte(q: URLSearchParams): { periodo: Periodo; deslocamento: number } {
  const v = q.get('periodo');
  const periodo = PERIODOS.some((p) => p.id === v) ? (v as Periodo) : PERIODO_PADRAO;
  const em = Number(q.get('em'));
  // Só o passado: o futuro não tem concluídos.
  return { periodo, deslocamento: Number.isInteger(em) && em < 0 ? em : 0 };
}

export function recorteParaQuery(periodo: Periodo, deslocamento: number): Record<string, string | undefined> {
  return {
    periodo: periodo === PERIODO_PADRAO ? undefined : periodo,
    em: deslocamento < 0 ? String(deslocamento) : undefined,
  };
}

export interface Intervalo {
  periodo: Periodo;
  /** 0 é o período atual; -1, o anterior; e assim por diante. */
  deslocamento: number;
  inicio: DateOnly;
  fim: DateOnly;
  /** "Setembro de 2026", "Julho a setembro de 2026", "Semana de 21/09 a 27/09/2026". */
  rotulo: string;
}

const maiuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

/** Bloco de `meses` meses alinhado ao calendário (trimestre, semestre). */
function blocoDeMeses(ref: Date, meses: number, deslocamento: number) {
  const primeiro = Math.floor(ref.getMonth() / meses) * meses + deslocamento * meses;
  return { inicio: new Date(ref.getFullYear(), primeiro, 1), fim: new Date(ref.getFullYear(), primeiro + meses, 0) };
}

export function intervaloDoPeriodo(periodo: Periodo, deslocamento = 0, referencia: DateOnly = hoje()): Intervalo {
  const ref = lerDateOnly(referencia) ?? new Date();
  let inicio: Date;
  let fim: Date;
  let rotulo: string;

  switch (periodo) {
    case 'semana': {
      // A semana começa na segunda-feira.
      const recuo = (ref.getDay() + 6) % 7;
      inicio = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() - recuo + deslocamento * 7);
      fim = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + 6);
      const mesmoAno = inicio.getFullYear() === fim.getFullYear();
      const de = mesmoAno ? formatarData(paraDateOnly(inicio)).slice(0, 5) : formatarData(paraDateOnly(inicio));
      rotulo = `Semana de ${de} a ${formatarData(paraDateOnly(fim))}`;
      break;
    }
    case 'mes':
      inicio = new Date(ref.getFullYear(), ref.getMonth() + deslocamento, 1);
      fim = new Date(inicio.getFullYear(), inicio.getMonth() + 1, 0);
      rotulo = `${maiuscula(NOMES_MESES[inicio.getMonth()])} de ${inicio.getFullYear()}`;
      break;
    case 'trimestre':
    case 'semestre': {
      ({ inicio, fim } = blocoDeMeses(ref, periodo === 'trimestre' ? 3 : 6, deslocamento));
      rotulo = `${maiuscula(NOMES_MESES[inicio.getMonth()])} a ${NOMES_MESES[fim.getMonth()]} de ${fim.getFullYear()}`;
      break;
    }
    case 'ano':
      inicio = new Date(ref.getFullYear() + deslocamento, 0, 1);
      fim = new Date(inicio.getFullYear(), 11, 31);
      rotulo = String(inicio.getFullYear());
      break;
  }

  return { periodo, deslocamento, inicio: paraDateOnly(inicio), fim: paraDateOnly(fim), rotulo };
}

/** O período dentro de uma frase: "em setembro de 2026", "na semana de…", "de julho a setembro de 2026". */
export function noPeriodo(i: Intervalo): string {
  const minusculo = i.rotulo.charAt(0).toLowerCase() + i.rotulo.slice(1);
  if (i.periodo === 'semana') return `na ${minusculo}`;
  if (i.periodo === 'trimestre' || i.periodo === 'semestre') return `de ${minusculo}`;
  return `em ${minusculo}`;
}

export function anteriorA(i: Intervalo, referencia: DateOnly = hoje()): Intervalo {
  return intervaloDoPeriodo(i.periodo, i.deslocamento - 1, referencia);
}

/** O intervalo contém hoje: os números ainda podem mudar. */
export function ehPeriodoAtual(i: Intervalo, referencia: DateOnly = hoje()): boolean {
  return i.inicio <= referencia && referencia <= i.fim;
}

/* -- Processos e indicadores ----------------------------------------------- */

export function concluidoNoIntervalo(p: Processo, i: Intervalo): boolean {
  return p.situacao === 'concluido' && p.conclusao !== null && p.conclusao >= i.inicio && p.conclusao <= i.fim;
}

/**
 * Os concluídos do intervalo, com os filtros de setor e responsável (a busca
 * por texto não entra: ela procura no histórico inteiro, fora do período).
 * O encerrado mais recentemente primeiro.
 */
export function concluidosDoRecorte(s: Snapshot, filtros: FiltrosProcessos, i: Intervalo): Processo[] {
  return ordenarConcluidos(
    filtrarProcessos(s, { ...filtros, q: '' }, 'concluidos').filter((p) => concluidoNoIntervalo(p, i)),
  );
}

export function duracaoEmDias(p: Processo): number | null {
  if (!p.conclusao) return null;
  return Math.max(0, diasEntre(p.abertura, p.conclusao));
}

/** Terminou até o prazo combinado? Null quando o processo não tinha prazo. */
export function entregueNoPrazo(p: Processo): boolean | null {
  if (!p.prazo || !p.conclusao) return null;
  return p.conclusao <= p.prazo;
}

export interface IndicadoresConcluidos {
  total: number;
  /** Média de dias da abertura à conclusão. Null sem processos. */
  tempoMedio: number | null;
  /** Dos que tinham prazo, quantos terminaram até ele. */
  noPrazo: { dentro: number; comPrazo: number; percentual: number | null };
  setores: number;
}

export function calcularIndicadores(lista: Processo[]): IndicadoresConcluidos {
  const duracoes = lista.map(duracaoEmDias).filter((d): d is number => d !== null);
  const comPrazo = lista.filter((p) => entregueNoPrazo(p) !== null);
  const dentro = comPrazo.filter((p) => entregueNoPrazo(p)).length;
  return {
    total: lista.length,
    tempoMedio: duracoes.length ? Math.round(duracoes.reduce((a, b) => a + b, 0) / duracoes.length) : null,
    noPrazo: {
      dentro,
      comPrazo: comPrazo.length,
      percentual: comPrazo.length ? Math.round((dentro / comPrazo.length) * 100) : null,
    },
    setores: new Set(lista.map((p) => p.setorId).filter(Boolean)).size,
  };
}

/**
 * O que mudou, em uma linha: os indicadores de antes e depois que a equipe
 * preencheu; sem eles, o começo das observações do cenário proposto.
 */
export function resumoDaMudanca(p: Processo, limite = 160): string | null {
  const indicadores = p.indicadores
    .filter((i) => i.nome.trim() && (i.antes.trim() || i.depois.trim()))
    .slice(0, 2)
    .map((i) => `${i.nome.trim()}: ${i.antes.trim() || '—'} → ${i.depois.trim() || '—'}`);
  if (indicadores.length) return indicadores.join(' · ');
  const obs = p.depois.observacoes.trim().replace(/\s+/g, ' ');
  if (!obs) return null;
  return obs.length > limite ? `${obs.slice(0, limite - 1).trimEnd()}…` : obs;
}

/* -- Planilha -------------------------------------------------------------- */

/** Uma célula de CSV: aspas em volta quando precisa, aspas internas dobradas. */
function celula(valor: string | number | null | undefined): string {
  const texto = valor === null || valor === undefined ? '' : String(valor);
  return /[";\r\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

/**
 * CSV no formato que o Excel em português abre certo: separador ";", BOM
 * para os acentos e quebra de linha do Windows. Datas em dd/mm/aaaa.
 */
export function planilhaDosConcluidos(s: Snapshot, lista: Processo[]): string {
  const cabecalho = [
    'Código',
    'Processo',
    'Setor',
    'Responsáveis CX',
    'Responsáveis TI',
    'Origem',
    'Prioridade',
    'Impacto no aluno',
    'Abertura',
    'Prazo',
    'Conclusão',
    'Duração (dias)',
    'No prazo',
    'Vezes que o prazo foi adiado',
    'O que mudou',
  ];
  const linhas = lista.map((p) => {
    const noPrazo = entregueNoPrazo(p);
    return [
      p.codigo,
      p.titulo,
      nomeDe(s.config.setores, p.setorId),
      nomesResponsaveis(p, s.config).join(', '),
      nomesTi(p, s.config).join(', '),
      nomeDe(s.config.origens, p.origemId),
      nomeDe(s.config.prioridades, p.prioridadeId),
      nomeDe(s.config.impactos, p.impactoId),
      formatarData(p.abertura, ''),
      formatarData(p.prazo, ''),
      formatarData(p.conclusao, ''),
      duracaoEmDias(p),
      noPrazo === null ? 'Sem prazo' : noPrazo ? 'Sim' : 'Não',
      vezesAdiado(p),
      resumoDaMudanca(p, 2000),
    ]
      .map(celula)
      .join(';');
  });
  return `﻿${[cabecalho.map(celula).join(';'), ...linhas].join('\r\n')}\r\n`;
}
