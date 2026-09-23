/**
 * Anexos: área para soltar arquivos, linha de anexo, vaga única (diagrama e
 * BPMN do cenário atual) e visualizador de PDF e imagem.
 *
 * A área de soltar é uma superfície recuada, não um retângulo tracejado: o
 * preenchimento já diz "isto recebe coisas" (Regra 1). Ao arrastar por cima,
 * ela escurece um passo.
 */
import { useEffect, useRef, useState, type DragEvent, type ReactNode } from 'react';
import { motion } from 'motion/react';
import {
  Download,
  Eye,
  File as FileIcon,
  FileImage,
  FileSpreadsheet,
  FileText,
  Presentation,
  RefreshCw,
  Trash2,
  Upload,
} from 'lucide-react';
import type { Anexo, ContextoAnexo, ID } from '../../data/types';
import { TAG_CONTEXTO } from '../../domain/anexos';
import { cn } from '../../lib/cn';
import { formatarDataDeMomento } from '../../lib/dates';
import { baixarBlob, formatarBytes, tipoDoArquivo, type TipoArquivo } from '../../lib/files';
import { press } from '../../lib/motion';
import { acoesAnexo } from '../../services/acoes';
import { Tag } from '../ui/Badges';
import { Button } from '../ui/Button';
import { Modal, useConfirm } from '../ui/Overlay';
import { useToast } from '../ui/Toast';

/* -- Arquivo → URL temporária ---------------------------------------------- */

export function useUrlDoAnexo(id: ID | null) {
  const [estado, setEstado] = useState<{ url: string | null; faltando: boolean }>({ url: null, faltando: false });
  useEffect(() => {
    if (!id) return;
    let url: string | null = null;
    let vivo = true;
    acoesAnexo
      .obterArquivo(id)
      .then((blob) => {
        if (!vivo) return;
        if (!blob) {
          setEstado({ url: null, faltando: true });
          return;
        }
        url = URL.createObjectURL(blob);
        setEstado({ url, faltando: false });
      })
      .catch(() => vivo && setEstado({ url: null, faltando: true }));
    return () => {
      vivo = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [id]);
  return estado;
}

/* -- Ícone por tipo -------------------------------------------------------- */

const ICONES: Record<TipoArquivo, typeof FileIcon> = {
  pdf: FileText,
  imagem: FileImage,
  documento: FileText,
  planilha: FileSpreadsheet,
  apresentacao: Presentation,
  outro: FileIcon,
};

export function IconeArquivo({ anexo }: { anexo: Pick<Anexo, 'mime' | 'nome'> }) {
  const Icone = ICONES[tipoDoArquivo(anexo.mime, anexo.nome)];
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-ink-3">
      <Icone className="h-4 w-4" />
    </span>
  );
}

/* -- Área de soltar -------------------------------------------------------- */

export function AreaDeArquivos({
  onArquivos,
  titulo = 'Arraste arquivos para cá',
  descricao = 'PDFs, imagens e documentos. Ou escolha do computador.',
  aceitar,
  multiplos = true,
  compacta = false,
}: {
  onArquivos: (arquivos: File[]) => void;
  titulo?: string;
  descricao?: ReactNode;
  aceitar?: string;
  multiplos?: boolean;
  compacta?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [sobre, setSobre] = useState(false);

  const soltar = (e: DragEvent) => {
    e.preventDefault();
    setSobre(false);
    const arquivos = Array.from(e.dataTransfer.files);
    if (arquivos.length) onArquivos(multiplos ? arquivos : arquivos.slice(0, 1));
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setSobre(true);
      }}
      onDragLeave={() => setSobre(false)}
      onDrop={soltar}
      className={cn(
        'flex items-center gap-3 rounded-xl transition-colors',
        compacta ? 'flex-wrap p-3' : 'flex-col justify-center px-6 py-8 text-center',
        sobre ? 'bg-surface-3' : 'bg-surface-2',
      )}
    >
      <span className={cn('flex shrink-0 items-center justify-center rounded-lg bg-surface text-ink-4', compacta ? 'h-9 w-9' : 'h-10 w-10')}>
        <Upload className="h-4 w-4" />
      </span>
      <div className={cn('min-w-0', compacta && 'min-w-[160px] flex-1')}>
        <p className="text-[13px] font-medium text-ink">{sobre ? 'Solte para anexar' : titulo}</p>
        {descricao && <p className="mt-0.5 text-[12px] leading-relaxed text-ink-3">{descricao}</p>}
      </div>
      <Button size="sm" onClick={() => inputRef.current?.click()} className={compacta ? '' : 'mt-1'}>
        Escolher arquivo{multiplos ? 's' : ''}
      </Button>
      <input
        ref={inputRef}
        type="file"
        multiple={multiplos}
        accept={aceitar}
        className="hidden"
        onChange={(e) => {
          const arquivos = Array.from(e.target.files ?? []);
          if (arquivos.length) onArquivos(arquivos);
          e.target.value = '';
        }}
      />
    </div>
  );
}

/* -- Visualizador ---------------------------------------------------------- */

