/** Só aceita links http(s) digitados pela equipe — nunca `javascript:` ou similares. */
export function linkSeguro(texto: string): string | null {
  try {
    const u = new URL(texto.trim());
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.href : null;
  } catch {
    return null;
  }
}
