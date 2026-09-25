/**
 * Um processo visto pelo TI.
 *
 * À esquerda, o que o CX pede (só leitura: problema, fluxo proposto,
 * protótipo, arquivos), a entrega do TI (link e arquivos) e os retornos. À
 * direita, o lado do TI — quem está com o processo, status e previsão — e o
 * contexto do CX (etapa, prazo, responsáveis).
 *
 * A ação principal muda com o momento: puxar quando ninguém pegou; marcar
 * como pronto para validar quando está com você. O TI nunca muda a etapa: é o
 * CX quem confere a entrega e segue com o processo.
 */
import { useState, type FormEvent, type ReactNode } from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  CheckCheck,
  ExternalLink,
  FileText,
  GraduationCap,
  Hand,
  LogOut,
  MoreHorizontal,
  RotateCcw,
  Send,
  TriangleAlert,
} from 'lucide-react';
import { NaoEncontrada } from '../../app/NaoEncontrada';
import { rotas } from '../../app/router';
import { AreaDeArquivos, LinhaDeAnexo, VisualizadorAnexo } from '../../components/domain/Anexos';
import { PilhaDeAvatares } from '../../components/domain/Pessoas';
import { NivelStatus, PrazoStatus, PrioridadeStatus } from '../../components/domain/StatusProcesso';
import { StatusTiBadge } from '../../components/domain/StatusTi';
import { Tag } from '../../components/ui/Badges';
import { Button } from '../../components/ui/Button';
import { DateInput } from '../../components/ui/DateInput';
import { InlineText, TextArea } from '../../components/ui/Fields';
import { Menu, useConfirm } from '../../components/ui/Overlay';
import { SeletorInline } from '../../components/ui/SeletorInline';
import { AccentRule, Callout, Card, CardHeader } from '../../components/ui/Surfaces';
import { useToast } from '../../components/ui/Toast';
import type { Anexo, Processo, Snapshot, StatusTi } from '../../data/types';
import { NOME_TIPO, ordenarAndamentos } from '../../domain/andamentos';
import { anexosDoProcesso } from '../../domain/anexos';
import { nomeDe } from '../../domain/config';
import { etapaDe, nomesResponsaveis, processoPorCodigo } from '../../domain/processos';
import { estaComTi, nomesTi } from '../../domain/ti';
import { useIdentidade } from '../../hooks/usePreferencias';
import { useSnapshot } from '../../hooks/useStore';
import { cn } from '../../lib/cn';
import { agoraISO, formatarMomento } from '../../lib/dates';
import { linkSeguro } from '../../lib/links';
import { press } from '../../lib/motion';
import { acoesAndamento, acoesAnexo, acoesTi } from '../../services/acoes';
import { FluxoDiagrama } from '../fluxo/FluxoDiagrama';

function Campo({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[112px_minmax(0,1fr)] items-center gap-2 py-1">
      <dt className="text-[12px] text-ink-3">{rotulo}</dt>
      <dd className="min-w-0 text-[13px] text-ink">{children}</dd>
    </div>
  );
}

/** Um texto do CX, só leitura. Some quando está vazio. */
function Trecho({ rotulo, icone, texto }: { rotulo: string; icone?: ReactNode; texto: string }) {
  if (!texto.trim()) return null;
  return (
    <div className="min-w-0">
      <p className="mb-1 flex items-center gap-1.5 text-[12px] font-semibold text-ink-3">
        {icone && <span className="text-ink-4">{icone}</span>}
        {rotulo}
      </p>
      <p className="text-[13px] leading-relaxed whitespace-pre-line text-ink-2">{texto}</p>
    </div>
  );
}

function LinkExterno({ href, children }: { href: string; children: ReactNode }) {
  return (
    <motion.a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      whileTap={press}
      className="inline-flex max-w-full items-center gap-1.5 text-[13px] font-medium text-ink transition-colors hover:text-ink-2"
    >
      <ExternalLink className="h-3.5 w-3.5 shrink-0 text-ink-4" />
      <span className="truncate">{children}</span>
    </motion.a>
  );
}

