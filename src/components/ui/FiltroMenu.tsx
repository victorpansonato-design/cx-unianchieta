/**
 * Filtro em pílula com menu (acréscimo do projeto): "Setor ▾" → escolhe um.
 *
 * Mesma lógica do Chip: o filtro ativo vira tinta sólida (e mostra o valor
 * escolhido), não azul — o azul é reservado. Cinco selects nativos lado a lado
 * seriam cinco caixas; cinco pílulas quietas leem como uma barra só.
 */
import { motion } from 'motion/react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/cn';
import { press } from '../../lib/motion';
import { Menu } from './Overlay';

export interface OpcaoFiltro<T extends string> {
  valor: T;
  nome: string;
}

export function FiltroMenu<T extends string>({
  rotulo,
  valor,
  opcoes,
  onChange,
  todos = 'Todos',
}: {
  rotulo: string;
  valor: T | null;
  opcoes: OpcaoFiltro<T>[];
  onChange: (valor: T | null) => void;
  todos?: string;
}) {
  const escolhido = opcoes.find((o) => o.valor === valor);
  return (
    <Menu
      label={`Filtrar por ${rotulo.toLowerCase()}`}
      align="start"
      items={[
        { id: '__todos', label: todos, selected: !escolhido, onSelect: () => onChange(null) },
        ...opcoes.map((o) => ({
          id: o.valor,
          label: o.nome,
          selected: o.valor === valor,
          onSelect: () => onChange(o.valor),
        })),
      ]}
      trigger={(props) => (
        <motion.button
          type="button"
          whileTap={press}
          {...props}
          className={cn(
            'inline-flex h-8 max-w-[240px] shrink-0 items-center gap-1.5 rounded-full px-3 text-[12.5px] transition-colors',
            escolhido
              ? 'bg-ink font-semibold text-canvas'
              : 'bg-surface-2 font-medium text-ink-2 hover:bg-surface-3 hover:text-ink',
          )}
        >
          <span className="truncate">{escolhido ? `${rotulo}: ${escolhido.nome}` : rotulo}</span>
          <ChevronDown className={cn('h-3.5 w-3.5 shrink-0', escolhido ? 'opacity-70' : 'text-ink-4')} />
        </motion.button>
      )}
    />
  );
}
