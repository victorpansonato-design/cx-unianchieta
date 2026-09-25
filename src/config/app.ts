/**
 * Identidade do sistema e chaves de armazenamento — um lugar só.
 *
 * STORAGE_PREFIX é o prefixo do armazenamento. A versão do schema mora em
 * meta.schemaVersion e sobe sem trocar o prefixo (a migração converte o dado).
 * Se o prefixo algum dia mudar (cx.v2), a chave do tema no script de
 * pré-pintura do index.html sobe junto — uma chave defasada faz o app piscar a
 * paleta errada no primeiro render (DESIGN_SYSTEM §9).
 */

export const APP_NAME = 'Customer Experience';
export const APP_INSTITUICAO = 'UniAnchieta';
export const APP_TITULO = `${APP_NAME} · ${APP_INSTITUICAO}`;

/** Prefixo do código automático dos processos: CX-001, CX-002… */
export const CODE_PREFIX = 'CX';

export const STORAGE_PREFIX = 'cx.v1';

export const STORAGE_KEYS = {
  /** Dados do sistema, uma chave por coleção: cx.v1.db.processos, cx.v1.db.config… */
  db: `${STORAGE_PREFIX}.db`,
  /** Tema claro/escuro. O index.html lê esta mesma chave antes do primeiro paint. */
  tema: `${STORAGE_PREFIX}.theme`,
  /** Quem está usando este navegador (membro da equipe ou Diretoria). */
  identidade: `${STORAGE_PREFIX}.identidade`,
  /** Preferências de interface: sidebar recolhida, lista ou quadro. */
  ui: `${STORAGE_PREFIX}.ui`,
  /** Até quando cada pessoa já viu as novidades, neste navegador. */
  novidades: `${STORAGE_PREFIX}.novidades`,
} as const;

/** Banco IndexedDB onde vivem os arquivos anexados (PDFs, imagens, documentos). */
export const FILES_DB_NAME = 'cx-anexos';

/** Identificador do formato do arquivo de backup. */
export const BACKUP_FORMATO = 'cx-unianchieta-backup';