export function VisualizadorAnexo({ anexo, onClose }: { anexo: Anexo | null; onClose: () => void }) {
  const { url, faltando } = useUrlDoAnexo(anexo?.id ?? null);
  const tipo = anexo ? tipoDoArquivo(anexo.mime, anexo.nome) : 'outro';
  return (
    <Modal
      open={anexo !== null}
      onClose={onClose}
      size="xl"
      title={anexo?.nome ?? ''}
      description={anexo ? `${formatarBytes(anexo.tamanho)} · anexado em ${formatarDataDeMomento(anexo.adicionadoEm)} por ${anexo.autor.nome}` : undefined}
      footer={
        anexo &&
        url && (
          <Button
            size="sm"
            icon={<Download className="h-3.5 w-3.5" />}
            onClick={async () => {
              const blob = await acoesAnexo.obterArquivo(anexo.id);
              if (blob) baixarBlob(blob, anexo.nome);
            }}
          >
            Baixar
          </Button>
        )
      }
    >
      <div className="bg-surface-2 p-3">
        {faltando ? (
          <p className="px-3 py-16 text-center text-[13px] text-ink-3">
            O arquivo não está neste navegador. Ele pode ter vindo de um backup exportado sem anexos.
          </p>
        ) : !url ? (
          <div className="shimmer h-[60vh] rounded-lg" />
        ) : tipo === 'pdf' ? (
          <iframe title={anexo?.nome} src={url} className="h-[70vh] w-full rounded-lg bg-surface" />
        ) : tipo === 'imagem' ? (
          <img src={url} alt={anexo?.nome} className="mx-auto max-h-[70vh] rounded-lg object-contain" />
        ) : (
          <p className="px-3 py-16 text-center text-[13px] text-ink-3">
            Este tipo de arquivo não tem prévia. Use “Baixar” para abrir no computador.
          </p>
        )}
      </div>
    </Modal>
  );
}

/* -- Linha de anexo -------------------------------------------------------- */

export function LinhaDeAnexo({
  anexo,
  onVer,
  mostrarContexto = true,
  acaoExtra,
}: {
  anexo: Anexo;
  onVer: (a: Anexo) => void;
  mostrarContexto?: boolean;
  acaoExtra?: ReactNode;
}) {
  const confirmar = useConfirm();
  const toast = useToast();
  const temPrevia = ['pdf', 'imagem'].includes(tipoDoArquivo(anexo.mime, anexo.nome));

  const baixar = async () => {
    const blob = await acoesAnexo.obterArquivo(anexo.id);
    if (blob) baixarBlob(blob, anexo.nome);
    else toast({ title: 'O arquivo não está neste navegador.', tone: 'crit' });
  };

  const remover = async () => {
    const ok = await confirmar({
      title: `Remover “${anexo.nome}”?`,
      message: 'O arquivo sai do processo e deste navegador. Esta ação não pode ser desfeita.',
      confirmLabel: 'Remover anexo',
      tone: 'danger',
    });
    if (ok) {
      await acoesAnexo.remover(anexo.id);
      toast({ title: 'Anexo removido.' });
    }
  };

  return (
    <div className="flex items-center gap-3">
      <IconeArquivo anexo={anexo} />
      <div className="min-w-0 flex-1">
        <motion.button
          type="button"
          whileTap={press}
          onClick={() => (temPrevia ? onVer(anexo) : void baixar())}
          className="block max-w-full truncate text-left text-[13px] font-medium text-ink transition-colors hover:text-ink-2"
        >
          {anexo.nome}
        </motion.button>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11.5px] text-ink-4">
          <span className="font-mono">{formatarBytes(anexo.tamanho)}</span>
          <span>
            {formatarDataDeMomento(anexo.adicionadoEm)} · {anexo.autor.nome}
          </span>
          {mostrarContexto && anexo.contexto !== 'geral' && <Tag>{TAG_CONTEXTO[anexo.contexto]}</Tag>}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-0.5">
        {acaoExtra}
        {temPrevia && (
          <Button variant="ghost" size="xs" square aria-label={`Ver ${anexo.nome}`} icon={<Eye className="h-3.5 w-3.5" />} onClick={() => onVer(anexo)} />
        )}
        <Button variant="ghost" size="xs" square aria-label={`Baixar ${anexo.nome}`} icon={<Download className="h-3.5 w-3.5" />} onClick={baixar} />
        <Button variant="ghost" size="xs" square aria-label={`Remover ${anexo.nome}`} icon={<Trash2 className="h-3.5 w-3.5" />} onClick={remover} />
      </div>
    </div>
  );
}

/* -- Vaga única ------------------------------------------------------------ */

/** Um arquivo só naquele lugar (ex.: o PDF do BPMN). Enviar outro substitui. */
export function VagaDeAnexo({
  processoId,
  contexto,
  titulo,
  descricao,
  anexo,
  onVer,
}: {
  processoId: ID;
  contexto: ContextoAnexo;
  titulo: string;
  descricao: string;
  anexo: Anexo | undefined;
  onVer: (a: Anexo) => void;
}) {
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  const enviar = async (arquivo: File) => {
    try {
      await acoesAnexo.substituir(processoId, contexto, arquivo);
      toast({ title: anexo ? 'Arquivo substituído.' : 'Arquivo anexado.' });
    } catch (e) {
      toast({ title: 'Não foi possível anexar.', description: e instanceof Error ? e.message : undefined, tone: 'crit' });
    }
  };

  return (
    <div>
      <p className="mb-2 text-[12px] font-medium text-ink">{titulo}</p>
      {anexo ? (
        <div className="rounded-xl bg-surface-2 p-3">
          <LinhaDeAnexo
            anexo={anexo}
            onVer={onVer}
            mostrarContexto={false}
            acaoExtra={
              <Button
                variant="ghost"
                size="xs"
                square
                aria-label="Substituir arquivo"
                title="Substituir arquivo"
                icon={<RefreshCw className="h-3.5 w-3.5" />}
                onClick={() => inputRef.current?.click()}
              />
            }
          />
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void enviar(f);
              e.target.value = '';
            }}
          />
        </div>
      ) : (
        <AreaDeArquivos
          compacta
          multiplos={false}
          aceitar="application/pdf,image/*"
          titulo="Nenhum arquivo ainda"
          descricao={descricao}
          onArquivos={(a) => a[0] && void enviar(a[0])}
        />
      )}
    </div>
  );
}
