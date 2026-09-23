/**
 * Junta classes ignorando valores vazios. Sem merge mágico: a ordem é a do chamador.
 * Aceita qualquer valor "falso" do React (`cond && 'classe'` com cond numérica ou nó).
 */
export function cn(...parts: unknown[]): string {
  return parts.filter((p): p is string => typeof p === 'string' && p.length > 0).join(' ');
}
