/**
 * Tarefas: o checklist do processo, agrupado por etapa. Cada tarefa tem
 * responsável (da equipe ou de fora), prazo e etapa. Tarefa atrasada ganha o
 * vermelho do prazo vencido; concluída fica em tinta apagada.
 */
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ListChecks, Plus, Trash2 } from 'lucide-react';
import { navegar, rotas } from '../../../app/router';
import { SeletorResponsavelTarefa } from '../../../components/domain/CamposExtras';
import { Tag } from '../../../components/ui/Badges';
import { Button, LinkButton } from '../../../components/ui/Button';
import { MeterBar } from '../../../components/ui/Charts';
import { DateInput } from '../../../components/ui/DateInput';
import { Checkbox, InlineText, Select, TextInput } from '../../../components/ui/Fields';
import { useConfirm } from '../../../components/ui/Overlay';
import { Card, CardHeader, EmptyState, SectionLabel } from '../../../components/ui/Surfaces';
import type { Processo, Snapshot, Tarefa } from '../../../data/types';
import { ordenarTarefas, tarefaAtrasada, tarefasDoProcesso } from '../../../domain/tarefas';
import { cn } from '../../../lib/cn';
import { formatarDataDeMomento } from '../../../lib/dates';
import { acoesTarefa } from '../../../services/acoes';

