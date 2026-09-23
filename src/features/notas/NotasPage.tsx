/**
 * Notas da equipe: atas, combinados e lembretes que não pertencem a um
 * processo. Cards para bater o olho; abrir uma nota abre o editor lateral,
 * que salva sozinho. Fixadas ficam no topo.
 */
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { NotebookPen, Pin, PinOff, Plus, Trash2, X } from 'lucide-react';
import { navegar, rotas } from '../../app/router';
import { Button } from '../../components/ui/Button';
import { InlineText, InlineTextArea, SearchInput } from '../../components/ui/Fields';
import { Drawer, useConfirm } from '../../components/ui/Overlay';
import { Card, EmptyState, PageHeader } from '../../components/ui/Surfaces';
import { useToast } from '../../components/ui/Toast';
import type { Nota } from '../../data/types';
import { ordenarNotas, tituloDaNota } from '../../domain/notas';
import { useSnapshot } from '../../hooks/useStore';
import { formatarMomento, formatarRelativo } from '../../lib/dates';
import { press } from '../../lib/motion';
import { combina } from '../../lib/text';
import { acoesNota } from '../../services/acoes';

function EditorDeNota({ nota, onFechar }: { nota: Nota | null; onFechar: () => void }) {
  const confirmar = useConfirm();
  const toast = useToast();
  const fechar = onFechar;

  const excluir = async () => {
    if (!nota) return;
    const ok = await confirmar({
      title: `Excluir “${tituloDaNota(nota)}”?`,
      message: 'A nota sai para toda a equipe neste navegador. Esta ação não pode ser desfeita.',
      confirmLabel: 'Excluir nota',
      tone: 'danger',
    });
    if (!ok) return;
    acoesNota.remover(nota.id);
    onFechar();
    toast({ title: 'Nota excluída.' });
  };

  return (
    <Drawer open={nota !== null} onClose={fechar} label="Nota da equipe" width="lg">
      {nota && (
        <>
          <header className="flex shrink-0 items-start justify-between gap-4 border-b border-hairline px-5 py-4">
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-medium text-ink-3">Nota da equipe</p>
              <InlineText
                value={nota.titulo}
                aria-label="Título da nota"
                placeholder="Título"
                autoFocus={!nota.titulo && !nota.texto}
                onCommit={(v) => acoesNota.atualizar(nota.id, { titulo: v })}
                className="mt-1 text-[15px] leading-tight font-semibold"
              />
            </div>
            <motion.button
              type="button"
              whileTap={press}
              aria-label="Fechar"
              data-autofocus={Boolean(nota.titulo || nota.texto) || undefined}
              onClick={fechar}
              className="-mt-0.5 -mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-4 transition-colors hover:bg-surface-2 hover:text-ink"
            >
              <X className="h-4 w-4" />
            </motion.button>
          </header>
          <div className="scroll-slim min-h-0 flex-1 overflow-y-auto px-5 py-4">
            <InlineTextArea
              value={nota.texto}
              aria-label="Texto da nota"
              placeholder="Escreva aqui. Tudo salva sozinho."
              rows={12}
              onCommit={(v) => acoesNota.atualizar(nota.id, { texto: v })}
              className="min-h-[50vh] text-[13px]"
            />
          </div>
          <footer className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-hairline bg-surface-2/60 px-5 py-3">
            <p className="text-[11.5px] text-ink-4">
              Criada por {nota.autor.nome} em {formatarMomento(nota.criadaEm)}
            </p>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                icon={nota.fixada ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                onClick={() => acoesNota.atualizar(nota.id, { fixada: !nota.fixada })}
              >
                {nota.fixada ? 'Desafixar' : 'Fixar no topo'}
              </Button>
              <Button size="sm" variant="ghost" icon={<Trash2 className="h-3.5 w-3.5" />} onClick={excluir}>
                Excluir
              </Button>
            </div>
          </footer>
        </>
      )}
    </Drawer>
  );
}

export function NotasPage({ notaId }: { notaId: string | null }) {
  const s = useSnapshot();
  const [busca, setBusca] = useState('');
  const aberta = notaId ? s.notas.find((n) => n.id === notaId) ?? null : null;
  // Nota vazia (criada e deixada em branco) não aparece na lista…
  const notas = useMemo(
    () =>
      ordenarNotas(
        s.notas.filter((n) => (n.titulo.trim() || n.texto.trim()) && combina(busca, n.titulo, n.texto, n.autor.nome)),
      ),
    [s.notas, busca],
  );
  // …e é apagada quando a lista volta a ser aberta — nunca na hora de fechar,
  // que é quando o salvamento automático do que foi digitado ainda pode chegar.
  useEffect(() => {
    if (!notaId) acoesNota.limparVazias();
  }, [notaId]);

  // Link para uma nota que já não existe volta para a lista.
  useEffect(() => {
    if (notaId && !aberta) navegar(rotas.notas(), { substituir: true });
  }, [notaId, aberta]);

  const nova = () => {
    const n = acoesNota.criar();
    navegar(rotas.notas(n.id));
  };

  const vazio = s.notas.every((n) => !n.titulo.trim() && !n.texto.trim());

  return (
    <div className="space-y-5">
      <PageHeader
        title="Notas da equipe"
        description="Atas de reunião, combinados e lembretes que não pertencem a um processo específico."
        actions={
          <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={nova}>
            Nova nota
          </Button>
        }
      >
        {!vazio && <SearchInput value={busca} onChange={setBusca} placeholder="Buscar nas notas…" className="w-full sm:w-72" />}
      </PageHeader>

      {vazio ? (
        <Card padded={false}>
          <EmptyState
            icon={<NotebookPen className="h-5 w-5" />}
            title="Nenhuma nota ainda"
            message="Use para atas de reunião, combinados da equipe e lembretes que não são de um processo."
          />
        </Card>
      ) : notas.length === 0 ? (
        <Card padded={false}>
          <EmptyState compact title="Nada encontrado" message="Tente outra palavra." />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {notas.map((n) => (
            <motion.button
              key={n.id}
              type="button"
              whileTap={press}
              onClick={() => navegar(rotas.notas(n.id))}
              className="flex min-h-[150px] flex-col rounded-xl bg-surface p-5 text-left transition-colors hover:bg-surface-hover"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="line-clamp-2 text-[15px] leading-tight font-semibold text-ink">{tituloDaNota(n)}</p>
                {n.fixada && <Pin className="h-3.5 w-3.5 shrink-0 text-ink-4" aria-label="Fixada" />}
              </div>
              {n.texto.trim() && (
                <p className="mt-2 line-clamp-4 text-[12.5px] leading-relaxed whitespace-pre-line text-ink-3">{n.texto}</p>
              )}
              <p className="mt-auto pt-3 text-[11px] text-ink-4">
                {n.autor.nome} · {formatarRelativo(n.atualizadaEm)}
              </p>
            </motion.button>
          ))}
        </div>
      )}

      <EditorDeNota nota={aberta} onFechar={() => navegar(rotas.notas(), { substituir: true })} />
    </div>
  );
}
