/**
 * Arquivos anexados em IndexedDB.
 *
 * PDFs podem ter dezenas de MB; o localStorage guarda ~5 MB no total e só
 * texto. O IndexedDB guarda Blobs direto, com cota de centenas de MB ou mais.
 */
import { ErroArmazenamento, type ArmazenamentoDeArquivos } from '../../repository';

const STORE = 'arquivos';

function requisicao<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export function criarArquivosIndexedDb(nomeBanco: string): ArmazenamentoDeArquivos {
  let conexao: Promise<IDBDatabase> | null = null;

  function abrir(): Promise<IDBDatabase> {
    if (!conexao) {
      conexao = new Promise((resolve, reject) => {
        let req: IDBOpenDBRequest;
        try {
          req = indexedDB.open(nomeBanco, 1);
        } catch {
          reject(
            new ErroArmazenamento('Este navegador não permite guardar arquivos.', 'indisponivel'),
          );
          return;
        }
        req.onupgradeneeded = () => {
          if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () =>
          reject(
            new ErroArmazenamento('Não foi possível abrir o armazenamento de arquivos.', 'indisponivel'),
          );
      });
      // Se falhar, a próxima chamada tenta de novo.
      conexao.catch(() => (conexao = null));
    }
    return conexao;
  }

  async function transacao<T>(modo: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>) {
    const db = await abrir();
    const tx = db.transaction(STORE, modo);
    // A promessa de fim nasce ANTES de aguardar a requisição: se os handlers
    // fossem ligados depois, a transação poderia completar sem ninguém ouvindo.
    const fim = new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () =>
        reject(
          tx.error?.name === 'QuotaExceededError'
            ? new ErroArmazenamento(
                'O espaço do navegador para arquivos acabou. Remova anexos grandes ou exporte um backup.',
                'cota',
              )
            : tx.error,
        );
    });
    const [resultado] = await Promise.all([requisicao(fn(tx.objectStore(STORE))), fim]);
    return resultado;
  }

  return {
    async salvar(id, conteudo) {
      await transacao('readwrite', (s) => s.put(conteudo, id));
    },
    async obter(id) {
      const valor = await transacao('readonly', (s) => s.get(id) as IDBRequest<Blob | undefined>);
      return valor ?? null;
    },
    async remover(id) {
      await transacao('readwrite', (s) => s.delete(id));
    },
    async limpar() {
      await transacao('readwrite', (s) => s.clear());
    },
  };
}
