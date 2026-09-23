/**
 * Pessoas: pilha de avatares e seletor de responsáveis.
 *
 * Iniciais, nunca foto (DESIGN_SYSTEM §12). Na pilha, cada avatar ganha um
 * anel da cor da superfície — a mesma separação de 2px que o design usa entre
 * marcas sobrepostas, sem desenhar contorno.
 */
import { useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Check, Plus, Settings, UserRound } from 'lucide-react';
import { navegar, rotas } from '../../app/router';
import type { ID, Membro } from '../../data/types';
import { ativos } from '../../domain/config';
import { cn } from '../../lib/cn';
import { press } from '../../lib/motion';
import { Avatar } from '../ui/Badges';
import { LinkButton } from '../ui/Button';
import { Popover } from '../ui/Overlay';

/** A marca do Checkbox, só visual — a linha inteira é o controle. */
function MarcaVisual({ marcado }: { marcado: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-xs transition-colors',
        marcado ? 'bg-ink text-canvas' : 'bg-surface-3',
      )}
    >
      {marcado && <Check className="h-3 w-3" strokeWidth={3} />}
    </span>
  );
}

export function PilhaDeAvatares({
  nomes,
  max = 3,
  anel = 'ring-surface',
}: {
  nomes: string[];
  max?: number;
  /** Cor do anel = cor da superfície por trás. */
  anel?: 'ring-surface' | 'ring-surface-2' | 'ring-canvas';
}) {
  if (nomes.length === 0) return null;
  const visiveis = nomes.slice(0, max);
  const resto = nomes.length - visiveis.length;
  return (
    <span className="flex items-center -space-x-1.5" title={nomes.join(', ')}>
      {visiveis.map((n, i) => (
        <Avatar key={`${n}-${i}`} nome={n} size="xs" className={cn('ring-2', anel)} />
      ))}
      {resto > 0 && (
        <span
          aria-hidden="true"
          className={cn(
            'inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-surface-3 px-1 font-mono text-[10px] font-medium text-ink-2 ring-2',
            anel,
          )}
        >
          +{resto}
        </span>
      )}
      <span className="sr-only">{nomes.join(', ')}</span>
    </span>
  );
}

/**
 * Escolher vários responsáveis da equipe CX. Lista com marcação; a mudança
 * vale na hora (o processo registra quem entrou e quem saiu nos andamentos).
 */
export function SeletorDePessoas({
  membros,
  selecionados,
  onChange,
  rotulo = 'Responsáveis',
  vazio = 'Adicionar responsável',
  variant = 'inline',
}: {
  membros: Membro[];
  selecionados: ID[];
  onChange: (ids: ID[]) => void;
  rotulo?: string;
  vazio?: string;
  variant?: 'inline' | 'filled';
}) {
  const [aberto, setAberto] = useState(false);
  const ancora = useRef<HTMLButtonElement>(null);
  const disponiveis = ativos(membros);
  // Um responsável arquivado continua aparecendo enquanto estiver no processo.
  const nomes = selecionados
    .map((id) => membros.find((m) => m.id === id)?.nome)
    .filter((n): n is string => Boolean(n));

  const alternar = (id: ID) => {
    onChange(selecionados.includes(id) ? selecionados.filter((x) => x !== id) : [...selecionados, id]);
  };

  return (
    <>
      <motion.button
        ref={ancora}
        type="button"
        whileTap={press}
        aria-haspopup="dialog"
        aria-expanded={aberto}
        aria-label={`${rotulo}: ${nomes.length ? nomes.join(', ') : 'nenhum'}. Alterar`}
        onClick={() => setAberto((v) => !v)}
        className={cn(
          'flex w-full min-w-0 items-center gap-2 rounded-md text-left transition-colors',
          variant === 'filled' ? 'min-h-9 bg-surface-2 px-3 py-1.5 hover:bg-surface-3' : '-mx-2 w-[calc(100%+1rem)] px-2 py-1.5 hover:bg-surface-2',
        )}
      >
        {nomes.length > 0 ? (
          <>
            <PilhaDeAvatares nomes={nomes} anel={variant === 'filled' ? 'ring-surface-2' : 'ring-surface'} />
            <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink">
              {nomes.length === 1 ? nomes[0] : `${nomes.length} pessoas`}
            </span>
          </>
        ) : (
          <span className="flex items-center gap-2 text-[13px] text-ink-4">
            <UserRound className="h-3.5 w-3.5" />
            {vazio}
          </span>
        )}
      </motion.button>

      <Popover open={aberto} onClose={() => setAberto(false)} anchorRef={ancora} align="start" label={rotulo} className="w-[280px]">
        {disponiveis.length === 0 ? (
          <div className="space-y-2 p-3">
            <p className="text-[12px] leading-relaxed text-ink-3">A equipe CX ainda não foi cadastrada.</p>
            <LinkButton
              onClick={() => {
                setAberto(false);
                navegar(rotas.configuracoes('equipe'));
              }}
            >
              <Settings className="h-3.5 w-3.5" />
              Cadastrar a equipe
            </LinkButton>
          </div>
        ) : (
          <div role="group" aria-label={rotulo} className="scroll-slim max-h-[280px] overflow-y-auto py-0.5">
            {disponiveis.map((m) => {
              const marcado = selecionados.includes(m.id);
              return (
                <motion.button
                  key={m.id}
                  type="button"
                  role="checkbox"
                  aria-checked={marcado}
                  whileTap={press}
                  onClick={() => alternar(m.id)}
                  className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left transition-colors hover:bg-surface-2 focus:bg-surface-2 focus:outline-none"
                >
                  <MarcaVisual marcado={marcado} />
                  <Avatar nome={m.nome} size="xs" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-ink">{m.nome}</span>
                    {m.funcao && <span className="block truncate text-[11px] text-ink-3">{m.funcao}</span>}
                  </span>
                </motion.button>
              );
            })}
          </div>
        )}
        {disponiveis.length > 0 && (
          <div className="border-t border-hairline px-2.5 py-2">
            <LinkButton
              onClick={() => {
                setAberto(false);
                navegar(rotas.configuracoes('equipe'));
              }}
            >
              <Plus className="h-3.5 w-3.5" />
              Cadastrar pessoa na equipe
            </LinkButton>
          </div>
        )}
      </Popover>
    </>
  );
}
