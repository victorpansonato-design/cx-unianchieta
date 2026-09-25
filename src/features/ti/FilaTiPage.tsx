/**
 * Fila do TI: a tela inteira de quem é do TI.
 *
 * Três grupos, na ordem em que o TI age: o que ninguém pegou ainda (com o
 * botão "Puxar para mim"), o que está com você e o que está com colegas. O que
 * entrou antes na fila vem antes. Numa segunda aba, o que o TI já entregou.
 *
 * Simples de propósito: o TI e o CX trabalham na mesma sala. A fila só
 * organiza quem está com o quê e guarda a entrega junto do processo.
 */
import { useMemo, useState, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { Hand, ListTodo, SearchX } from 'lucide-react';
import { navegar, rotas, type AbaTi } from '../../app/router';
import { PilhaDeAvatares } from '../../components/domain/Pessoas';
import { PrioridadeStatus } from '../../components/domain/StatusProcesso';
import { StatusTiBadge } from '../../components/domain/StatusTi';
import { Tag } from '../../components/ui/Badges';
import { Button } from '../../components/ui/Button';
import { SearchInput } from '../../components/ui/Fields';
import { Card, CardHeader, ChevronAffordance, EmptyState, PageHeader, Tabs } from '../../components/ui/Surfaces';
import { useToast } from '../../components/ui/Toast';
import type { Processo, Snapshot } from '../../data/types';
import { nomeDe } from '../../domain/config';
import { etapaDe } from '../../domain/processos';
import { entradaNaFila, entreguesPeloTi, filaDoTi, nomesTi } from '../../domain/ti';
import { useIdentidade } from '../../hooks/usePreferencias';
import { useSnapshot } from '../../hooks/useStore';
import { diasEntre, formatarData, formatarDataCurta, hoje, paraDateOnly } from '../../lib/dates';
import { press } from '../../lib/motion';
import { combina, plural } from '../../lib/text';
import { acoesTi } from '../../services/acoes';

function naFilaHa(s: Snapshot, p: Processo): string | null {
  const entrada = entradaNaFila(s, p);
  if (!entrada) return null;
  const dias = diasEntre(paraDateOnly(new Date(entrada)), hoje());
  return dias === 0 ? 'chegou hoje' : `na fila há ${plural(dias, 'dia', 'dias')}`;
}

/** Uma linha da fila. A linha abre o processo; a ação à direita não. */
function LinhaDaFila({ p, s, direita, acao }: { p: Processo; s: Snapshot; direita?: ReactNode; acao?: ReactNode }) {
  const setor = nomeDe(s.config.setores, p.setorId);
  const etapa = etapaDe(s.config, p.etapaId);
  return (
    <li className="group relative flex items-center gap-3 pr-5 transition-colors hover:bg-surface-hover">
      <motion.a href={rotas.tiProcesso(p.codigo)} whileTap={press} className="flex min-w-0 flex-1 items-center gap-4 py-3 pl-5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <span className="font-mono text-[11px] text-ink-4">{p.codigo}</span>
            {p.prioridadeId && <PrioridadeStatus lista={s.config.prioridades} id={p.prioridadeId} />}
          </div>
          <p className="mt-0.5 truncate text-[13px] font-medium text-ink">{p.titulo}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] text-ink-4">
            {setor && <Tag>{setor}</Tag>}
            {etapa && <span>{etapa.nome}</span>}
          </div>
        </div>
        {direita && <div className="hidden shrink-0 flex-col items-end gap-1 sm:flex">{direita}</div>}
        {!acao && <ChevronAffordance />}
      </motion.a>
      {acao}
    </li>
  );
}

function Grupo({ titulo, subtitulo, vazio, children }: { titulo: string; subtitulo?: string; vazio: string; children: ReactNode[] }) {
  return (
    <Card padded={false}>
      <CardHeader className="px-5 pt-5 pb-3" title={titulo} subtitle={subtitulo} />
      {children.length === 0 ? (
        <p className="px-5 pb-5 text-[12px] text-ink-3">{vazio}</p>
      ) : (
        <ul className="divide-y divide-hairline border-t border-hairline">{children}</ul>
      )}
    </Card>
  );
}

function Previsao({ p }: { p: Processo }) {
  if (!p.ti.previsao) return <span className="text-[11.5px] text-ink-4">Sem previsão</span>;
  return (
    <span className="text-[11.5px] text-ink-3" title={`Previsão de entrega: ${formatarData(p.ti.previsao)}`}>
      Previsão <span className="font-mono text-ink-2">{formatarDataCurta(p.ti.previsao)}</span>
    </span>
  );
}

