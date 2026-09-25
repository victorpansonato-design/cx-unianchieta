/**
 * Lista de processos: uma linha por processo, colunas que alinham para varrer
 * com o olho. Vencido ganha o trilho vermelho de 2px à esquerda, nunca a linha
 * inteira tingida.
 */
import { rotas } from '../../app/router';
import { DiasNaEtapa, PrazoStatus, PrioridadeStatus, SituacaoStatus } from '../../components/domain/StatusProcesso';
import { PilhaDeAvatares } from '../../components/domain/Pessoas';
import { LinhaTi } from '../../components/domain/StatusTi';
import { Tag } from '../../components/ui/Badges';
import { Card, ChevronAffordance, Row } from '../../components/ui/Surfaces';
import type { Processo, Snapshot } from '../../data/types';
import { nomeDe } from '../../domain/config';
import { diasNaEtapa, estaVencido, etapaDe, nomesResponsaveis } from '../../domain/processos';
import { estaComTi } from '../../domain/ti';

const GRADE = 'lg:grid lg:grid-cols-[minmax(0,1fr)_200px_96px_150px_120px_16px] lg:items-center lg:gap-4';

export function ListaView({ processos, s }: { processos: Processo[]; s: Snapshot }) {
  return (
    <Card padded={false} className="overflow-hidden">
      <div className={`hidden border-b border-hairline px-5 py-2.5 text-[11px] font-medium text-ink-4 ${GRADE}`}>
        <span>Processo</span>
        <span>Etapa</span>
        <span>Responsáveis</span>
        <span>Prazo</span>
        <span>Situação</span>
        <span />
      </div>
      <ul className="divide-y divide-hairline">
        {processos.map((p) => {
          const setor = nomeDe(s.config.setores, p.setorId);
          const etapa = etapaDe(s.config, p.etapaId);
          return (
            <li key={p.id}>
              <Row href={rotas.processo(p.codigo)} tone={estaVencido(p) ? 'crit' : 'default'} className="group">
                <div className={`flex flex-col gap-2 px-5 py-3 ${GRADE}`}>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] text-ink-4">{p.codigo}</span>
                      {p.prioridadeId && <PrioridadeStatus lista={s.config.prioridades} id={p.prioridadeId} />}
                    </div>
                    <p className="mt-0.5 truncate text-[13px] font-medium text-ink">{p.titulo}</p>
                    {(setor || p.tags.length > 0) && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {setor && <Tag>{setor}</Tag>}
                        {p.tags.slice(0, 3).map((t) => (
                          <Tag key={t}>{t}</Tag>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-medium text-ink-2">{etapa?.nome ?? '—'}</p>
                    {estaComTi(s, p) ? <LinhaTi processo={p} config={s.config} /> : <DiasNaEtapa dias={diasNaEtapa(p)} curto />}
                  </div>
                  <div>
                    {p.responsaveisIds.length ? (
                      <PilhaDeAvatares nomes={nomesResponsaveis(p, s.config)} />
                    ) : (
                      <span className="text-[12px] text-ink-4">Sem responsável</span>
                    )}
                  </div>
                  <div>
                    <PrazoStatus processo={p} />
                  </div>
                  <div>
                    <SituacaoStatus situacao={p.situacao} />
                  </div>
                  <ChevronAffordance className="hidden lg:block" />
                </div>
              </Row>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
