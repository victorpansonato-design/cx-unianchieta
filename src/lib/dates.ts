/**
 * Datas no formato brasileiro, sempre.
 *
 * Dois tipos de valor circulam no sistema:
 * - DateOnly ('AAAA-MM-DD'): abertura, prazo, conclusão. Interpretado no fuso
 *   LOCAL — `new Date('2026-09-23')` seria meia-noite UTC, que em Brasília é
 *   22/09 às 21h, e o prazo apareceria um dia antes.
 * - ISODateTime ('2026-09-23T14:32:00.000Z'): momentos (andamentos, entrada em
 *   etapa, anexos). Exibidos no fuso local.
 */

export type DateOnly = string;
export type ISODateTime = string;

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function agoraISO(): ISODateTime {
  return new Date().toISOString();
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function paraDateOnly(d: Date): DateOnly {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function hoje(): DateOnly {
  return paraDateOnly(new Date());
}

/** 'AAAA-MM-DD' → Date à meia-noite local. Null se inválida. */
export function lerDateOnly(valor: DateOnly | null | undefined): Date | null {
  if (!valor) return null;
  const m = DATE_RE.exec(valor);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return d.getMonth() === Number(m[2]) - 1 ? d : null;
}

export function ehDateOnly(valor: unknown): valor is DateOnly {
  return typeof valor === 'string' && lerDateOnly(valor) !== null;
}

/** 'AAAA-MM-DD' → 'dd/mm/aaaa'. */
export function formatarData(valor: DateOnly | null | undefined, vazio = '—'): string {
  const d = lerDateOnly(valor);
  if (!d) return vazio;
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/** 'dd/mm' — para colunas estreitas onde o ano é evidente. */
export function formatarDataCurta(valor: DateOnly | null | undefined, vazio = '—'): string {
  const d = lerDateOnly(valor);
  if (!d) return vazio;
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
}

/** ISO → 'dd/mm/aaaa'. */
export function formatarDataDeMomento(iso: ISODateTime | null | undefined, vazio = '—'): string {
  if (!iso) return vazio;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return vazio;
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/** ISO → 'hh:mm'. */
export function formatarHora(iso: ISODateTime | null | undefined, vazio = '—'): string {
  if (!iso) return vazio;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return vazio;
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** ISO → 'dd/mm/aaaa às hh:mm'. */
export function formatarMomento(iso: ISODateTime | null | undefined, vazio = '—'): string {
  if (!iso) return vazio;
  return `${formatarDataDeMomento(iso, vazio)} às ${formatarHora(iso, vazio)}`;
}

/** 'dd/mm/aaaa' digitado → 'AAAA-MM-DD'. Null se incompleta ou inexistente (31/02). */
export function lerDataBR(texto: string): DateOnly | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(texto.trim());
  if (!m) return null;
  const iso = `${m[3]}-${m[2]}-${m[1]}`;
  return lerDateOnly(iso) ? iso : null;
}

/** Aplica a máscara dd/mm/aaaa enquanto a pessoa digita. */
export function mascararDataBR(texto: string): string {
  const digitos = texto.replace(/\D/g, '').slice(0, 8);
  if (digitos.length <= 2) return digitos;
  if (digitos.length <= 4) return `${digitos.slice(0, 2)}/${digitos.slice(2)}`;
  return `${digitos.slice(0, 2)}/${digitos.slice(2, 4)}/${digitos.slice(4)}`;
}

/** Dias inteiros de `de` até `ate` (positivo se `ate` é depois). */
export function diasEntre(de: DateOnly, ate: DateOnly): number {
  const a = lerDateOnly(de);
  const b = lerDateOnly(ate);
  if (!a || !b) return 0;
  // Math.round absorve a hora a mais/a menos de uma virada de horário de verão.
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

export function somarDias(valor: DateOnly, dias: number): DateOnly {
  const d = lerDateOnly(valor) ?? new Date();
  d.setDate(d.getDate() + dias);
  return paraDateOnly(d);
}

/** "há 5 min", "há 3 h", "ontem", "há 4 dias", ou a data para mais de uma semana. */
export function formatarRelativo(iso: ISODateTime, agora: Date = new Date()): string {
  const d = new Date(iso);
  const seg = Math.round((agora.getTime() - d.getTime()) / 1000);
  if (seg < 60) return 'agora';
  const min = Math.round(seg / 60);
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24 && d.getDate() === agora.getDate()) return `há ${h} h`;
  const dias = diasEntre(paraDateOnly(d), paraDateOnly(agora));
  if (dias <= 1) return 'ontem';
  if (dias < 7) return `há ${dias} dias`;
  return formatarDataDeMomento(iso);
}

export const NOMES_MESES = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
] as const;

/** Iniciais dos dias da semana, começando no domingo. */
export const INICIAIS_SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'] as const;
