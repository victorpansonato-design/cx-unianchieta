/** Utilitários de arquivo: tamanho legível, tipo, download e base64 (backup). */

export function formatarBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
  const unidades = ['B', 'KB', 'MB', 'GB'];
  let valor = bytes;
  let i = 0;
  while (valor >= 1024 && i < unidades.length - 1) {
    valor /= 1024;
    i++;
  }
  const casas = i === 0 || valor >= 100 ? 0 : 1;
  return `${valor.toLocaleString('pt-BR', { maximumFractionDigits: casas, minimumFractionDigits: casas })} ${unidades[i]}`;
}

export type TipoArquivo = 'pdf' | 'imagem' | 'documento' | 'planilha' | 'apresentacao' | 'outro';

export function tipoDoArquivo(mime: string, nome: string): TipoArquivo {
  const ext = nome.split('.').pop()?.toLowerCase() ?? '';
  if (mime === 'application/pdf' || ext === 'pdf') return 'pdf';
  if (mime.startsWith('image/')) return 'imagem';
  if (['doc', 'docx', 'odt', 'rtf', 'txt'].includes(ext)) return 'documento';
  if (['xls', 'xlsx', 'ods', 'csv'].includes(ext)) return 'planilha';
  if (['ppt', 'pptx', 'odp'].includes(ext)) return 'apresentacao';
  return 'outro';
}

/** Oferece um Blob como download com o nome dado. */
export function baixarBlob(blob: Blob, nomeArquivo: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nomeArquivo;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Dá tempo ao navegador de iniciar o download antes de liberar a memória.
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function blobParaBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => {
      const resultado = String(leitor.result);
      resolve(resultado.slice(resultado.indexOf(',') + 1));
    };
    leitor.onerror = () => reject(leitor.error ?? new Error('Falha ao ler o arquivo.'));
    leitor.readAsDataURL(blob);
  });
}

export function base64ParaBlob(base64: string, mime: string): Blob {
  const binario = atob(base64);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
  return new Blob([bytes], { type: mime || 'application/octet-stream' });
}

export function lerArquivoComoTexto(arquivo: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => resolve(String(leitor.result));
    leitor.onerror = () => reject(leitor.error ?? new Error('Falha ao ler o arquivo.'));
    leitor.readAsText(arquivo);
  });
}
