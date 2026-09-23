/**
 * Caixa de demandas: o que chegou ao CX e ainda não virou processo.
 *
 * Registrar → avaliar → "Transformar em processo" (entra na primeira etapa
 * com título, setor, origem e descrição já preenchidos) ou "Recusar" com o
 * motivo. Abrir uma demanda abre o painel lateral; a lista continua atrás.
 */
import { useMemo, useState, type FormEvent } from 'react';
import { Inbox, Plus } from 'lucide-react';
import { navegar, rotas } from '../../app/router';
import { Tag } from '../../components/ui/Badges';
import { Button } from '../../components/ui/Button';
import { DateInput } from '../../components/ui/DateInput';
import { Field, SearchInput, Segmented, Select, TextArea, TextInput } from '../../components/ui/Fields';
import { Modal } from '../../components/ui/Overlay';
import { Card, ChevronAffordance, EmptyState, PageHeader, Row } from '../../components/ui/Surfaces';
import { useToast } from '../../components/ui/Toast';
import type { StatusDemanda } from '../../data/types';
import { ativos, nomeDe } from '../../domain/config';
import { ordenarDemandas } from '../../domain/demandas';
import { useSnapshot } from '../../hooks/useStore';
import { formatarData, hoje } from '../../lib/dates';
import { combina } from '../../lib/text';
import { acoesDemanda } from '../../services/acoes';
import { DemandaDrawer } from './DemandaDrawer';
import { StatusDaDemanda } from './StatusDaDemanda';

type Filtro = StatusDemanda | 'todas';

