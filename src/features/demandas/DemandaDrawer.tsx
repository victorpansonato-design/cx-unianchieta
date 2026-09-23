/**
 * Painel lateral da demanda: tudo editável no lugar, e a decisão no rodapé —
 * transformar em processo (primário) ou recusar com o motivo.
 */
import { useEffect, useState } from 'react';
import { ArrowRight, RotateCcw, Trash2, X } from 'lucide-react';
import { motion } from 'motion/react';
import { navegar, rotas } from '../../app/router';
import { Button } from '../../components/ui/Button';
import { DateInput } from '../../components/ui/DateInput';
import { InlineText, InlineTextArea, Label, TextArea } from '../../components/ui/Fields';
import { Drawer, useConfirm } from '../../components/ui/Overlay';
import { SeletorInline } from '../../components/ui/SeletorInline';
import { Callout } from '../../components/ui/Surfaces';
import { useToast } from '../../components/ui/Toast';
import type { Demanda, Snapshot } from '../../data/types';
import { formatarMomento } from '../../lib/dates';
import { press } from '../../lib/motion';
import { acoesDemanda } from '../../services/acoes';
import { StatusDaDemanda } from './StatusDaDemanda';

function opcoes(lista: Array<{ id: string; nome: string; arquivado?: boolean }>, atual: string | null) {
  return lista.filter((x) => !x.arquivado || x.id === atual).map((x) => ({ valor: x.id, nome: x.nome }));
}

