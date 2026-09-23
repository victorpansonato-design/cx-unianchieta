/** Minúsculas e sem acento — "Secretária" e "secretaria" são a mesma busca. */
export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/** Todas as palavras da consulta aparecem em algum dos campos. */
export function combina(consulta: string, ...campos: Array<string | null | undefined>): boolean {
  const termos = normalizar(consulta).split(/\s+/).filter(Boolean);
  if (termos.length === 0) return true;
  const alvo = normalizar(campos.filter(Boolean).join(' '));
  return termos.every((t) => alvo.includes(t));
}

/** "Maria Clara Souza" → "MS". Uma palavra → primeira letra. */
export function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '?';
  if (partes.length === 1) return partes[0].charAt(0).toUpperCase();
  return (partes[0].charAt(0) + partes[partes.length - 1].charAt(0)).toUpperCase();
}

/** plural(1, 'processo', 'processos') → "1 processo". */
export function plural(n: number, singular: string, pluralForm: string): string {
  return `${n.toLocaleString('pt-BR')} ${n === 1 ? singular : pluralForm}`;
}

export function formatarNumero(n: number): string {
  return n.toLocaleString('pt-BR');
}
