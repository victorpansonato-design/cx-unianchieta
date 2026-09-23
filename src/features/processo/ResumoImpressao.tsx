/**
 * Resumo do processo para levar à diretoria: problema, antes e depois, etapa
 * atual, datas e próximos passos — numa folha limpa, pronta para imprimir ou
 * salvar em PDF.
 */
import { NaoEncontrada } from '../../app/NaoEncontrada';
import { PaginaDeImpressao, SecaoDaFolha } from '../../app/Impressao';
import { rotas } from '../../app/router';
import { EtapaStepper } from '../../components/domain/EtapaStepper';
import { PrazoStatus, SituacaoStatus } from '../../components/domain/StatusProcesso';
import { AccentRule, DataList } from '../../components/ui/Surfaces';
import { nomeDe } from '../../domain/config';
import { anexosDoProcesso, NOME_CONTEXTO } from '../../domain/anexos';
import { etapaDe, nomesResponsaveis, processoPorCodigo, proximaEtapa } from '../../domain/processos';
import { ordenarTarefas, responsavelDaTarefa, tarefaAtrasada } from '../../domain/tarefas';
import { useIdentidade } from '../../hooks/usePreferencias';
import { useSnapshot } from '../../hooks/useStore';
import { cn } from '../../lib/cn';
import { formatarData } from '../../lib/dates';
import { FluxoDiagrama } from '../fluxo/FluxoDiagrama';

function Texto({ rotulo, valor }: { rotulo: string; valor: string }) {
  if (!valor.trim()) return null;
  return (
    <div className="break-inside-avoid">
      <p className="text-[11px] font-medium text-ink-4">{rotulo}</p>
      <p className="mt-0.5 text-[13px] leading-relaxed whitespace-pre-wrap text-ink-2">{valor}</p>
    </div>
  );
}

