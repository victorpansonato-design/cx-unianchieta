/**
 * Coleções em localStorage, uma chave por coleção (cx.v1.db.processos…).
 *
 * Uma chave por coleção em vez de um blob único: mudar uma tarefa reescreve só
 * as tarefas, não os processos inteiros.
 */
import { ErroArmazenamento } from '../../repository';

export class LocalStorageDb {
  constructor(private readonly prefixo: string) {}

  chave(colecao: string): string {
    return `${this.prefixo}.${colecao}`;
  }

  /** O evento `storage` de outra aba diz respeito a estes dados? */
  pertence(chave: string | null): boolean {
    return chave === null || chave.startsWith(`${this.prefixo}.`);
  }

  ler(colecao: string): unknown {
    let cru: string | null;
    try {
      cru = localStorage.getItem(this.chave(colecao));
    } catch {
      throw new ErroArmazenamento(
        'O navegador não permite guardar dados nesta página. Verifique se não é uma aba anônima ou se o armazenamento não está bloqueado.',
        'indisponivel',
      );
    }
    if (cru === null) return undefined;
    try {
      return JSON.parse(cru);
    } catch {
      return undefined;
    }
  }

  escrever(colecao: string, valor: unknown): void {
    try {
      localStorage.setItem(this.chave(colecao), JSON.stringify(valor));
    } catch (erro) {
      const cota =
        erro instanceof DOMException &&
        (erro.name === 'QuotaExceededError' || erro.name === 'NS_ERROR_DOM_QUOTA_REACHED');
      throw new ErroArmazenamento(
        cota
          ? 'O espaço do navegador para dados acabou. Exporte um backup em Configurações antes de continuar.'
          : 'Não foi possível salvar neste navegador.',
        cota ? 'cota' : 'indisponivel',
      );
    }
  }
}