export function DemandaDrawer({ demanda, s, onFechar }: { demanda: Demanda | null; s: Snapshot; onFechar: () => void }) {
  const confirmar = useConfirm();
  const toast = useToast();
  const [recusando, setRecusando] = useState(false);
  const [motivo, setMotivo] = useState('');

  useEffect(() => {
    setRecusando(false);
    setMotivo('');
  }, [demanda?.id]);

  const d = demanda;
  const processo = d?.processoId ? s.processos.find((p) => p.id === d.processoId) : undefined;

  const aceitar = () => {
    if (!d) return;
    const p = acoesDemanda.aceitar(d.id);
    if (!p) return;
    toast({ title: `${p.codigo} criado a partir da demanda.`, description: 'Ele começa na primeira etapa do fluxo.' });
    navegar(rotas.processo(p.codigo));
  };

  const recusar = () => {
    if (!d) return;
    acoesDemanda.recusar(d.id, motivo);
    setRecusando(false);
    toast({ title: 'Demanda recusada.' });
  };

  const excluir = async () => {
    if (!d) return;
    const ok = await confirmar({
      title: 'Excluir esta demanda?',
      message: processo
        ? `Ela sai da caixa de demandas. O processo ${processo.codigo}, criado a partir dela, continua existindo.`
        : 'Ela sai da caixa de demandas. Esta ação não pode ser desfeita.',
      confirmLabel: 'Excluir demanda',
      tone: 'danger',
    });
    if (!ok) return;
    acoesDemanda.remover(d.id);
    onFechar();
    toast({ title: 'Demanda excluída.' });
  };

  return (
    <Drawer open={d !== null} onClose={onFechar} label="Demanda" width="md">
      {d && (
        <>
          <header className="flex shrink-0 items-start justify-between gap-4 border-b border-hairline px-5 py-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-medium text-ink-3">Demanda</span>
                <StatusDaDemanda demanda={d} s={s} />
              </div>
              <InlineText
                value={d.titulo}
                aria-label="Título da demanda"
                required
                onCommit={(v) => acoesDemanda.atualizar(d.id, { titulo: v })}
                className="mt-1 text-[15px] leading-tight font-semibold"
              />
            </div>
            <motion.button
              type="button"
              whileTap={press}
              aria-label="Fechar"
              data-autofocus
              onClick={onFechar}
              className="-mt-0.5 -mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-4 transition-colors hover:bg-surface-2 hover:text-ink"
            >
              <X className="h-4 w-4" />
            </motion.button>
          </header>

          <div className="scroll-slim min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
            {d.status === 'recusada' && (
              <Callout tone="ok" title="Recusada">
                {d.motivoRecusa || 'Sem motivo registrado.'}
              </Callout>
            )}
            {processo && (
              <Callout tone="ok" title={`Virou o processo ${processo.codigo}`}>
                <motion.a
                  href={rotas.processo(processo.codigo)}
                  whileTap={press}
                  className="inline-flex items-center gap-1 font-medium text-ink transition-colors hover:text-ink-2"
                >
                  {processo.titulo}
                  <ArrowRight className="h-3.5 w-3.5" />
                </motion.a>
              </Callout>
            )}

            <div>
              <Label htmlFor={`demanda-desc-${d.id}`}>O que foi pedido</Label>
              <InlineTextArea
                id={`demanda-desc-${d.id}`}
                value={d.descricao}
                aria-label="O que foi pedido"
                placeholder="O problema ou o pedido, com as palavras de quem trouxe."
                onCommit={(v) => acoesDemanda.atualizar(d.id, { descricao: v })}
                className="min-h-24 text-[13px]"
              />
            </div>

            <dl className="space-y-1">
              <div className="grid grid-cols-[112px_minmax(0,1fr)] items-center gap-2">
                <dt className="text-[12px] text-ink-3">Origem</dt>
                <dd>
                  <SeletorInline
                    rotulo="Origem"
                    valor={d.origemId}
                    vazio="Não informada"
                    opcoes={opcoes(s.config.origens, d.origemId)}
                    onChange={(v) => acoesDemanda.atualizar(d.id, { origemId: v })}
                  />
                </dd>
              </div>
              <div className="grid grid-cols-[112px_minmax(0,1fr)] items-center gap-2">
                <dt className="text-[12px] text-ink-3">Setor envolvido</dt>
                <dd>
                  <SeletorInline
                    rotulo="Setor envolvido"
                    valor={d.setorId}
                    vazio="Não informado"
                    opcoes={opcoes(s.config.setores, d.setorId)}
                    onChange={(v) => acoesDemanda.atualizar(d.id, { setorId: v })}
                  />
                </dd>
              </div>
              <div className="grid grid-cols-[112px_minmax(0,1fr)] items-center gap-2">
                <dt className="text-[12px] text-ink-3">Quem pediu</dt>
                <dd>
                  <InlineText
                    value={d.solicitante}
                    aria-label="Quem pediu"
                    placeholder="Nome ou setor"
                    onCommit={(v) => acoesDemanda.atualizar(d.id, { solicitante: v })}
                    className="text-[13px]"
                  />
                </dd>
              </div>
              <div className="grid grid-cols-[112px_minmax(0,1fr)] items-center gap-2">
                <dt className="text-[12px] text-ink-3">Recebida em</dt>
                <dd>
                  <DateInput
                    variant="inline"
                    aria-label="Recebida em"
                    value={d.recebidaEm}
                    onChange={(v) => v && acoesDemanda.atualizar(d.id, { recebidaEm: v })}
                  />
                </dd>
              </div>
            </dl>

            <p className="text-[11.5px] text-ink-4">
              Registrada por {d.registradaPor.nome} em {formatarMomento(d.criadaEm)}.
            </p>

            {recusando && (
              <div className="space-y-2 rounded-xl bg-surface-2 p-3.5">
                <Label htmlFor={`motivo-${d.id}`}>Por que recusar?</Label>
                <TextArea
                  id={`motivo-${d.id}`}
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  rows={3}
                  autoFocus
                  placeholder="O motivo fica registrado na demanda."
                  className="bg-surface"
                />
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setRecusando(false)}>
                    Cancelar
                  </Button>
                  <Button size="sm" onClick={recusar}>
                    Recusar demanda
                  </Button>
                </div>
              </div>
            )}
          </div>

          <footer className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-hairline bg-surface-2/60 px-5 py-3.5">
            <Button variant="ghost" size="sm" icon={<Trash2 className="h-3.5 w-3.5" />} onClick={excluir}>
              Excluir
            </Button>
            <div className="flex items-center gap-2">
              {d.status === 'nova' && !recusando && (
                <>
                  <Button size="sm" onClick={() => setRecusando(true)}>
                    Recusar
                  </Button>
                  <Button variant="primary" size="sm" iconRight={<ArrowRight className="h-3.5 w-3.5" />} onClick={aceitar}>
                    Transformar em processo
                  </Button>
                </>
              )}
              {d.status === 'recusada' && (
                <Button size="sm" icon={<RotateCcw className="h-3.5 w-3.5" />} onClick={() => acoesDemanda.reabrir(d.id)}>
                  Reabrir
                </Button>
              )}
              {d.status === 'aceita' && processo && (
                <Button size="sm" iconRight={<ArrowRight className="h-3.5 w-3.5" />} onClick={() => navegar(rotas.processo(processo.codigo))}>
                  Abrir {processo.codigo}
                </Button>
              )}
            </div>
          </footer>
        </>
      )}
    </Drawer>
  );
}