export function ResumoImpressao({ codigo }: { codigo: string }) {
  const s = useSnapshot();
  const { pessoa } = useIdentidade();
  const p = processoPorCodigo(s, codigo);
  if (!p) return <div className="p-6"><NaoEncontrada titulo="Processo não encontrado" /></div>;

  const { config } = s;
  const etapa = etapaDe(config, p.etapaId);
  const proxima = proximaEtapa(config, p.etapaId);
  const responsaveis = nomesResponsaveis(p, config);
  const abertas = ordenarTarefas(s.tarefas.filter((t) => t.processoId === p.id && !t.concluida));
  const anexosAntes = [...anexosDoProcesso(s, p.id, 'antes-diagrama'), ...anexosDoProcesso(s, p.id, 'antes-bpmn')];
  const temProblema = p.problema.descricao || p.problema.dores || p.problema.efeitoAluno;

  return (
    <PaginaDeImpressao
      voltarPara={rotas.processo(p.codigo)}
      voltarRotulo={`Voltar para ${p.codigo}`}
      titulo="Resumo do processo"
      autor={pessoa?.nome ?? 'Sem identificação'}
    >
      <div className="space-y-6">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-mono text-[12px] font-medium text-ink-3">{p.codigo}</span>
            <SituacaoStatus situacao={p.situacao} />
          </div>
          <h1 className="mt-1 text-[24px] leading-[1.15] font-semibold text-ink">{p.titulo}</h1>
          <AccentRule className="mt-3" />
        </div>

        <DataList
          cols={4}
          items={[
            { label: 'Etapa atual', value: etapa?.nome ?? '—' },
            { label: 'Setor dono', value: nomeDe(config.setores, p.setorId) ?? '—' },
            { label: 'Responsáveis do CX', value: responsaveis.join(', ') || '—' },
            { label: 'Origem', value: nomeDe(config.origens, p.origemId) ?? '—' },
            { label: 'Abertura', value: <span className="font-mono">{formatarData(p.abertura)}</span> },
            { label: 'Prazo previsto', value: <PrazoStatus processo={p} /> },
            { label: 'Conclusão', value: <span className="font-mono">{formatarData(p.conclusao)}</span> },
            {
              label: 'Prioridade · impacto',
              value: `${nomeDe(config.prioridades, p.prioridadeId) ?? '—'} · ${nomeDe(config.impactos, p.impactoId) ?? '—'}`,
            },
          ]}
        />

        <SecaoDaFolha titulo="Etapas">
          <EtapaStepper processo={p} config={config} />
        </SecaoDaFolha>

        {temProblema && (
          <SecaoDaFolha titulo="Problema" className="space-y-3">
            <Texto rotulo="Descrição" valor={p.problema.descricao} />
            <Texto rotulo="Dores observadas" valor={p.problema.dores} />
            <Texto rotulo="Efeito na experiência do aluno" valor={p.problema.efeitoAluno} />
          </SecaoDaFolha>
        )}

        <div className="grid grid-cols-2 gap-6">
          <SecaoDaFolha titulo="Antes · como funciona hoje" className="space-y-3">
            <Texto rotulo="Observações" valor={p.antes.observacoes || 'Sem observações.'} />
            {anexosAntes.length > 0 && (
              <div>
                <p className="text-[11px] font-medium text-ink-4">Arquivos do escritório de processos</p>
                <ul className="mt-0.5 space-y-0.5 text-[12px] text-ink-2">
                  {anexosAntes.map((a) => (
                    <li key={a.id}>
                      {NOME_CONTEXTO[a.contexto]}: {a.nome}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </SecaoDaFolha>
          <SecaoDaFolha titulo="Depois · como vai funcionar" className="space-y-3">
            <Texto
              rotulo="Observações"
              valor={p.depois.observacoes || (p.depois.passos.length ? 'O fluxo proposto está desenhado abaixo.' : 'Ainda sem proposta registrada.')}
            />
            {p.depois.prototipoUrl && <Texto rotulo="Protótipo" valor={p.depois.prototipoUrl} />}
          </SecaoDaFolha>
        </div>

        {p.depois.passos.length > 0 && (
          <SecaoDaFolha titulo="Fluxo proposto">
            <FluxoDiagrama passos={p.depois.passos} />
          </SecaoDaFolha>
        )}

        {p.indicadores.length > 0 && (
          <SecaoDaFolha titulo="Indicadores">
            <table className="w-full text-left text-[12px]">
              <thead className="text-[11px] text-ink-4">
                <tr>
                  <th className="py-1 font-medium">Indicador</th>
                  <th className="py-1 font-medium">Antes</th>
                  <th className="py-1 font-medium">Depois</th>
                  <th className="py-1 font-medium">Fonte</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {p.indicadores.map((i) => (
                  <tr key={i.id}>
                    <td className="py-1.5 font-medium text-ink">{i.nome || '—'}</td>
                    <td className="py-1.5 font-mono text-ink-2">{i.antes || '—'}</td>
                    <td className="py-1.5 font-mono text-ink-2">{i.depois || '—'}</td>
                    <td className="py-1.5 text-ink-3">{i.fonte || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </SecaoDaFolha>
        )}

        <SecaoDaFolha titulo="Próximos passos" className="space-y-2">
          {proxima && p.situacao !== 'concluido' && (
            <p className="text-[13px] text-ink-2">
              Próxima etapa: <span className="font-medium text-ink">{proxima.nome}</span>
            </p>
          )}
          {abertas.length > 0 ? (
            <ul className="divide-y divide-hairline">
              {abertas.map((t) => (
                <li key={t.id} className="flex items-baseline justify-between gap-4 py-1.5 text-[12.5px]">
                  <span className="text-ink">{t.titulo}</span>
                  <span className="shrink-0 text-ink-3">
                    {responsavelDaTarefa(t, config) ?? 'Sem responsável'}
                    {t.prazo && (
                      <span className={cn('ml-2 font-mono', tarefaAtrasada(t) ? 'font-semibold text-crit-ink' : 'text-ink-2')}>
                        {formatarData(t.prazo)}
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[12.5px] text-ink-3">Nenhuma tarefa aberta.</p>
          )}
        </SecaoDaFolha>
      </div>
    </PaginaDeImpressao>
  );
}
