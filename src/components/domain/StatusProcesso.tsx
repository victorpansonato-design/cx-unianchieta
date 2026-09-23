/**
 * Vocabulário de status do processo (DESIGN_SYSTEM §12).
 *
 * - Situação: "Em andamento" e "Concluído" são o estado saudável → só a
 *   palavra, sem ponto. "Pausado" ganha âmbar; "Cancelado", o ponto apagado.
 * - Prazo vencido: status crítico, enfatizado, em vermelho.
 * - Prioridade, a pedido da equipe: Alta em vermelho (enfatizada), Média com
 *   ponto amarelo, Baixa com ponto cinza. O grau vem da ordem da lista.
 * - Impacto: só o nível mais alto ganha ponto âmbar.
 */
import { Status } from '../ui/Badges';
import type { Config, ItemLista, Processo, Situacao } from '../../data/types';
import { ehNivelMaisAlto, grauDoNivel, nomeDe } from '../../domain/config';
import { diasDeAtraso, estaVencido, infoSituacao } from '../../domain/processos';
import { formatarData, formatarDataCurta } from '../../lib/dates';
import { cn } from '../../lib/cn';
import { plural } from '../../lib/text';

export function SituacaoStatus({ situacao }: { situacao: Situacao }) {
  const nome = infoSituacao(situacao).nome;
  if (situacao === 'pausado') return <Status tone="warn">{nome}</Status>;
  if (situacao === 'cancelado') return <Status tone="muted">{nome}</Status>;
  return <Status tone="quiet">{nome}</Status>;
}

/** Prazo do processo: vencido em vermelho (com a palavra), senão a data quieta. */
export function PrazoStatus({
  processo,
  curto = false,
  className,
}: {
  processo: Processo;
  /** dd/mm em vez de dd/mm/aaaa (cards). */
  curto?: boolean;
  className?: string;
}) {
  if (!processo.prazo) {
    return <span className={cn('text-[12px] text-ink-4', className)}>Sem prazo</span>;
  }
  if (estaVencido(processo)) {
    const dias = diasDeAtraso(processo);
    return (
      <Status tone="crit" solid className={className} title={`Prazo: ${formatarData(processo.prazo)}`}>
        {curto ? `Venceu ${formatarDataCurta(processo.prazo)}` : `Vencido há ${plural(dias, 'dia', 'dias')}`}
      </Status>
    );
  }
  return (
    <span className={cn('font-mono text-[12px] text-ink-2', className)} title="Prazo previsto">
      {curto ? formatarDataCurta(processo.prazo) : formatarData(processo.prazo)}
    </span>
  );
}

export function NivelStatus({ lista, id, vazio = '—' }: { lista: ItemLista[]; id: string | null; vazio?: string }) {
  const nome = nomeDe(lista, id);
  if (!nome) return <span className="text-[12px] text-ink-4">{vazio}</span>;
  if (ehNivelMaisAlto(lista, id)) return <Status tone="warn" solid>{nome}</Status>;
  return <Status tone="quiet">{nome}</Status>;
}

const TOM_PRIORIDADE = {
  alto: { tone: 'crit', solid: true },
  medio: { tone: 'accent', solid: false },
  baixo: { tone: 'neutral', solid: false },
} as const;

/** Prioridade com a cor do grau: Alta vermelha, Média amarela, Baixa cinza. */
export function PrioridadeStatus({ lista, id, vazio = '—' }: { lista: ItemLista[]; id: string | null; vazio?: string }) {
  const nome = nomeDe(lista, id);
  if (!nome) return <span className="text-[12px] text-ink-4">{vazio}</span>;
  const grau = grauDoNivel(lista, id);
  if (!grau) return <Status tone="quiet">{nome}</Status>;
  const { tone, solid } = TOM_PRIORIDADE[grau];
  return (
    <Status tone={tone} solid={solid}>
      {nome}
    </Status>
  );
}

/** "há 12 dias nesta etapa" — só para processos ativos. */
export function DiasNaEtapa({ dias, curto = false }: { dias: number | null; curto?: boolean }) {
  if (dias === null) return null;
  const texto =
    dias === 0 ? (curto ? 'entrou hoje' : 'Entrou hoje nesta etapa') : curto ? `há ${dias} d na etapa` : `Há ${plural(dias, 'dia', 'dias')} nesta etapa`;
  return (
    <span className="font-mono text-[11px] whitespace-nowrap text-ink-4" title="Tempo na etapa atual">
      {texto}
    </span>
  );
}

/** Nome do setor ou "Sem setor". */
export function nomeSetor(config: Config, id: string | null) {
  return nomeDe(config.setores, id) ?? 'Sem setor';
}
