import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

interface OpcoesDraft {
  value: string;
  /** Grava o valor. Devolver `false` recusa (ex.: nome repetido): o campo volta ao valor salvo ao sair. */
  onCommit: (valor: string) => void | boolean;
  /**
   * Milissegundos parado até salvar sozinho. `null` salva só ao sair do campo
   * ou apertar Enter — use para campos com validação (nomes), para não
   * reclamar enquanto a pessoa ainda está digitando.
   */
  delay?: number | null;
  /** Vazio não é aceito: ao sair, volta ao valor salvo. */
  required?: boolean;
}

/**
 * Rascunho local de um campo com salvamento automático.
 *
 * Enquanto a pessoa digita, o campo mostra o rascunho; o valor salvo que chega
 * de fora não atropela o que ela está escrevendo. Salva após `delay` parado,
 * ao sair do campo e ao desmontar (trocar de tela no meio da digitação não
 * perde nada).
 */
export function useDraft({ value, onCommit, delay = 600, required = false }: OpcoesDraft) {
  const [draft, setDraft] = useState(value);
  const editando = useRef(false);
  const timer = useRef<number | undefined>(undefined);
  const pendente = useRef(false);
  const atual = useRef({ value, onCommit, draft, required });

  useLayoutEffect(() => {
    atual.current = { value, onCommit, draft, required };
  });

  useEffect(() => {
    if (!editando.current) setDraft(value);
  }, [value]);

  const commit = useCallback((valor: string): boolean => {
    window.clearTimeout(timer.current);
    pendente.current = false;
    const { value: salvo, onCommit: gravar, required: obrigatorio } = atual.current;
    if (obrigatorio && !valor.trim()) return false;
    if (valor === salvo) return true;
    return gravar(valor) !== false;
  }, []);

  useEffect(
    () => () => {
      if (pendente.current) commit(atual.current.draft);
    },
    [commit],
  );

  const onChange = (valor: string) => {
    setDraft(valor);
    window.clearTimeout(timer.current);
    pendente.current = true;
    if (delay !== null) timer.current = window.setTimeout(() => commit(valor), delay);
  };

  const onFocus = () => {
    editando.current = true;
  };

  const onBlur = () => {
    editando.current = false;
    if (!commit(atual.current.draft)) setDraft(atual.current.value);
  };

  /** Escape: descarta o rascunho. */
  const cancelar = () => {
    window.clearTimeout(timer.current);
    pendente.current = false;
    // Atualiza já o ref: o blur que costuma vir logo depois lê daqui, antes do re-render.
    atual.current.draft = atual.current.value;
    setDraft(atual.current.value);
  };

  return { draft, onChange, onFocus, onBlur, cancelar };
}
