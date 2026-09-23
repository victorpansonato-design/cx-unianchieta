/**
 * Valor editável no lugar (acréscimo do projeto) — o campo do painel lateral
 * do processo, como no Jira: lê como texto; ao clicar, abre o menu de opções.
 * Transparente até o hover, como o InlineText; o menu é o Menu do sistema.
 */
import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/cn';
import { press } from '../../lib/motion';
import { Menu } from './Overlay';

export interface OpcaoInline<T extends string> {
  valor: T;
  nome: string;
  desabilitada?: boolean;
}

export function SeletorInline<T extends string>({
  rotulo,
  valor,
  opcoes,
  onChange,
  vazio = 'Não definido',
  permitirVazio = true,
  renderValor,
  cabecalho,
}: {
  rotulo: string;
  valor: T | null;
  opcoes: OpcaoInline<T>[];
  onChange: (valor: T | null) => void;
  vazio?: string;
  permitirVazio?: boolean;
  /** Como mostrar o valor escolhido (ex.: um Status). Padrão: o nome. */
  renderValor?: (opcao: OpcaoInline<T>) => ReactNode;
  cabecalho?: ReactNode;
}) {
  const escolhida = opcoes.find((o) => o.valor === valor);
  return (
    <Menu
      label={rotulo}
      align="start"
      header={cabecalho}
      items={[
        ...(permitirVazio ? [{ id: '__vazio', label: vazio, selected: !escolhida, onSelect: () => onChange(null) }] : []),
        ...opcoes.map((o) => ({
          id: o.valor,
          label: o.nome,
          selected: o.valor === valor,
          disabled: o.desabilitada,
          onSelect: () => onChange(o.valor),
        })),
      ]}
      trigger={(props) => (
        <motion.button
          type="button"
          whileTap={press}
          {...props}
          aria-label={`${rotulo}: ${escolhida?.nome ?? vazio}. Alterar`}
          className="group -mx-2 flex w-[calc(100%+1rem)] min-w-0 items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-surface-2 aria-expanded:bg-surface-2"
        >
          <span className={cn('min-w-0 truncate text-[13px]', escolhida ? 'font-medium text-ink' : 'text-ink-4')}>
            {escolhida ? (renderValor ? renderValor(escolhida) : escolhida.nome) : vazio}
          </span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-ink-4 opacity-0 transition-opacity group-hover:opacity-100 group-aria-expanded:opacity-100" />
        </motion.button>
      )}
    />
  );
}
