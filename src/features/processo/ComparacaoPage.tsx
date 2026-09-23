/**
 * Antes e depois lado a lado, para projetar na reunião com a diretoria.
 * Sem o menu e o topo do sistema: só o processo. "Tela cheia" esconde até o
 * navegador.
 */
import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, ExternalLink, FileText, Maximize2, Minimize2 } from 'lucide-react';
import { NaoEncontrada } from '../../app/NaoEncontrada';
import { navegar, rotas } from '../../app/router';
import { useUrlDoAnexo, VisualizadorAnexo } from '../../components/domain/Anexos';
import { SituacaoStatus } from '../../components/domain/StatusProcesso';
import { Tag } from '../../components/ui/Badges';
import { Button } from '../../components/ui/Button';
import { AccentRule, Card, CardHeader } from '../../components/ui/Surfaces';
import type { Anexo } from '../../data/types';
import { anexosDoProcesso } from '../../domain/anexos';
import { etapaDe, processoPorCodigo } from '../../domain/processos';
import { useSnapshot } from '../../hooks/useStore';
import { tipoDoArquivo } from '../../lib/files';
import { linkSeguro } from '../../lib/links';
import { press } from '../../lib/motion';
import { FluxoDiagrama } from '../fluxo/FluxoDiagrama';

function PreviaDoDiagrama({ anexo }: { anexo: Anexo }) {
  const { url, faltando } = useUrlDoAnexo(anexo.id);
  const tipo = tipoDoArquivo(anexo.mime, anexo.nome);
  if (faltando) return <p className="rounded-lg bg-surface-2 p-6 text-center text-[12px] text-ink-3">O arquivo não está neste navegador.</p>;
  if (!url) return <div className="shimmer h-[56vh] rounded-lg" />;
  if (tipo === 'imagem') return <img src={url} alt={anexo.nome} className="max-h-[56vh] w-full rounded-lg bg-surface-2 object-contain" />;
  // Na apresentação, o PDF ocupa a largura e esconde a barra do leitor do navegador.
  return <iframe title={anexo.nome} src={`${url}#toolbar=0&navpanes=0&view=FitH`} className="h-[56vh] w-full rounded-lg bg-surface-2" />;
}

function Texto({ rotulo, valor }: { rotulo: string; valor: string }) {
  if (!valor.trim()) return null;
  return (
    <div>
      <p className="text-[12px] font-medium text-ink-3">{rotulo}</p>
      <p className="mt-1 text-[13px] leading-relaxed whitespace-pre-wrap text-ink-2">{valor}</p>
    </div>
  );
}

export function ComparacaoPage({ codigo }: { codigo: string }) {
  const s = useSnapshot();
  const p = processoPorCodigo(s, codigo);
  const [telaCheia, setTelaCheia] = useState(false);
  const [vendo, setVendo] = useState<Anexo | null>(null);

  useEffect(() => {
    const aoMudar = () => setTelaCheia(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', aoMudar);
    return () => document.removeEventListener('fullscreenchange', aoMudar);
  }, []);

  if (!p) return <div className="p-6"><NaoEncontrada titulo="Processo não encontrado" /></div>;

  const diagrama = anexosDoProcesso(s, p.id, 'antes-diagrama')[0];
  const bpmn = anexosDoProcesso(s, p.id, 'antes-bpmn')[0];
  const etapa = etapaDe(s.config, p.etapaId);
  const prototipo = linkSeguro(p.depois.prototipoUrl);

  const alternarTelaCheia = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen?.().catch(() => undefined);
  };

  return (
    <div className="min-h-screen bg-canvas px-4 py-5 sm:px-8">
      <div className="mx-auto max-w-[1600px] space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <motion.a
            href={rotas.processo(p.codigo, 'antes-e-depois')}
            whileTap={press}
            className="inline-flex items-center gap-1.5 text-[12px] font-medium text-ink-3 transition-colors hover:text-ink"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar ao processo
          </motion.a>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={() => navegar(rotas.resumo(p.codigo))}>
              Resumo para impressão
            </Button>
            {document.fullscreenEnabled && (
              <Button
                size="sm"
                icon={telaCheia ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                onClick={alternarTelaCheia}
              >
                {telaCheia ? 'Sair da tela cheia' : 'Tela cheia'}
              </Button>
            )}
          </div>
        </div>

        <header>
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-mono text-[12px] font-medium text-ink-3">{p.codigo}</span>
            {etapa && <Tag>{etapa.nome}</Tag>}
            <SituacaoStatus situacao={p.situacao} />
          </div>
          <h1 className="mt-1 text-[24px] leading-[1.15] font-semibold text-ink sm:text-[30px]">{p.titulo}</h1>
          <AccentRule className="mt-3" />
          {p.problema.descricao && (
            <p className="mt-3 max-w-3xl text-[13px] leading-relaxed text-ink-3">{p.problema.descricao}</p>
          )}
        </header>

        <div className="grid gap-5 lg:grid-cols-2">
          <Card className="space-y-4">
            <CardHeader eyebrow="Antes" title="Como funciona hoje" />
            {diagrama ? (
              <PreviaDoDiagrama anexo={diagrama} />
            ) : (
              <p className="rounded-lg bg-surface-2 px-4 py-10 text-center text-[12px] text-ink-3">
                Nenhum diagrama anexado. Anexe o PDF na aba “Antes e depois” do processo.
              </p>
            )}
            {bpmn && (
              <Button size="sm" variant="ghost" icon={<FileText className="h-3.5 w-3.5" />} onClick={() => setVendo(bpmn)}>
                Ver o BPMN
              </Button>
            )}
            <Texto rotulo="Como funciona" valor={p.antes.observacoes} />
            <Texto rotulo="Dores observadas" valor={p.problema.dores} />
          </Card>

          <Card className="space-y-4">
            <CardHeader eyebrow="Depois" title="Como vai funcionar" />
            {p.depois.passos.some((x) => x.nome.trim()) ? (
              <FluxoDiagrama passos={p.depois.passos} />
            ) : (
              <p className="rounded-lg bg-surface-2 px-4 py-10 text-center text-[12px] text-ink-3">
                O fluxo proposto ainda não foi montado.
              </p>
            )}
            <Texto rotulo="O que muda" valor={p.depois.observacoes} />
            <Texto rotulo="Efeito esperado para o aluno" valor={p.problema.efeitoAluno} />
            {prototipo && (
              <motion.a
                href={prototipo}
                whileTap={press}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-2 transition-colors hover:text-ink"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Abrir o protótipo
              </motion.a>
            )}
          </Card>
        </div>

        {p.indicadores.length > 0 && (
          <Card>
            <CardHeader title="Indicadores" subtitle="Antes e depois, com a fonte de cada número." />
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[520px] text-left">
                <thead className="text-[11px] text-ink-4">
                  <tr className="border-b border-hairline">
                    <th className="py-2 font-medium">Indicador</th>
                    <th className="py-2 font-medium">Antes</th>
                    <th className="py-2 font-medium">Depois</th>
                    <th className="py-2 font-medium">Fonte</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {p.indicadores.map((i) => (
                    <tr key={i.id}>
                      <td className="py-2.5 text-[13px] font-medium text-ink">{i.nome || '—'}</td>
                      <td className="py-2.5 font-mono text-[15px] text-ink-3">{i.antes || '—'}</td>
                      <td className="py-2.5 font-mono text-[15px] font-medium text-ink">{i.depois || '—'}</td>
                      <td className="py-2.5 text-[12px] text-ink-3">{i.fonte || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
      <VisualizadorAnexo anexo={vendo} onClose={() => setVendo(null)} />
    </div>
  );
}
