/**
 * Backup: exportar tudo para um arquivo e importar de volta.
 *
 * Enquanto os dados morarem só no navegador, o backup é a única proteção
 * contra perda (limpeza do navegador, troca de computador) e o único jeito de
 * levar uma cópia para outra pessoa.
 */
import { BACKUP_FORMATO, STORAGE_PREFIX } from '../config/app';
import { tamanhoDasChaves } from '../lib/localPrefs';
import { store } from '../data';
import { lerBackup, SCHEMA_VERSION, type BackupLido, type ConteudoBackup } from '../data/schema';
import { agoraISO, hoje } from '../lib/dates';
import { base64ParaBlob, baixarBlob, blobParaBase64, lerArquivoComoTexto } from '../lib/files';
import { acoesMeta } from './acoes';
import { autorAtual } from './identidade';

export type { BackupLido };
export { ErroBackup } from '../data/schema';

export async function exportarBackup(opcoes: { incluirAnexos: boolean }) {
  const snapshot = store.getEstado().snapshot;
  const arquivos: ConteudoBackup['arquivos'] = opcoes.incluirAnexos ? [] : null;

  if (arquivos) {
    for (const anexo of snapshot.anexos) {
      const blob = await store.arquivos.obter(anexo.id);
      if (blob) arquivos.push({ id: anexo.id, mime: anexo.mime, base64: await blobParaBase64(blob) });
    }
  }

  const momento = agoraISO();
  const conteudo: ConteudoBackup = {
    formato: BACKUP_FORMATO,
    schemaVersion: SCHEMA_VERSION,
    exportadoEm: momento,
    exportadoPor: autorAtual(snapshot.config).nome,
    dados: snapshot,
    arquivos,
  };

  const blob = new Blob([JSON.stringify(conteudo)], { type: 'application/json' });
  const nomeArquivo = `customer-experience-backup-${hoje()}.json`;
  baixarBlob(blob, nomeArquivo);
  await acoesMeta.registrarBackup(momento);
  return { nomeArquivo, tamanho: blob.size };
}

/** Lê e valida o arquivo. Lança ErroBackup com mensagem pronta para a tela. */
export async function lerArquivoDeBackup(arquivo: File): Promise<BackupLido> {
  return lerBackup(await lerArquivoComoTexto(arquivo));
}

/** Substitui TODOS os dados deste navegador pelos do backup. */
export async function importarBackup(backup: BackupLido) {
  if (backup.arquivos) {
    await store.arquivos.limpar();
    for (const a of backup.arquivos) {
      await store.arquivos.salvar(a.id, base64ParaBlob(a.base64, a.mime));
    }
  }
  await store.substituirTudo(backup.snapshot);
}

export interface EspacoUsado {
  usado: number;
  cota: number;
  persistente: boolean | null;
}

/** Quanto do armazenamento do navegador este sistema está usando (arquivos + dados). */
export async function estimarEspaco(): Promise<EspacoUsado | null> {
  if (!navigator.storage?.estimate) return null;
  try {
    const { usage = 0, quota = 0 } = await navigator.storage.estimate();
    const persistente = navigator.storage.persisted ? await navigator.storage.persisted() : null;
    return { usado: usage + tamanhoDasChaves(STORAGE_PREFIX), cota: quota, persistente };
  } catch {
    return null;
  }
}

/** Pede ao navegador para não apagar os dados sozinho quando o disco enche. */
export async function pedirArmazenamentoPersistente(): Promise<boolean> {
  if (!navigator.storage?.persist) return false;
  try {
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}
