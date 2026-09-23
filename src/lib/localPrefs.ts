/**
 * Leitura e escrita de preferências do navegador (tema, identidade, UI).
 *
 * Preferência não é dado do sistema: mesmo quando os processos forem para um
 * banco compartilhado, o tema e "quem sou eu" continuam sendo deste navegador.
 * Por isso vivem aqui, fora da camada de dados.
 *
 * Tudo em try/catch: em aba anônima, com storage bloqueado ou dentro de um
 * iframe restrito, o acesso pode lançar — e o app tem de abrir mesmo assim.
 */

export function lerPref<T>(chave: string, padrao: T): T {
  try {
    const cru = localStorage.getItem(chave);
    if (cru === null) return padrao;
    return JSON.parse(cru) as T;
  } catch {
    return padrao;
  }
}

export function gravarPref<T>(chave: string, valor: T): void {
  try {
    localStorage.setItem(chave, JSON.stringify(valor));
  } catch {
    /* storage indisponível — a preferência vale só nesta sessão */
  }
}

/**
 * Bytes ocupados no localStorage pelas chaves com este prefixo. O navegador
 * guarda texto em UTF-16 (2 bytes por caractere) — e não soma o localStorage
 * na estimativa de `navigator.storage`, por isso a conta é feita aqui.
 */
export function tamanhoDasChaves(prefixo: string): number {
  try {
    let total = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const chave = localStorage.key(i);
      if (chave?.startsWith(prefixo)) total += (chave.length + (localStorage.getItem(chave)?.length ?? 0)) * 2;
    }
    return total;
  } catch {
    return 0;
  }
}

export function removerPref(chave: string): void {
  try {
    localStorage.removeItem(chave);
  } catch {
    /* ignora */
  }
}