function LinhaTarefa({ tarefa: t, s }: { tarefa: Tarefa; s: Snapshot }) {
  const confirmar = useConfirm();
  const atrasada = tarefaAtrasada(t);

  const remover = async () => {
    const ok = await confirmar({
      title: 'Remover esta tarefa?',
      message: `“${t.titulo}” sai do checklist.`,
      confirmLabel: 'Remover tarefa',
      tone: 'danger',
    });
    if (ok) acoesTarefa.remover(t.id);
  };

  return (
    <li className="flex items-start gap-3 py-2">
      <div className="pt-2">
        <Checkbox checked={t.concluida} onChange={(v) => acoesTarefa.alternar(t.id, v)} label={`Concluir: ${t.titulo}`} />
      </div>
      <div className="min-w-0 flex-1">
        <InlineText
          value={t.titulo}
          aria-label="Título da tarefa"
          required
          onCommit={(v) => acoesTarefa.atualizar(t.id, { titulo: v })}
          className={cn('text-[13px]', t.concluida ? 'text-ink-3' : 'font-medium')}
        />
        {(t.concluida || t.padrao) && (
          <p className="mt-0.5 flex flex-wrap items-center gap-2 text-[11.5px] text-ink-4">
            {t.concluida && t.concluidaEm && (
              <span>
                Concluída em {formatarDataDeMomento(t.concluidaEm)}
                {t.concluidaPor ? ` por ${t.concluidaPor}` : ''}
              </span>
            )}
            {t.padrao && !t.concluida && <Tag>Tarefa padrão da etapa</Tag>}
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1 pt-0.5">
        <SeletorResponsavelTarefa
          config={s.config}
          compacto
          responsavelId={t.responsavelId}
          responsavelExterno={t.responsavelExterno}
          onChange={(v) => acoesTarefa.atualizar(t.id, v)}
        />
        <div className="w-[128px]">
          <DateInput
            variant="inline"
            aria-label={`Prazo da tarefa ${t.titulo}`}
            placeholder="Prazo"
            value={t.prazo}
            tone={atrasada ? 'crit' : undefined}
            onChange={(v) => acoesTarefa.atualizar(t.id, { prazo: v })}
          />
        </div>
        <Button variant="ghost" size="xs" square aria-label={`Remover a tarefa ${t.titulo}`} icon={<Trash2 className="h-3.5 w-3.5" />} onClick={remover} />
      </div>
    </li>
  );
}

export function TarefasAba({ processo: p, s }: { processo: Processo; s: Snapshot }) {
  const [titulo, setTitulo] = useState('');
  const [etapaId, setEtapaId] = useState<string>(p.etapaId);
  // Tarefa nova entra, por padrão, na etapa em que o processo está agora.
  useEffect(() => setEtapaId(p.etapaId), [p.etapaId]);
  const tarefas = useMemo(() => tarefasDoProcesso(s, p.id), [s, p.id]);
  const concluidas = tarefas.filter((t) => t.concluida).length;
  const temPadrao = s.config.etapas.some((e) => e.tarefasPadrao.length > 0);

  const grupos = useMemo(() => {
    const porEtapa = s.config.etapas
      .map((e) => ({ id: e.id, nome: e.nome, tarefas: ordenarTarefas(tarefas.filter((t) => t.etapaId === e.id)) }))
      .filter((g) => g.tarefas.length > 0);
    const idsEtapas = new Set(s.config.etapas.map((e) => e.id));
    const soltas = ordenarTarefas(tarefas.filter((t) => !t.etapaId || !idsEtapas.has(t.etapaId)));
    return soltas.length ? [...porEtapa, { id: '__sem', nome: 'Sem etapa', tarefas: soltas }] : porEtapa;
  }, [s.config.etapas, tarefas]);

  const adicionar = (e: FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) return;
    acoesTarefa.criar(p.id, { titulo, etapaId: etapaId || null });
    setTitulo('');
  };

  return (
    <Card padded={false}>
      <CardHeader
        className="px-5 pt-5 pb-4"
        title="Tarefas"
        subtitle="O checklist do processo. Marque como concluída quando terminar; o registro vai para os andamentos."
        action={
          tarefas.length > 0 && (
            <div className="flex w-36 flex-col items-end gap-1.5">
              <span className="font-mono text-[12px] text-ink-2">
                {concluidas} de {tarefas.length}
              </span>
              <MeterBar value={concluidas} max={tarefas.length} label={`${concluidas} de ${tarefas.length} tarefas concluídas`} />
            </div>
          )
        }
      />

      <form onSubmit={adicionar} className="flex flex-col gap-2 border-t border-hairline px-5 py-3 sm:flex-row">
        <TextInput
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Nova tarefa…"
          aria-label="Nova tarefa"
          className="sm:flex-1"
        />
        <Select value={etapaId} onChange={(e) => setEtapaId(e.target.value)} aria-label="Etapa da tarefa" wrapperClassName="sm:w-56">
          {s.config.etapas.map((e, i) => (
            <option key={e.id} value={e.id}>
              {i + 1}. {e.nome}
            </option>
          ))}
          <option value="">Sem etapa</option>
        </Select>
        <Button type="submit" icon={<Plus className="h-4 w-4" />} disabled={!titulo.trim()}>
          Adicionar
        </Button>
      </form>

      {tarefas.length === 0 ? (
        <div className="border-t border-hairline">
          <EmptyState
            compact
            icon={<ListChecks className="h-5 w-5" />}
            title="Nenhuma tarefa ainda"
            message={
              temPadrao
                ? 'Adicione a primeira no campo acima. As tarefas padrão entram sozinhas quando o processo chega na etapa delas.'
                : 'Adicione a primeira no campo acima. Para tarefas que se repetem em todo processo, cadastre tarefas padrão por etapa.'
            }
            action={
              !temPadrao && (
                <LinkButton onClick={() => navegar(rotas.configuracoes('etapas'))}>Cadastrar tarefas padrão</LinkButton>
              )
            }
          />
        </div>
      ) : (
        <div className="space-y-5 border-t border-hairline px-5 pt-4 pb-3">
          {grupos.map((g) => {
            const feitas = g.tarefas.filter((t) => t.concluida).length;
            return (
              <section key={g.id}>
                <SectionLabel
                  action={
                    <span className="font-mono text-[11px] text-ink-4">
                      {feitas}/{g.tarefas.length}
                    </span>
                  }
                >
                  <span className="flex items-center gap-2">
                    {g.nome}
                    {g.id === p.etapaId && <Tag>Etapa atual</Tag>}
                  </span>
                </SectionLabel>
                <ul className="divide-y divide-hairline">
                  {g.tarefas.map((t) => (
                    <LinhaTarefa key={t.id} tarefa={t} s={s} />
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </Card>
  );
}
