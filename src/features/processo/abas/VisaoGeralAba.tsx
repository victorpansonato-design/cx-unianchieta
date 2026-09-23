/**
 * Visão geral: o problema (descrição, dores, efeito no aluno) e os
 * indicadores de antes e depois — definidos pela equipe, nunca pré-preenchidos.
 *
 * O texto se lê como texto: os campos são "inline" (sem caixa cinza) e só
 * ganham a superfície no hover e no foco. Três caixas vazias empilhadas
 * pesavam mais do que o conteúdo. As seções do problema se separam por
 * hairline; os indicadores viram tiles "antes → depois", porque o que importa
 * neles é o número, e o número tem de se ler de longe.
 */
import type { ReactNode } from 'react';
import { ArrowRight, FileText, GraduationCap, Plus, Trash2, TriangleAlert } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { InlineText, InlineTextArea } from '../../../components/ui/Fields';
import { useConfirm } from '../../../components/ui/Overlay';
import { Card, CardHeader } from '../../../components/ui/Surfaces';
import type { Indicador, Processo } from '../../../data/types';
import { acoesFluxo, acoesProcesso } from '../../../services/acoes';

function CampoProblema({
  processo,
  campo,
  rotulo,
  placeholder,
  icone,
}: {
  processo: Processo;
  campo: keyof Processo['problema'];
  rotulo: string;
  placeholder: string;
  icone: ReactNode;
}) {
  const id = `problema-${campo}-${processo.id}`;
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-1 flex items-center gap-1.5 text-[12px] font-semibold text-ink-3">
        <span className="text-ink-4">{icone}</span>
        {rotulo}
      </label>
      <InlineTextArea
        id={id}
        variant="inline"
        value={processo.problema[campo]}
        aria-label={rotulo}
        placeholder={placeholder}
        rows={1}
        onCommit={(v) => void acoesProcesso.editar(processo.id, (p) => ({ problema: { ...p.problema, [campo]: v } }))}
        className="text-[13px]"
      />
    </div>
  );
}

function Problema({ processo }: { processo: Processo }) {
  return (
    <Card padded={false}>
      <CardHeader title="Problema" className="px-5 pt-5 pb-3" />
      <div className="px-5 pb-4">
        <CampoProblema
          processo={processo}
          campo="descricao"
          rotulo="O que acontece"
          placeholder="Clique para descrever o que foi identificado, onde e desde quando."
          icone={<FileText className="h-3.5 w-3.5" />}
        />
      </div>
      <div className="grid border-t border-hairline sm:grid-cols-2 sm:divide-x sm:divide-hairline">
        <div className="px-5 py-4">
          <CampoProblema
            processo={processo}
            campo="dores"
            rotulo="Dores observadas"
            placeholder="Clique para anotar o que trava, repete ou gera reclamação."
            icone={<TriangleAlert className="h-3.5 w-3.5" />}
          />
        </div>
        <div className="border-t border-hairline px-5 py-4 sm:border-t-0">
          <CampoProblema
            processo={processo}
            campo="efeitoAluno"
            rotulo="Efeito no aluno"
            placeholder="Clique para anotar como o aluno sente o problema."
            icone={<GraduationCap className="h-3.5 w-3.5" />}
          />
        </div>
      </div>
    </Card>
  );
}

function TileIndicador({
  ind,
  onMudar,
  onRemover,
}: {
  ind: Indicador;
  onMudar: (campo: keyof Omit<Indicador, 'id'>, valor: string) => void;
  onRemover: () => void;
}) {
  const valor = 'font-mono text-[24px] leading-tight font-medium tracking-tight';
  return (
    <li className="flex flex-col rounded-xl bg-surface-2 p-4">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <InlineText
            variant="inset"
            value={ind.nome}
            aria-label="Nome do indicador"
            placeholder="Nome do indicador"
            onCommit={(v) => onMudar('nome', v)}
            className="text-[13px] font-medium"
          />
        </div>
        <Button
          variant="ghost"
          size="xs"
          square
          aria-label={`Remover o indicador ${ind.nome}`}
          icon={<Trash2 className="h-3.5 w-3.5" />}
          onClick={onRemover}
          className="-mt-0.5 -mr-1.5"
        />
      </div>
      <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-3">
        <div className="min-w-0">
          <span className="block text-[11px] font-medium text-ink-4">Antes</span>
          <InlineText
            variant="inset"
            value={ind.antes}
            aria-label={`Valor antes de ${ind.nome}`}
            placeholder="—"
            onCommit={(v) => onMudar('antes', v)}
            className={`${valor} text-ink-3`}
          />
        </div>
        <ArrowRight aria-hidden="true" className="mb-2.5 h-4 w-4 text-ink-4" />
        <div className="min-w-0">
          <span className="block text-[11px] font-medium text-ink-4">Depois</span>
          <InlineText
            variant="inset"
            value={ind.depois}
            aria-label={`Valor depois de ${ind.nome}`}
            placeholder="—"
            onCommit={(v) => onMudar('depois', v)}
            className={valor}
          />
        </div>
      </div>
      <div className="mt-3 border-t border-hairline-strong pt-2">
        <InlineText
          variant="inset"
          value={ind.fonte}
          aria-label={`Fonte de ${ind.nome}`}
          placeholder="De onde vem o número"
          onCommit={(v) => onMudar('fonte', v)}
          className="text-[12px] text-ink-3"
        />
      </div>
    </li>
  );
}

function Indicadores({ processo }: { processo: Processo }) {
  const confirmar = useConfirm();
  const lista = processo.indicadores;

  const salvar = (fn: (l: Indicador[]) => Indicador[]) =>
    void acoesProcesso.editar(processo.id, (p) => ({ indicadores: fn(p.indicadores) }));

  const mudar = (id: string, campo: keyof Omit<Indicador, 'id'>, valor: string) =>
    salvar((l) => l.map((x) => (x.id === id ? { ...x, [campo]: valor } : x)));

  const remover = async (ind: Indicador) => {
    const vazio = !ind.nome && !ind.antes && !ind.depois && !ind.fonte;
    if (!vazio) {
      const ok = await confirmar({
        title: `Remover o indicador “${ind.nome || 'sem nome'}”?`,
        message: 'Os valores de antes e depois dele saem do processo.',
        confirmLabel: 'Remover indicador',
        tone: 'danger',
      });
      if (!ok) return;
    }
    salvar((l) => l.filter((x) => x.id !== ind.id));
  };

  return (
    <Card>
      <CardHeader
        title="Indicadores"
        subtitle="Números para comparar antes e depois da mudança."
        action={
          <Button size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => salvar((l) => [...l, acoesFluxo.novoIndicador()])}>
            Adicionar
          </Button>
        }
      />
      {lista.length === 0 ? (
        <p className="mt-3 text-[12px] leading-relaxed text-ink-4">
          Nenhum indicador ainda. Adicione quando houver um número com fonte, como algo que o setor já mede.
        </p>
      ) : (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {lista.map((ind) => (
            <TileIndicador
              key={ind.id}
              ind={ind}
              onMudar={(campo, valor) => mudar(ind.id, campo, valor)}
              onRemover={() => void remover(ind)}
            />
          ))}
        </ul>
      )}
    </Card>
  );
}

export function VisaoGeralAba({ processo }: { processo: Processo }) {
  return (
    <div className="space-y-4">
      <Problema processo={processo} />
      <Indicadores processo={processo} />
    </div>
  );
}
