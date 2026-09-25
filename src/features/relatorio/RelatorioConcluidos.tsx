/**
 * Relatório dos concluídos de um período, para a diretoria: os quatro números
 * com a comparação ao período anterior e a lista do que foi entregue, com o
 * que mudou em cada processo. Folha A4 deitada, pronta para imprimir ou
 * salvar em PDF. O período e os filtros vêm da URL, os mesmos da tela.
 */
import { PaginaDeImpressao, SecaoDaFolha } from '../../app/Impressao';
import { rotas } from '../../app/router';
import { AccentRule } from '../../components/ui/Surfaces';
import { duracaoEmDias, entregueNoPrazo, resumoDaMudanca } from '../../domain/concluidos';
import { nomeDe } from '../../domain/config';
import { nomesResponsaveis, vezesAdiado } from '../../domain/processos';
import { nomesTi } from '../../domain/ti';
import { useIdentidade } from '../../hooks/usePreferencias';
import { useSnapshot } from '../../hooks/useStore';
import { formatarData } from '../../lib/dates';
import { plural } from '../../lib/text';
import { IndicadoresDoPeriodo, resumoDoPeriodo } from '../processos/IndicadoresDoPeriodo';

export function RelatorioConcluidos({ query }: { query: URLSearchParams }) {
  const s = useSnapshot();
  const { pessoa } = useIdentidade();
  const resumo = resumoDoPeriodo(s, query);
  const { intervalo, lista, filtros } = resumo;

  const recortes = [
    filtros.setor && `setor ${nomeDe(s.config.setores, filtros.setor) ?? '—'}`,
    filtros.responsavel && `responsável ${nomeDe(s.config.membros, filtros.responsavel) ?? '—'}`,
  ].filter(Boolean);

  return (
    <PaginaDeImpressao
      paisagem
      voltarPara={rotas.concluidos(Object.fromEntries(query))}
      voltarRotulo="Voltar aos concluídos"
      titulo="Relatório de concluídos"
      autor={pessoa?.nome ?? 'Sem identificação'}
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-[24px] leading-[1.15] font-semibold text-ink">Processos concluídos · {intervalo.rotulo}</h1>
          <AccentRule className="mt-3" />
          <p className="mt-3 text-[12px] text-ink-3">
            De {formatarData(intervalo.inicio)} a {formatarData(intervalo.fim)}
            {recortes.length > 0 && `, só ${recortes.join(' e ')}`}. Comparação com {formatarData(resumo.anterior.inicio)} a{' '}
            {formatarData(resumo.anterior.fim)}.
          </p>
        </div>

        <div className="grid grid-cols-4 gap-8">
          <IndicadoresDoPeriodo resumo={resumo} animar={false} />
        </div>

        <SecaoDaFolha titulo={plural(lista.length, 'processo concluído', 'processos concluídos')}>
          {lista.length === 0 ? (
            <p className="text-[13px] text-ink-3">Nenhum processo concluído neste período.</p>
          ) : (
            <table className="w-full table-fixed text-left">
              <colgroup>
                <col className="w-[64px]" />
                <col />
                <col className="w-[120px]" />
                <col className="w-[150px]" />
                <col className="w-[80px]" />
                <col className="w-[80px]" />
                <col className="w-[64px]" />
                <col className="w-[84px]" />
              </colgroup>
              <thead className="text-[11px] text-ink-4">
                <tr>
                  <th className="py-1 font-medium">Código</th>
                  <th className="py-1 font-medium">Processo e o que mudou</th>
                  <th className="py-1 font-medium">Setor</th>
                  <th className="py-1 font-medium">Responsáveis</th>
                  <th className="py-1 font-medium">Abertura</th>
                  <th className="py-1 font-medium">Conclusão</th>
                  <th className="py-1 font-medium">Duração</th>
                  <th className="py-1 font-medium">No prazo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline text-[12px]">
                {lista.map((p) => {
                  const mudanca = resumoDaMudanca(p, 280);
                  const noPrazo = entregueNoPrazo(p);
                  const adiado = vezesAdiado(p);
                  const ti = nomesTi(p, s.config);
                  return (
                    <tr key={p.id} className="break-inside-avoid align-top">
                      <td className="py-1.5 font-mono text-ink-3">{p.codigo}</td>
                      <td className="py-1.5 pr-3">
                        <p className="font-medium text-ink">{p.titulo}</p>
                        {mudanca && <p className="mt-0.5 leading-relaxed text-ink-3">{mudanca}</p>}
                      </td>
                      <td className="py-1.5 pr-3 text-ink-2">{nomeDe(s.config.setores, p.setorId) ?? '—'}</td>
                      <td className="py-1.5 pr-3 text-ink-2">
                        {nomesResponsaveis(p, s.config).join(', ') || '—'}
                        {ti.length > 0 && <p className="text-ink-4">TI: {ti.join(', ')}</p>}
                      </td>
                      <td className="py-1.5 font-mono text-ink-3">{formatarData(p.abertura)}</td>
                      <td className="py-1.5 font-mono text-ink-2">{formatarData(p.conclusao)}</td>
                      <td className="py-1.5 font-mono text-ink-3">{duracaoEmDias(p) ?? '—'} d</td>
                      <td className="py-1.5 text-ink-2">
                        {noPrazo === null ? 'Sem prazo' : noPrazo ? 'Sim' : 'Não'}
                        {adiado > 0 && <p className="text-ink-4">adiado {plural(adiado, 'vez', 'vezes')}</p>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </SecaoDaFolha>
      </div>
    </PaginaDeImpressao>
  );
}