export function FilaTiPage({ aba }: { aba: AbaTi }) {
  const s = useSnapshot();
  const { pessoa } = useIdentidade();
  const toast = useToast();
  const [busca, setBusca] = useState('');
  const meuId = pessoa?.tipo === 'ti' ? pessoa.id : null;

  const fila = useMemo(() => filaDoTi(s, meuId), [s, meuId]);
  const entregues = useMemo(() => entreguesPeloTi(s), [s]);
  const filtrar = (lista: Processo[]) =>
    busca.trim()
      ? lista.filter((p) => combina(busca, p.codigo, p.titulo, nomeDe(s.config.setores, p.setorId), p.lyceum, nomesTi(p, s.config).join(' ')))
      : lista;

  const semNinguem = filtrar(fila.semNinguem);
  const comigo = filtrar(fila.comigo);
  const comOutros = filtrar(fila.comOutros);
  const listaEntregues = filtrar(entregues);
  const totalNaFila = fila.semNinguem.length + fila.comigo.length + fila.comOutros.length;

  const puxar = async (p: Processo) => {
    if (!meuId) return;
    await acoesTi.puxar(p.id, meuId);
    toast({ title: `${p.codigo} está com você.`, description: 'O CX já vê o seu nome no processo.' });
  };

  const nadaNaBusca = busca.trim() && (aba === 'fila' ? semNinguem.length + comigo.length + comOutros.length === 0 : listaEntregues.length === 0);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Fila do TI"
        description="Os processos que o CX encaminhou ao TI. Puxe um para você e o CX passa a ver quem está com ele. Dentro do processo ficam o que o CX pede, a entrega e os retornos."
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <Tabs<AbaTi>
            layoutId="ti-abas"
            label="Fila ou entregues"
            value={aba}
            onChange={(a) => navegar(rotas.ti(a), { substituir: true })}
            items={[
              { id: 'fila', label: 'Fila', count: totalNaFila || undefined },
              { id: 'entregues', label: 'Entregues', count: entregues.length || undefined },
            ]}
          />
          <SearchInput
            aria-label="Buscar na fila por título, código ou setor"
            value={busca}
            onChange={setBusca}
            placeholder="Buscar processo…"
            className="w-full sm:w-72"
          />
        </div>
      </PageHeader>

      {nadaNaBusca ? (
        <Card padded={false}>
          <EmptyState compact icon={<SearchX className="h-5 w-5" />} title="Nenhum processo com essa busca" message="Tente outra palavra, o código ou o setor." />
        </Card>
      ) : aba === 'entregues' ? (
        listaEntregues.length === 0 ? (
          <Card padded={false}>
            <EmptyState
              icon={<ListTodo className="h-5 w-5" />}
              title="Nada entregue ainda"
              message="Quando o CX validar uma entrega e seguir com o processo, ele aparece aqui, com o histórico."
            />
          </Card>
        ) : (
          <Grupo titulo="Entregues pelo TI" subtitulo="Os que já saíram das etapas do TI, do mais recente para o mais antigo." vazio="">
            {listaEntregues.map((p) => (
              <LinhaDaFila
                key={p.id}
                p={p}
                s={s}
                direita={
                  <>
                    <PilhaDeAvatares nomes={nomesTi(p, s.config)} />
                    <span className="text-[11.5px] text-ink-4">{p.conclusao ? `Concluído em ${formatarData(p.conclusao)}` : 'Com o CX'}</span>
                  </>
                }
              />
            ))}
          </Grupo>
        )
      ) : totalNaFila === 0 ? (
        <Card padded={false}>
          <EmptyState
            icon={<ListTodo className="h-5 w-5" />}
            title="A fila está vazia"
            message="Quando o CX encaminhar um processo ao TI, ele aparece aqui para alguém puxar."
          />
        </Card>
      ) : (
        <div className="space-y-4">
          <Grupo
            titulo="Esperando alguém do TI"
            subtitulo="Ninguém pegou ainda. O que chegou antes vem primeiro."
            vazio="Tudo o que chegou já tem alguém do TI."
          >
            {semNinguem.map((p) => (
              <LinhaDaFila
                key={p.id}
                p={p}
                s={s}
                direita={<span className="font-mono text-[11px] text-ink-4">{naFilaHa(s, p)}</span>}
                acao={
                  <Button size="xs" variant="secondary" icon={<Hand className="h-3.5 w-3.5" />} onClick={() => void puxar(p)} disabled={!meuId}>
                    Puxar para mim
                  </Button>
                }
              />
            ))}
          </Grupo>
          <Grupo titulo="Com você" vazio="Nenhum processo com você. Puxe um da lista acima.">
            {comigo.map((p) => (
              <LinhaDaFila
                key={p.id}
                p={p}
                s={s}
                direita={
                  <>
                    <StatusTiBadge status={p.ti.status} />
                    <Previsao p={p} />
                  </>
                }
              />
            ))}
          </Grupo>
          {comOutros.length > 0 && (
            <Grupo titulo="Com outras pessoas do TI" vazio="">
              {comOutros.map((p) => (
                <LinhaDaFila
                  key={p.id}
                  p={p}
                  s={s}
                  direita={
                    <>
                      <span className="flex items-center gap-2">
                        <StatusTiBadge status={p.ti.status} />
                        <PilhaDeAvatares nomes={nomesTi(p, s.config)} />
                      </span>
                      <Previsao p={p} />
                    </>
                  }
                />
              ))}
            </Grupo>
          )}
        </div>
      )}
    </div>
  );
}
