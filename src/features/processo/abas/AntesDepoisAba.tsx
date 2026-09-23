/**
 * Antes e depois, lado a lado. Antes: os PDFs do diagrama e do BPMN (baixados
 * do escritório de processos e anexados à mão) e como o processo funciona
 * hoje. Depois: o fluxo proposto, desenhado a partir dos passos, o protótipo e
 * os arquivos da proposta.
 */
import { useState } from 'react';
import { motion } from 'motion/react';
import { ExternalLink, Presentation } from 'lucide-react';
import { navegar, rotas } from '../../../app/router';
import { AreaDeArquivos, LinhaDeAnexo, VagaDeAnexo, VisualizadorAnexo } from '../../../components/domain/Anexos';
import { Button } from '../../../components/ui/Button';
import { InlineText, InlineTextArea, Label } from '../../../components/ui/Fields';
import { Card, CardHeader } from '../../../components/ui/Surfaces';
import { useToast } from '../../../components/ui/Toast';
import type { Anexo, Processo, Snapshot } from '../../../data/types';
import { anexosDoProcesso } from '../../../domain/anexos';
import { linkSeguro } from '../../../lib/links';
import { press } from '../../../lib/motion';
import { acoesAnexo, acoesProcesso } from '../../../services/acoes';
import { FluxoDiagrama } from '../../fluxo/FluxoDiagrama';
import { FluxoEditor } from '../../fluxo/FluxoEditor';

export function AntesDepoisAba({ processo: p, s }: { processo: Processo; s: Snapshot }) {
  const toast = useToast();
  const [vendo, setVendo] = useState<Anexo | null>(null);
  const diagrama = anexosDoProcesso(s, p.id, 'antes-diagrama')[0];
  const bpmn = anexosDoProcesso(s, p.id, 'antes-bpmn')[0];
  const anexosDepois = anexosDoProcesso(s, p.id, 'depois');
  const prototipo = linkSeguro(p.depois.prototipoUrl);

  const anexarDepois = async (arquivos: File[]) => {
    try {
      await acoesAnexo.anexar(p.id, arquivos, 'depois');
      toast({ title: arquivos.length > 1 ? `${arquivos.length} arquivos anexados.` : 'Arquivo anexado.' });
    } catch (e) {
      toast({ title: 'Não foi possível anexar.', description: e instanceof Error ? e.message : undefined, tone: 'crit' });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[12px] leading-relaxed text-ink-3">
          Para mostrar à diretoria, abra a comparação lado a lado em tela cheia.
        </p>
        <Button size="sm" icon={<Presentation className="h-3.5 w-3.5" />} onClick={() => navegar(rotas.comparacao(p.codigo))}>
          Apresentar lado a lado
        </Button>
      </div>

      {/* Empilhado: a coluna já divide espaço com o painel de campos. Lado a lado
          de verdade é a comparação em tela cheia ("Apresentar lado a lado"). */}
      <div className="space-y-4">
        <Card className="space-y-5">
          <CardHeader
            eyebrow="Antes"
            title="Cenário atual"
            subtitle="Como o processo funciona hoje. Baixe os PDFs no escritório de processos e anexe aqui."
          />
          <div className="grid gap-4 sm:grid-cols-2">
          <VagaDeAnexo
            processoId={p.id}
            contexto="antes-diagrama"
            titulo="Diagrama do processo"
            descricao="O PDF do diagrama do escritório de processos."
            anexo={diagrama}
            onVer={setVendo}
          />
          <VagaDeAnexo
            processoId={p.id}
            contexto="antes-bpmn"
            titulo="BPMN"
            descricao="O PDF do BPMN do escritório de processos."
            anexo={bpmn}
            onVer={setVendo}
          />
          </div>
          <div>
            <Label htmlFor={`antes-obs-${p.id}`}>Como funciona hoje</Label>
            <InlineTextArea
              id={`antes-obs-${p.id}`}
              value={p.antes.observacoes}
              aria-label="Como o processo funciona hoje"
              placeholder="Quem faz o quê, onde trava, o que o aluno precisa fazer."
              onCommit={(v) => void acoesProcesso.editar(p.id, (x) => ({ antes: { ...x.antes, observacoes: v } }))}
              className="min-h-24 text-[13px]"
            />
          </div>
        </Card>

        <Card className="space-y-5">
          <CardHeader
            eyebrow="Depois"
            title="Cenário proposto"
            subtitle="O fluxo que o CX propõe. Monte os passos em sequência; o desenho se atualiza sozinho."
          />
          <FluxoDiagrama passos={p.depois.passos} className="pb-1" />
          <FluxoEditor processo={p} s={s} />

          <div>
            <Label htmlFor={`prototipo-${p.id}`}>Protótipo</Label>
            <div className="flex items-center gap-2">
              <InlineText
                id={`prototipo-${p.id}`}
                variant="filled"
                value={p.depois.prototipoUrl}
                aria-label="Link do protótipo"
                placeholder="https://…"
                onCommit={(v) => void acoesProcesso.editar(p.id, (x) => ({ depois: { ...x.depois, prototipoUrl: v.trim() } }))}
                className="font-mono text-[12.5px]"
              />
              {prototipo && (
                <motion.a
                  href={prototipo}
                  whileTap={press}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-surface-2 px-3.5 text-[13px] font-medium text-ink transition-colors hover:bg-surface-3"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Abrir
                </motion.a>
              )}
            </div>
          </div>

          <div>
            <Label>Arquivos da proposta</Label>
            {anexosDepois.length > 0 && (
              <ul className="mb-3 divide-y divide-hairline">
                {anexosDepois.map((a) => (
                  <li key={a.id} className="py-2">
                    <LinhaDeAnexo anexo={a} onVer={setVendo} mostrarContexto={false} />
                  </li>
                ))}
              </ul>
            )}
            <AreaDeArquivos compacta titulo="Anexar à proposta" descricao="Telas, documentos, apresentações." onArquivos={anexarDepois} />
          </div>

          <div>
            <Label htmlFor={`depois-obs-${p.id}`}>Observações</Label>
            <InlineTextArea
              id={`depois-obs-${p.id}`}
              value={p.depois.observacoes}
              aria-label="Observações do cenário proposto"
              placeholder="O que muda para o aluno e para o setor."
              onCommit={(v) => void acoesProcesso.editar(p.id, (x) => ({ depois: { ...x.depois, observacoes: v } }))}
              className="min-h-20 text-[13px]"
            />
          </div>
        </Card>
      </div>
      <VisualizadorAnexo anexo={vendo} onClose={() => setVendo(null)} />
    </div>
  );
}
