/**
 * Barra de filtros: busca, filtros em pílula e três atalhos de um toque
 * (prazo vencido, aguardando diretoria, com o TI) — os recortes que a equipe e
 * a diretoria mais pedem.
 *
 * Só filtra o que está em aberto: "Concluído" e a última etapa ficam de fora,
 * porque os concluídos têm a página deles.
 */
import { LinkButton } from '../../components/ui/Button';
import { Chip, SearchInput } from '../../components/ui/Fields';
import { FiltroMenu } from '../../components/ui/FiltroMenu';
import type { Config } from '../../data/types';
import { ativos } from '../../domain/config';
import { contarFiltrosAtivos, FILTROS_VAZIOS, type FiltroRapido, type FiltrosProcessos } from '../../domain/filtros';
import { SITUACOES } from '../../domain/processos';
import { plural } from '../../lib/text';

const RAPIDOS: Array<{ id: FiltroRapido; nome: string }> = [
  { id: 'vencidos', nome: 'Prazo vencido' },
  { id: 'diretoria', nome: 'Aguarda diretoria' },
  { id: 'ti', nome: 'Com o TI' },
];

export function FiltrosBar({
  config,
  filtros,
  onChange,
  total,
  contagensRapidas,
}: {
  config: Config;
  filtros: FiltrosProcessos;
  onChange: (f: FiltrosProcessos) => void;
  total: number;
  contagensRapidas: Record<FiltroRapido, number>;
}) {
  const mudar = (parcial: Partial<FiltrosProcessos>) => onChange({ ...filtros, ...parcial });
  const ativosCount = contarFiltrosAtivos(filtros);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput
          aria-label="Buscar por título, código, setor ou pessoa"
          value={filtros.q}
          onChange={(q) => mudar({ q })}
          placeholder="Buscar processo…"
          className="w-full sm:w-72"
        />
        <FiltroMenu
          rotulo="Etapa"
          todos="Todas"
          valor={filtros.etapa}
          opcoes={config.etapas.slice(0, -1).map((e, i) => ({ valor: e.id, nome: `${i + 1}. ${e.nome}` }))}
          onChange={(etapa) => mudar({ etapa })}
        />
        <FiltroMenu
          rotulo="Situação"
          todos="Todas"
          valor={filtros.situacao}
          opcoes={SITUACOES.filter((s) => s.id !== 'concluido').map((s) => ({ valor: s.id, nome: s.nome }))}
          onChange={(situacao) => mudar({ situacao })}
        />
        <FiltroMenu
          rotulo="Setor"
          valor={filtros.setor}
          opcoes={ativos(config.setores).map((s) => ({ valor: s.id, nome: s.nome }))}
          onChange={(setor) => mudar({ setor })}
        />
        <FiltroMenu
          rotulo="Responsável"
          valor={filtros.responsavel}
          opcoes={ativos(config.membros).map((m) => ({ valor: m.id, nome: m.nome }))}
          onChange={(responsavel) => mudar({ responsavel })}
        />
        <FiltroMenu
          rotulo="Prioridade"
          todos="Todas"
          valor={filtros.prioridade}
          opcoes={ativos(config.prioridades).map((p) => ({ valor: p.id, nome: p.nome }))}
          onChange={(prioridade) => mudar({ prioridade })}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {RAPIDOS.map((r) => (
          <Chip
            key={r.id}
            active={filtros.rapido === r.id}
            tone={r.id === 'vencidos' ? 'crit' : 'default'}
            count={contagensRapidas[r.id]}
            onClick={() => mudar({ rapido: filtros.rapido === r.id ? null : r.id })}
          >
            {r.nome}
          </Chip>
        ))}
        <span className="ml-auto flex items-center gap-3 text-[12px] text-ink-3">
          {plural(total, 'processo', 'processos')}
          {ativosCount > 0 && <LinkButton onClick={() => onChange(FILTROS_VAZIOS)}>Limpar filtros</LinkButton>}
        </span>
      </div>
    </div>
  );
}
