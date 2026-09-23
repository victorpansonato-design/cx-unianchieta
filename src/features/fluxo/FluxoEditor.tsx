/**
 * Construtor do fluxo proposto: passos em sequência, cada um com nome,
 * responsável e sistema. Nada de BPMN — qualquer pessoa monta. O desenho
 * (FluxoDiagrama) se atualiza enquanto se digita.
 */
import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowDown, ArrowUp, Plus, Trash2, Workflow } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { InlineText } from '../../components/ui/Fields';
import { useConfirm } from '../../components/ui/Overlay';
import type { PassoFluxo, Processo, Snapshot } from '../../data/types';
import { spring } from '../../lib/motion';
import { normalizar } from '../../lib/text';
import { acoesFluxo, acoesProcesso } from '../../services/acoes';

/** Sugestões de sistema: o Lyceum (citado pela equipe) e o que já foi usado em outros fluxos. */
function sugestoesDeSistema(s: Snapshot): string[] {
  const vistos = new Map<string, string>([['lyceum', 'Lyceum']]);
  for (const p of s.processos) {
    for (const passo of p.depois.passos) {
      const nome = passo.sistema.trim();
      if (nome && !vistos.has(normalizar(nome))) vistos.set(normalizar(nome), nome);
    }
  }
  return [...vistos.values()];
}

export function FluxoEditor({ processo, s }: { processo: Processo; s: Snapshot }) {
  const confirmar = useConfirm();
  const [novoId, setNovoId] = useState<string | null>(null);
  const passos = processo.depois.passos;
  const sugestoes = useMemo(() => sugestoesDeSistema(s), [s]);
  const listaId = `sistemas-${processo.id}`;

  const salvar = (fn: (passos: PassoFluxo[]) => PassoFluxo[]) =>
    acoesProcesso.editar(processo.id, (p) => ({ depois: { ...p.depois, passos: fn(p.depois.passos) } }));

  const mudar = (id: string, campo: keyof Omit<PassoFluxo, 'id'>, valor: string) =>
    void salvar((lista) => lista.map((x) => (x.id === id ? { ...x, [campo]: valor } : x)));

  const mover = (i: number, direcao: -1 | 1) =>
    void salvar((lista) => {
      const j = i + direcao;
      if (j < 0 || j >= lista.length) return lista;
      const copia = lista.slice();
      [copia[i], copia[j]] = [copia[j], copia[i]];
      return copia;
    });

  const adicionar = () => {
    const passo = acoesFluxo.novoPasso();
    setNovoId(passo.id);
    void salvar((lista) => [...lista, passo]);
  };

  const remover = async (passo: PassoFluxo, i: number) => {
    const vazio = !passo.nome.trim() && !passo.responsavel.trim() && !passo.sistema.trim();
    if (!vazio) {
      const ok = await confirmar({
        title: `Remover o passo ${i + 1}?`,
        message: `“${passo.nome || 'Passo sem nome'}” sai do fluxo proposto.`,
        confirmLabel: 'Remover passo',
        tone: 'danger',
      });
      if (!ok) return;
    }
    void salvar((lista) => lista.filter((x) => x.id !== passo.id));
  };

  return (
    <div>
      {passos.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl bg-surface-2 px-6 py-8 text-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface text-ink-4">
            <Workflow className="h-5 w-5" />
          </span>
          <p className="text-[13px] font-medium text-ink">Nenhum passo ainda</p>
          <p className="max-w-sm text-[12px] leading-relaxed text-ink-3">
            Monte o fluxo proposto passo a passo: o que acontece, quem faz e em qual sistema.
          </p>
          <Button size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={adicionar} className="mt-1">
            Adicionar o primeiro passo
          </Button>
        </div>
      ) : (
        <>
          <div className="hidden grid-cols-[20px_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,0.8fr)_84px] gap-3 px-1 pb-1.5 text-[11px] font-medium text-ink-4 sm:grid">
            <span />
            <span>Passo</span>
            <span>Responsável</span>
            <span>Sistema</span>
            <span />
          </div>
          <ol className="divide-y divide-hairline">
            {passos.map((passo, i) => (
              <motion.li
                key={passo.id}
                layout="position"
                transition={spring}
                className="grid grid-cols-[20px_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 px-1 py-1.5 sm:grid-cols-[20px_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,0.8fr)_84px]"
              >
                <span className="font-mono text-[12px] text-ink-4">{i + 1}</span>
                <InlineText
                  value={passo.nome}
                  aria-label={`Nome do passo ${i + 1}`}
                  placeholder="O que acontece"
                  autoFocus={novoId === passo.id}
                  onCommit={(v) => mudar(passo.id, 'nome', v)}
                  className="text-[13px] font-medium"
                />
                <div className="col-start-2 sm:col-start-auto">
                  <InlineText
                    value={passo.responsavel}
                    aria-label={`Responsável pelo passo ${i + 1}`}
                    placeholder="Quem faz"
                    onCommit={(v) => mudar(passo.id, 'responsavel', v)}
                    className="text-[12.5px] text-ink-2"
                  />
                </div>
                <div className="col-start-2 sm:col-start-auto">
                  <InlineText
                    value={passo.sistema}
                    aria-label={`Sistema usado no passo ${i + 1}`}
                    placeholder="Sistema"
                    lista={listaId}
                    onCommit={(v) => mudar(passo.id, 'sistema', v)}
                    className="text-[12.5px] text-ink-2"
                  />
                </div>
                <div className="col-start-3 row-start-1 flex items-center justify-end gap-0.5 sm:col-start-auto sm:row-start-auto">
                  <Button variant="ghost" size="xs" square aria-label={`Subir o passo ${i + 1}`} disabled={i === 0} icon={<ArrowUp className="h-3.5 w-3.5" />} onClick={() => mover(i, -1)} />
                  <Button variant="ghost" size="xs" square aria-label={`Descer o passo ${i + 1}`} disabled={i === passos.length - 1} icon={<ArrowDown className="h-3.5 w-3.5" />} onClick={() => mover(i, 1)} />
                  <Button variant="ghost" size="xs" square aria-label={`Remover o passo ${i + 1}`} icon={<Trash2 className="h-3.5 w-3.5" />} onClick={() => remover(passo, i)} />
                </div>
              </motion.li>
            ))}
          </ol>
          <div className="mt-2">
            <Button size="sm" variant="ghost" icon={<Plus className="h-3.5 w-3.5" />} onClick={adicionar}>
              Adicionar passo
            </Button>
          </div>
        </>
      )}
      <datalist id={listaId}>
        {sugestoes.map((nome) => (
          <option key={nome} value={nome} />
        ))}
      </datalist>
    </div>
  );
}