function OQueOCxPede({ p, s, onVer }: { p: Processo; s: Snapshot; onVer: (a: Anexo) => void }) {
  const prototipo = linkSeguro(p.depois.prototipoUrl);
  const arquivos = anexosDoProcesso(s, p.id).filter((a) => a.contexto !== 'ti');
  const temTexto =
    [p.problema.descricao, p.problema.dores, p.problema.efeitoAluno, p.depois.observacoes, p.lyceum].some((t) => t.trim()) ||
    p.depois.passos.length > 0 ||
    prototipo;
  const responsaveis = nomesResponsaveis(p, s.config);

  return (
    <Card padded={false}>
      <CardHeader className="px-5 pt-5 pb-3" title="O que o CX pede" subtitle="Escrito pela equipe CX. Para mudar alguma coisa, fale com eles." />
      {!temTexto ? (
        <p className="px-5 pb-5 text-[12px] leading-relaxed text-ink-3">
          O CX ainda não descreveu o pedido aqui.{responsaveis.length ? ` Quem cuida do processo: ${responsaveis.join(', ')}.` : ''}
        </p>
      ) : (
        <div className="space-y-4 px-5 pb-5">
          <Trecho rotulo="O que acontece" icone={<FileText className="h-3.5 w-3.5" />} texto={p.problema.descricao} />
          <Trecho rotulo="Dores observadas" icone={<TriangleAlert className="h-3.5 w-3.5" />} texto={p.problema.dores} />
          <Trecho rotulo="Efeito no aluno" icone={<GraduationCap className="h-3.5 w-3.5" />} texto={p.problema.efeitoAluno} />
          {p.depois.passos.length > 0 && (
            <div>
              <p className="mb-2 text-[12px] font-semibold text-ink-3">Fluxo proposto</p>
              <FluxoDiagrama passos={p.depois.passos} />
            </div>
          )}
          <Trecho rotulo="Observações da proposta" texto={p.depois.observacoes} />
          {prototipo && (
            <div>
              <p className="mb-1 text-[12px] font-semibold text-ink-3">Protótipo do CX</p>
              <LinkExterno href={prototipo}>{prototipo}</LinkExterno>
            </div>
          )}
          <Trecho rotulo="Lyceum" texto={p.lyceum} />
        </div>
      )}
      {arquivos.length > 0 && (
        <div className="border-t border-hairline">
          <p className="px-5 pt-3 text-[12px] font-semibold text-ink-3">Arquivos do CX</p>
          <ul className="divide-y divide-hairline px-5">
            {arquivos.map((a) => (
              <li key={a.id} className="py-2.5">
                <LinhaDeAnexo anexo={a} onVer={onVer} podeRemover={false} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

function Entrega({ p, s, onVer }: { p: Processo; s: Snapshot; onVer: (a: Anexo) => void }) {
  const toast = useToast();
  const arquivos = anexosDoProcesso(s, p.id, 'ti');
  const link = linkSeguro(p.ti.link);

  const anexar = async (lista: File[]) => {
    try {
      await acoesAnexo.anexar(p.id, lista, 'ti');
      toast({ title: lista.length > 1 ? `${lista.length} arquivos anexados.` : 'Arquivo anexado.' });
    } catch (e) {
      toast({ title: 'Não foi possível anexar.', description: e instanceof Error ? e.message : undefined, tone: 'crit' });
    }
  };

  return (
    <Card padded={false}>
      <CardHeader
        className="px-5 pt-5 pb-3"
        title="Entrega do TI"
        subtitle="O protótipo, os prints e a documentação. O CX vê tudo isto dentro do processo."
      />
      <div className="space-y-4 px-5 pb-5">
        <div>
          <label htmlFor={`ti-link-${p.id}`} className="mb-1.5 block text-[12px] font-medium text-ink">
            Link do protótipo ou da entrega
          </label>
          <InlineText
            id={`ti-link-${p.id}`}
            variant="filled"
            value={p.ti.link}
            placeholder="https://…"
            aria-label="Link do protótipo ou da entrega"
            onCommit={(v) => void acoesTi.definirLink(p.id, v)}
          />
          {link && (
            <div className="mt-2">
              <LinkExterno href={link}>Abrir o link</LinkExterno>
            </div>
          )}
          {p.ti.link.trim() && !link && (
            <p className="mt-1.5 text-[11.5px] text-ink-4">O link precisa começar com http:// ou https://.</p>
          )}
        </div>
        <AreaDeArquivos compacta onArquivos={anexar} titulo="Anexar arquivos da entrega" descricao="Protótipo, prints, documentação." />
      </div>
      {arquivos.length > 0 && (
        <ul className="divide-y divide-hairline border-t border-hairline px-5">
          {arquivos.map((a) => (
            <li key={a.id} className="py-2.5">
              <LinhaDeAnexo anexo={a} onVer={onVer} mostrarContexto={false} />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function Retornos({ p, s }: { p: Processo; s: Snapshot }) {
  const toast = useToast();
  const [texto, setTexto] = useState('');
  const andamentos = ordenarAndamentos(s.andamentos.filter((a) => a.processoId === p.id));

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    if (!texto.trim()) return;
    acoesAndamento.registrar(p.id, 'retorno-ti', texto, agoraISO());
    setTexto('');
    toast({ title: 'Retorno enviado ao CX.' });
  };

  return (
    <Card padded={false}>
      <CardHeader
        className="px-5 pt-5 pb-3"
        title="Retornos e histórico"
        subtitle="Escreva para o CX o que foi feito, o que falta ou o que precisa de resposta. Fica na linha do tempo do processo."
      />
      <form onSubmit={enviar} className="space-y-2 px-5 pb-4">
        <TextArea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          rows={3}
          aria-label="Retorno ao CX"
          placeholder="Ex.: protótipo pronto no link acima; falta liberar o acesso no Lyceum."
        />
        <div className="flex justify-end">
          <Button type="submit" size="sm" icon={<Send className="h-3.5 w-3.5" />} disabled={!texto.trim()}>
            Enviar retorno
          </Button>
        </div>
      </form>
      {andamentos.length > 0 && (
        <ul className="divide-y divide-hairline border-t border-hairline px-5">
          {andamentos.map((a) => (
            <li key={a.id} className="flex gap-3 py-2.5">
              <span
                aria-hidden="true"
                className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', a.automatico ? 'bg-hairline-strong' : 'bg-ink-2')}
              />
              <div className="min-w-0 flex-1">
                <p className={cn('text-[12px] font-semibold', a.automatico ? 'text-ink-3' : 'text-ink')}>{NOME_TIPO[a.tipo]}</p>
                <p className={cn('mt-0.5 text-[13px] leading-relaxed whitespace-pre-line', a.automatico ? 'text-ink-3' : 'text-ink-2')}>
                  {a.texto}
                </p>
                <p className="mt-0.5 text-[11px] text-ink-4">
                  {a.autor.nome} · {formatarMomento(a.quando)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

const OPCOES_STATUS: Array<{ valor: Exclude<StatusTi, 'fila'>; nome: string }> = [
  { valor: 'desenvolvimento', nome: 'Em desenvolvimento' },
  { valor: 'validar', nome: 'Pronto para validar' },
];

export function ProcessoTiPage({ codigo }: { codigo: string }) {
  const s = useSnapshot();
  const { pessoa } = useIdentidade();
  const toast = useToast();
  const confirmar = useConfirm();
  const [vendo, setVendo] = useState<Anexo | null>(null);
  const p = processoPorCodigo(s, codigo);

  if (!p) {
    return <NaoEncontrada titulo="Processo não encontrado" mensagem={`Não há processo com o código ${codigo}. Ele pode ter sido excluído.`} />;
  }

  const meuId = pessoa?.tipo === 'ti' ? pessoa.id : null;
  const comigo = meuId !== null && p.ti.responsaveisIds.includes(meuId);
  const temAlguem = p.ti.responsaveisIds.length > 0;
  const naFila = estaComTi(s, p);
  const etapa = etapaDe(s.config, p.etapaId);
  const nomes = nomesTi(p, s.config);
  const setor = nomeDe(s.config.setores, p.setorId);

  const puxar = async () => {
    if (!meuId) return;
    await acoesTi.puxar(p.id, meuId);
    toast({ title: `${p.codigo} está com você.`, description: 'O CX já vê o seu nome no processo.' });
  };

  const soltar = async () => {
    if (!meuId) return;
    const ultimo = p.ti.responsaveisIds.length === 1;
    const ok = await confirmar({
      title: ultimo ? 'Devolver o processo para a fila?' : 'Sair do processo?',
      message: ultimo
        ? 'Ele volta para “Esperando alguém do TI”, e o CX deixa de ver o seu nome. A entrega e os retornos continuam no processo.'
        : 'Os colegas do TI continuam com ele. A entrega e os retornos continuam no processo.',
      confirmLabel: ultimo ? 'Devolver para a fila' : 'Sair do processo',
    });
    if (!ok) return;
    await acoesTi.soltar(p.id, meuId);
    toast({ title: ultimo ? `${p.codigo} voltou para a fila.` : `Você saiu de ${p.codigo}.` });
  };

  const marcarStatus = async (status: Exclude<StatusTi, 'fila'>) => {
    await acoesTi.definirStatus(p.id, status);
    if (status === 'validar') toast({ title: 'Marcado como pronto para validar.', description: 'O CX confere e segue com o processo.' });
  };

  const acaoPrincipal = !naFila ? null : !temAlguem ? (
    <Button variant="primary" icon={<Hand className="h-4 w-4" />} onClick={() => void puxar()}>
      Puxar para mim
    </Button>
  ) : !comigo ? (
    <Button variant="secondary" icon={<Hand className="h-4 w-4" />} onClick={() => void puxar()}>
      Entrar também
    </Button>
  ) : p.ti.status === 'desenvolvimento' ? (
    <Button variant="primary" icon={<CheckCheck className="h-4 w-4" />} onClick={() => void marcarStatus('validar')}>
      Marcar como pronto para validar
    </Button>
  ) : (
    <Button variant="secondary" icon={<RotateCcw className="h-4 w-4" />} onClick={() => void marcarStatus('desenvolvimento')}>
      Voltar para desenvolvimento
    </Button>
  );

  return (
    <div className="space-y-5">
      <motion.a
        href={rotas.ti()}
        whileTap={press}
        className="inline-flex items-center gap-1.5 text-[12px] font-medium text-ink-3 transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Fila do TI
      </motion.a>

      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-mono text-[12px] font-medium text-ink-3">{p.codigo}</span>
            {p.prioridadeId && <PrioridadeStatus lista={s.config.prioridades} id={p.prioridadeId} />}
            {naFila && <StatusTiBadge status={p.ti.status} />}
            {setor && <Tag>{setor}</Tag>}
          </div>
          <h1 className="mt-1 text-[24px] leading-[1.15] font-semibold text-ink sm:text-[30px]">{p.titulo}</h1>
          <AccentRule className="mt-3" />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {acaoPrincipal}
          {comigo && (
            <Menu
              label="Mais ações"
              align="end"
              items={[
                {
                  id: 'soltar',
                  label: p.ti.responsaveisIds.length === 1 ? 'Devolver para a fila' : 'Sair do processo',
                  icon: <LogOut className="h-4 w-4" />,
                  onSelect: () => void soltar(),
                },
              ]}
              trigger={(props) => (
                <Button {...props} variant="secondary" square aria-label="Mais ações" icon={<MoreHorizontal className="h-4 w-4" />} />
              )}
            />
          )}
        </div>
      </header>

      {!naFila && (
        <Callout tone="ok" title="Este processo já saiu da fila do TI">
          Agora ele está em “{etapa?.nome ?? '—'}”, com o CX. Dá para consultar tudo e ainda mandar um retorno.
        </Callout>
      )}
      {naFila && comigo && p.ti.status === 'validar' && (
        <Callout tone="info" title="Esperando o CX validar">
          Você marcou a entrega como pronta. O CX confere e segue com o processo. Se precisar mexer de novo, volte para
          desenvolvimento.
        </Callout>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <div className="min-w-0 space-y-4">
          <OQueOCxPede p={p} s={s} onVer={setVendo} />
          <Entrega p={p} s={s} onVer={setVendo} />
          <Retornos p={p} s={s} />
        </div>
        <aside className="lg:sticky lg:top-[94px]">
          <Card padded={false}>
            <h2 className="px-5 pt-4 pb-1 text-[12px] font-semibold text-ink-3">No TI</h2>
            <dl className="px-5 pb-4">
              <Campo rotulo="Com">
                {nomes.length ? (
                  <span className="flex min-w-0 items-center gap-2">
                    <PilhaDeAvatares nomes={nomes} />
                    <span className="truncate">{nomes.length === 1 ? nomes[0] : nomes.join(', ')}</span>
                  </span>
                ) : (
                  <span className="text-ink-4">Ninguém ainda</span>
                )}
              </Campo>
              <Campo rotulo="Status">
                {temAlguem && naFila ? (
                  <SeletorInline<Exclude<StatusTi, 'fila'>>
                    rotulo="Status do TI"
                    valor={p.ti.status === 'fila' ? null : p.ti.status}
                    permitirVazio={false}
                    opcoes={OPCOES_STATUS}
                    renderValor={(o) => <StatusTiBadge status={o.valor} />}
                    onChange={(v) => v && void marcarStatus(v)}
                  />
                ) : (
                  <StatusTiBadge status={p.ti.status} />
                )}
              </Campo>
              <Campo rotulo="Previsão">
                {temAlguem ? (
                  <DateInput
                    variant="inline"
                    aria-label="Previsão de entrega"
                    placeholder="Sem previsão"
                    value={p.ti.previsao}
                    onChange={(v) => void acoesTi.definirPrevisao(p.id, v)}
                  />
                ) : (
                  <span className="text-ink-4">Puxe o processo para informar</span>
                )}
              </Campo>
            </dl>
            <h2 className="border-t border-hairline px-5 pt-4 pb-1 text-[12px] font-semibold text-ink-3">No CX</h2>
            <dl className="px-5 pb-4">
              <Campo rotulo="Etapa">{etapa?.nome ?? '—'}</Campo>
              <Campo rotulo="Prazo">
                <PrazoStatus processo={p} />
              </Campo>
              <Campo rotulo="Responsáveis">
                {nomesResponsaveis(p, s.config).join(', ') || <span className="text-ink-4">Sem responsável</span>}
              </Campo>
              <Campo rotulo="Impacto no aluno">
                <NivelStatus lista={s.config.impactos} id={p.impactoId} />
              </Campo>
            </dl>
          </Card>
        </aside>
      </div>
      <VisualizadorAnexo anexo={vendo} onClose={() => setVendo(null)} />
    </div>
  );
}
