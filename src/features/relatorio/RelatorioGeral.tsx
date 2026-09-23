/**
 * Relatório geral para a diretoria: todos os processos ativos, por etapa, com
 * responsável, prazo e há quanto tempo estão parados — e os concluídos no ano.
 * Folha A4 deitada, pronta para imprimir ou salvar em PDF.
 */
import { PaginaDeImpressao, SecaoDaFolha } from '../../app/Impressao';
import { rotas } from '../../app/router';
import { PrazoStatus, SituacaoStatus } from '../../components/domain/StatusProcesso';
import { AccentRule, Metric } from '../../components/ui/Surfaces';
import { nomeDe } from '../../domain/config';
import { resumoPainel } from '../../domain/painel';
import { diasNaEtapa, estaAtivo, nomesResponsaveis } from '../../domain/processos';
import { ordenarProcessos } from '../../domain/filtros';
import { useIdentidade } from '../../hooks/usePreferencias';
import { useSnapshot } from '../../hooks/useStore';
import { formatarData, hoje } from '../../lib/dates';
import { plural } from '../../lib/text';

export function RelatorioGeral() {
  const s = useSnapshot();
  const { pessoa } = useIdentidade();
  const r = resumoPainel(s);
  const ano = hoje().slice(0, 4);
  const concluidos = s.processos
    .filter((p) => p.situacao === 'concluido' && p.conclusao?.startsWith(ano))
    .sort((a, b) => (b.conclusao ?? '').localeCompare(a.conclusao ?? ''));
  const cancelados = s.processos.filter((p) => p.situacao === 'cancelado').length;

  const grupos = s.config.etapas
    .map((e, i) => ({
      etapa: e,
      indice: i,
      processos: ordenarProcessos(s, s.processos.filter((p) => p.etapaId === e.id && estaAtivo(p))),
    }))
    .filter((g) => g.processos.length > 0);

  return (
    <PaginaDeImpressao
      paisagem
      voltarPara={rotas.processos()}
      voltarRotulo="Voltar aos processos"
      titulo="Relatório de processos"
      autor={pessoa?.nome ?? 'Sem identificação'}
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-[24px] leading-[1.15] font-semibold text-ink">Processos do CX</h1>
          <AccentRule className="mt-3" />
          <p className="mt-3 text-[12px] text-ink-3">Situação em {formatarData(hoje())}.</p>
        </div>

        <div className="flex flex-wrap gap-x-12 gap-y-4">
          <Metric value={r.ativos.length} label="Processos ativos" />
          <Metric value={r.vencidos.length} label="Com prazo vencido" tone={r.vencidos.length ? 'crit' : 'default'} />
          <Metric value={r.aguardandoDiretoria.length} label="Aguardando a diretoria" tone="brand" />
          <Metric value={r.comTi.length} label="Com o TI" />
          <Metric value={r.concluidosNoAno} label={`Concluídos em ${ano}`} />
        </div>

        {grupos.length === 0 ? (
          <p className="text-[13px] text-ink-3">Nenhum processo ativo no momento.</p>
        ) : (
          grupos.map((g) => (
            <SecaoDaFolha key={g.etapa.id} titulo={`${g.indice + 1}. ${g.etapa.nome} · ${plural(g.processos.length, 'processo', 'processos')}`}>
              <table className="w-full table-fixed text-left">
                <colgroup>
                  <col className="w-[72px]" />
                  <col />
                  <col className="w-[150px]" />
                  <col className="w-[170px]" />
                  <col className="w-[130px]" />
                  <col className="w-[96px]" />
                  <col className="w-[104px]" />
                </colgroup>
                <thead className="text-[11px] text-ink-4">
                  <tr>
                    <th className="py-1 font-medium">Código</th>
                    <th className="py-1 font-medium">Processo</th>
                    <th className="py-1 font-medium">Setor</th>
                    <th className="py-1 font-medium">Responsáveis</th>
                    <th className="py-1 font-medium">Prazo</th>
                    <th className="py-1 font-medium">Na etapa</th>
                    <th className="py-1 font-medium">Situação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline text-[12px]">
                  {g.processos.map((p) => (
                    <tr key={p.id} className="break-inside-avoid align-top">
                      <td className="py-1.5 font-mono text-ink-3">{p.codigo}</td>
                      <td className="py-1.5 pr-3 font-medium text-ink">{p.titulo}</td>
                      <td className="py-1.5 pr-3 text-ink-2">{nomeDe(s.config.setores, p.setorId) ?? '—'}</td>
                      <td className="py-1.5 pr-3 text-ink-2">{nomesResponsaveis(p, s.config).join(', ') || '—'}</td>
                      <td className="py-1.5">
                        <PrazoStatus processo={p} />
                      </td>
                      <td className="py-1.5 font-mono text-ink-3">{plural(diasNaEtapa(p) ?? 0, 'dia', 'dias')}</td>
                      <td className="py-1.5">
                        <SituacaoStatus situacao={p.situacao} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </SecaoDaFolha>
          ))
        )}

        {concluidos.length > 0 && (
          <SecaoDaFolha titulo={`Concluídos em ${ano}`}>
            <ul className="divide-y divide-hairline text-[12px]">
              {concluidos.map((p) => (
                <li key={p.id} className="flex items-baseline gap-3 py-1.5">
                  <span className="w-[72px] shrink-0 font-mono text-ink-3">{p.codigo}</span>
                  <span className="flex-1 font-medium text-ink">{p.titulo}</span>
                  <span className="font-mono text-ink-3">{formatarData(p.conclusao)}</span>
                </li>
              ))}
            </ul>
          </SecaoDaFolha>
        )}

        {cancelados > 0 && (
          <p className="text-[11.5px] text-ink-4">{plural(cancelados, 'processo cancelado não aparece', 'processos cancelados não aparecem')} neste relatório.</p>
        )}
      </div>
    </PaginaDeImpressao>
  );
}