function NovaDemandaModal({ aberto, onFechar }: { aberto: boolean; onFechar: () => void }) {
  const s = useSnapshot();
  const toast = useToast();
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [origemId, setOrigemId] = useState('');
  const [setorId, setSetorId] = useState('');
  const [solicitante, setSolicitante] = useState('');
  const [recebidaEm, setRecebidaEm] = useState<string | null>(hoje());
  const [erro, setErro] = useState<string | null>(null);

  const limpar = () => {
    setTitulo('');
    setDescricao('');
    setOrigemId('');
    setSetorId('');
    setSolicitante('');
    setRecebidaEm(hoje());
    setErro(null);
  };

  const registrar = (e: FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) {
      setErro('Dê um título à demanda.');
      return;
    }
    acoesDemanda.registrar({
      titulo,
      descricao,
      origemId: origemId || null,
      setorId: setorId || null,
      solicitante,
      recebidaEm: recebidaEm ?? hoje(),
    });
    toast({ title: 'Demanda registrada.', description: titulo.trim() });
    limpar();
    onFechar();
  };

  return (
    <Modal
      open={aberto}
      onClose={onFechar}
      size="md"
      icon={<Inbox className="h-4 w-4" />}
      title="Registrar demanda"
      description="O que chegou ao CX. Depois de avaliar, você transforma em processo ou recusa."
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onFechar}>
            Cancelar
          </Button>
          <Button variant="primary" size="sm" type="submit" form="form-nova-demanda">
            Registrar
          </Button>
        </>
      }
    >
      <form id="form-nova-demanda" onSubmit={registrar} className="grid gap-4 px-5 py-5 sm:grid-cols-2">
        <Field label="Título" required error={erro} className="sm:col-span-2">
          {(id) => (
            <TextInput
              id={id}
              data-autofocus
              value={titulo}
              onChange={(e) => {
                setTitulo(e.target.value);
                setErro(null);
              }}
            />
          )}
        </Field>
        <Field label="O que foi pedido" className="sm:col-span-2">
          {(id) => (
            <TextArea
              id={id}
              rows={3}
              value={descricao}
              placeholder="O problema ou o pedido, com as palavras de quem trouxe."
              onChange={(e) => setDescricao(e.target.value)}
            />
          )}
        </Field>
        <Field label="Origem">
          {(id) => (
            <Select id={id} value={origemId} onChange={(e) => setOrigemId(e.target.value)}>
              <option value="">Não informada</option>
              {ativos(s.config.origens).map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nome}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Setor envolvido">
          {(id) => (
            <Select id={id} value={setorId} onChange={(e) => setSetorId(e.target.value)}>
              <option value="">Não informado</option>
              {ativos(s.config.setores).map((x) => (
                <option key={x.id} value={x.id}>
                  {x.nome}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Quem pediu" hint="Opcional">
          {(id) => <TextInput id={id} value={solicitante} placeholder="Nome ou setor" onChange={(e) => setSolicitante(e.target.value)} />}
        </Field>
        <Field label="Recebida em">
          {(id) => <DateInput id={id} value={recebidaEm} onChange={setRecebidaEm} />}
        </Field>
        <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
      </form>
    </Modal>
  );
}

export function DemandasPage({ demandaId }: { demandaId: string | null }) {
  const s = useSnapshot();
  const [filtro, setFiltro] = useState<Filtro>('nova');
  const [busca, setBusca] = useState('');
  const [novaAberta, setNovaAberta] = useState(false);

  const contagem = useMemo(
    () => ({
      nova: s.demandas.filter((d) => d.status === 'nova').length,
      aceita: s.demandas.filter((d) => d.status === 'aceita').length,
      recusada: s.demandas.filter((d) => d.status === 'recusada').length,
    }),
    [s.demandas],
  );

  const lista = useMemo(
    () =>
      ordenarDemandas(
        s.demandas.filter(
          (d) =>
            (filtro === 'todas' || d.status === filtro) &&
            combina(busca, d.titulo, d.descricao, d.solicitante, nomeDe(s.config.setores, d.setorId), nomeDe(s.config.origens, d.origemId)),
        ),
      ),
    [s, filtro, busca],
  );

  const aberta = demandaId ? s.demandas.find((d) => d.id === demandaId) ?? null : null;
  const vazio = s.demandas.length === 0;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Caixa de demandas"
        description="O que chegou ao CX e ainda não virou processo. Registre, avalie e transforme em processo — ou recuse, com o motivo."
        actions={
          <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setNovaAberta(true)}>
            Registrar demanda
          </Button>
        }
      >
        {!vazio && (
          <div className="flex flex-wrap items-center gap-2">
            <Segmented<Filtro>
              layoutId="demandas-filtro"
              label="Mostrar"
              value={filtro}
              onChange={setFiltro}
              items={[
                { value: 'nova', label: 'Novas', count: contagem.nova },
                { value: 'aceita', label: 'Viraram processo', count: contagem.aceita },
                { value: 'recusada', label: 'Recusadas', count: contagem.recusada },
                { value: 'todas', label: 'Todas' },
              ]}
            />
            <SearchInput value={busca} onChange={setBusca} placeholder="Buscar demanda…" className="w-full sm:w-64" />
          </div>
        )}
      </PageHeader>

      {vazio ? (
        <Card padded={false}>
          <EmptyState
            icon={<Inbox className="h-5 w-5" />}
            title="Nenhuma demanda registrada"
            message="Registre aqui o que chegar ao CX — pela ouvidoria, pelo atendimento, pela diretoria — antes de decidir se vira processo."
          />
        </Card>
      ) : lista.length === 0 ? (
        <Card padded={false}>
          <EmptyState
            compact
            title={filtro === 'nova' && !busca ? 'Nenhuma demanda nova' : 'Nada encontrado'}
            message={filtro === 'nova' && !busca ? 'Tudo o que chegou já foi avaliado.' : 'Tente outro filtro ou outra palavra.'}
          />
        </Card>
      ) : (
        <Card padded={false} className="overflow-hidden">
          <ul className="divide-y divide-hairline">
            {lista.map((d) => {
              const origem = nomeDe(s.config.origens, d.origemId);
              const setor = nomeDe(s.config.setores, d.setorId);
              return (
                <li key={d.id}>
                  <Row onClick={() => navegar(rotas.demandas(d.id))} active={aberta?.id === d.id} className="group">
                    <div className="flex items-center gap-4 px-5 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium text-ink">{d.titulo}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] text-ink-4">
                          <span className="font-mono">{formatarData(d.recebidaEm)}</span>
                          {d.solicitante && <span>· {d.solicitante}</span>}
                          {origem && <Tag>{origem}</Tag>}
                          {setor && <Tag>{setor}</Tag>}
                        </div>
                      </div>
                      <StatusDaDemanda demanda={d} s={s} />
                      <ChevronAffordance />
                    </div>
                  </Row>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <NovaDemandaModal aberto={novaAberta} onFechar={() => setNovaAberta(false)} />
      <DemandaDrawer demanda={aberta} s={s} onFechar={() => navegar(rotas.demandas(), { substituir: true })} />
    </div>
  );
}
