/**
 * Tarefas padrão de uma etapa: entram sozinhas no checklist quando um
 * processo chega nela. Começam vazias; é a equipe que escreve o método.
 */
import { useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronDown, ListChecks, Plus, X } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { InlineText, TextInput } from '../../components/ui/Fields';
import { useConfirm } from '../../components/ui/Overlay';
import type { Etapa } from '../../data/types';
import { cn } from '../../lib/cn';
import { collapseVariants, press } from '../../lib/motion';
import { acoesConfig } from '../../services/acoes';

export function TarefasPadrao({ etapa }: { etapa: Etapa }) {
  const confirmar = useConfirm();
  const [aberto, setAberto] = useState(false);
  const [nova, setNova] = useState('');
  const total = etapa.tarefasPadrao.length;

  const adicionar = (e: FormEvent) => {
    e.preventDefault();
    if (!nova.trim()) return;
    acoesConfig.editarTarefasPadrao(etapa.id, (l) => [...l, nova]);
    setNova('');
  };

  return (
    <div>
      <motion.button
        type="button"
        whileTap={press}
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        className="inline-flex items-center gap-1.5 rounded-sm px-1 py-0.5 text-[12px] font-medium text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
      >
        <ListChecks className="h-3.5 w-3.5 text-ink-4" />
        {total ? `${total} tarefa${total > 1 ? 's' : ''} padrão` : 'Tarefas padrão'}
        <ChevronDown className={cn('h-3 w-3 text-ink-4 transition-transform', aberto && 'rotate-180')} />
      </motion.button>
      <AnimatePresence initial={false}>
        {aberto && (
          <motion.div variants={collapseVariants} initial="initial" animate="animate" exit="exit" className="overflow-hidden">
            <div className="mt-2 rounded-lg bg-surface-2 p-3">
              <p className="mb-2 text-[11.5px] leading-relaxed text-ink-3">
                Entram sozinhas no checklist quando um processo chega nesta etapa. Quem avança com alguma aberta recebe um aviso.
              </p>
              {total > 0 && (
                <ul className="mb-2 space-y-0.5">
                  {etapa.tarefasPadrao.map((t, i) => (
                    <li key={`${i}-${t}`} className="flex items-center gap-2">
                      <span className="w-4 shrink-0 text-right font-mono text-[11px] text-ink-4">{i + 1}</span>
                      <InlineText
                        value={t}
                        aria-label={`Tarefa padrão ${i + 1}`}
                        delay={null}
                        onCommit={(v) => {
                          acoesConfig.editarTarefasPadrao(etapa.id, (l) => l.map((x, j) => (j === i ? v : x)));
                        }}
                        className="text-[12.5px]"
                      />
                      <Button
                        variant="ghost"
                        size="xs"
                        square
                        aria-label={`Remover a tarefa padrão ${t}`}
                        icon={<X className="h-3.5 w-3.5" />}
                        onClick={async () => {
                          const ok = await confirmar({
                            title: 'Remover esta tarefa padrão?',
                            message: `“${t}” deixa de entrar nos próximos processos que chegarem a esta etapa. As tarefas já criadas continuam.`,
                            confirmLabel: 'Remover',
                            tone: 'danger',
                          });
                          if (ok) acoesConfig.editarTarefasPadrao(etapa.id, (l) => l.filter((_, j) => j !== i));
                        }}
                      />
                    </li>
                  ))}
                </ul>
              )}
              <form onSubmit={adicionar} className="flex gap-2">
                <TextInput
                  value={nova}
                  onChange={(e) => setNova(e.target.value)}
                  placeholder="Nova tarefa padrão"
                  aria-label={`Nova tarefa padrão para ${etapa.nome}`}
                  className="h-8 bg-surface text-[12.5px]"
                />
                <Button type="submit" size="sm" square aria-label="Adicionar tarefa padrão" icon={<Plus className="h-3.5 w-3.5" />} disabled={!nova.trim()} />
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
