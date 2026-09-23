/**
 * Campos do domínio: etiquetas (tags) e responsável de tarefa.
 */
import { useRef, useState, type KeyboardEvent } from 'react';
import { motion } from 'motion/react';
import { UserRound, X } from 'lucide-react';
import type { Config, ID } from '../../data/types';
import { ativos } from '../../domain/config';
import { cn } from '../../lib/cn';
import { press } from '../../lib/motion';
import { normalizar } from '../../lib/text';
import { Avatar } from '../ui/Badges';
import { CONTROL } from '../ui/Fields';
import { Popover } from '../ui/Overlay';

/* -- Etiquetas ------------------------------------------------------------- */

/** Etiquetas livres. Enter ou vírgula adiciona; Backspace no campo vazio tira a última. */
export function CampoDeTags({
  tags,
  sugestoes,
  onChange,
}: {
  tags: string[];
  sugestoes: string[];
  onChange: (tags: string[]) => void;
}) {
  const [texto, setTexto] = useState('');
  const listaId = useRef(`tags-${Math.random().toString(36).slice(2)}`).current;

  const adicionar = (valor: string) => {
    const t = valor.trim().replace(/,$/, '').trim();
    if (!t) return;
    if (!tags.some((x) => normalizar(x) === normalizar(t))) onChange([...tags, t]);
    setTexto('');
  };

  const teclar = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      adicionar(texto);
    } else if (e.key === 'Backspace' && !texto && tags.length) {
      onChange(tags.slice(0, -1));
    }
  };

  const disponiveis = sugestoes.filter((s) => !tags.some((t) => normalizar(t) === normalizar(s)));

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {tags.map((t) => (
        <span key={t} className="inline-flex items-center gap-1 rounded-sm bg-surface-2 py-0.5 pr-0.5 pl-1.5 text-[11px] font-medium text-ink-3">
          {t}
          <motion.button
            type="button"
            whileTap={press}
            aria-label={`Remover etiqueta ${t}`}
            onClick={() => onChange(tags.filter((x) => x !== t))}
            className="flex h-4 w-4 items-center justify-center rounded-xs text-ink-4 transition-colors hover:bg-surface-3 hover:text-ink"
          >
            <X className="h-3 w-3" />
          </motion.button>
        </span>
      ))}
      <input
        value={texto}
        list={listaId}
        onChange={(e) => {
          const v = e.target.value;
          // Escolher uma sugestão do datalist chega como troca de valor inteiro.
          if (disponiveis.includes(v)) adicionar(v);
          else setTexto(v);
        }}
        onKeyDown={teclar}
        onBlur={() => adicionar(texto)}
        placeholder={tags.length ? 'Mais…' : 'Adicionar etiqueta'}
        aria-label="Adicionar etiqueta"
        className="h-6 min-w-[96px] flex-1 rounded-sm bg-transparent px-1 text-[12px] text-ink transition-colors placeholder:text-ink-4 hover:bg-surface-2 focus:bg-surface-2 focus:ring-2 focus:ring-focus focus:outline-none"
      />
      <datalist id={listaId}>
        {disponiveis.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
    </div>
  );
}

/* -- Responsável da tarefa ------------------------------------------------- */

/** Um membro da equipe ou alguém de fora do CX, por nome. */
export function SeletorResponsavelTarefa({
  config,
  responsavelId,
  responsavelExterno,
  onChange,
  compacto = false,
}: {
  config: Config;
  responsavelId: ID | null;
  responsavelExterno: string;
  onChange: (valor: { responsavelId: ID | null; responsavelExterno: string }) => void;
  compacto?: boolean;
}) {
  const [aberto, setAberto] = useState(false);
  const [externo, setExterno] = useState(responsavelExterno);
  const ancora = useRef<HTMLButtonElement>(null);
  const nome = responsavelId
    ? (config.membros.find((m) => m.id === responsavelId)?.nome ?? null)
    : responsavelExterno || null;

  const escolher = (valor: { responsavelId: ID | null; responsavelExterno: string }) => {
    onChange(valor);
    setAberto(false);
  };

  return (
    <>
      <motion.button
        ref={ancora}
        type="button"
        whileTap={press}
        onClick={() => {
          setExterno(responsavelExterno);
          setAberto((v) => !v);
        }}
        aria-label={nome ? `Responsável: ${nome}. Alterar` : 'Escolher responsável'}
        title={nome ?? 'Escolher responsável'}
        className={cn(
          'flex min-w-0 items-center gap-1.5 rounded-full transition-colors hover:bg-surface-2',
          compacto ? 'h-7 px-1' : 'h-8 px-1.5 pr-2.5',
        )}
      >
        {nome ? (
          <>
            <Avatar nome={nome} size="xs" />
            {!compacto && <span className="max-w-[120px] truncate text-[12px] font-medium text-ink-2">{nome}</span>}
          </>
        ) : (
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-surface-2 text-ink-4">
            <UserRound className="h-3.5 w-3.5" />
          </span>
        )}
      </motion.button>
      <Popover open={aberto} onClose={() => setAberto(false)} anchorRef={ancora} align="end" label="Responsável" className="w-[260px]">
        <div className="scroll-slim max-h-[240px] overflow-y-auto">
          <OpcaoPessoa nome="Sem responsável" ativo={!nome} onClick={() => escolher({ responsavelId: null, responsavelExterno: '' })} vazio />
          {ativos(config.membros).map((m) => (
            <OpcaoPessoa
              key={m.id}
              nome={m.nome}
              detalhe={m.funcao}
              ativo={m.id === responsavelId}
              onClick={() => escolher({ responsavelId: m.id, responsavelExterno: '' })}
            />
          ))}
        </div>
        <form
          className="border-t border-hairline p-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (externo.trim()) escolher({ responsavelId: null, responsavelExterno: externo.trim() });
          }}
        >
          <label className="mb-1 block px-1 text-[11px] font-medium text-ink-4">Alguém de fora do CX</label>
          <input
            value={externo}
            onChange={(e) => setExterno(e.target.value)}
            placeholder="Nome e Enter"
            aria-label="Nome de alguém de fora do CX"
            className={cn(CONTROL, 'h-8 text-[12.5px]')}
          />
        </form>
      </Popover>
    </>
  );
}

function OpcaoPessoa({
  nome,
  detalhe,
  ativo,
  onClick,
  vazio = false,
}: {
  nome: string;
  detalhe?: string;
  ativo: boolean;
  onClick: () => void;
  vazio?: boolean;
}) {
  return (
    <motion.button
      type="button"
      whileTap={press}
      onClick={onClick}
      aria-pressed={ativo}
      className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left transition-colors hover:bg-surface-2 focus:bg-surface-2 focus:outline-none"
    >
      {vazio ? (
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-surface-2 text-ink-4">
          <UserRound className="h-3.5 w-3.5" />
        </span>
      ) : (
        <Avatar nome={nome} size="xs" />
      )}
      <span className="min-w-0 flex-1">
        <span className={cn('block truncate text-[13px]', ativo ? 'font-semibold text-ink' : 'font-medium text-ink-2')}>{nome}</span>
        {detalhe && <span className="block truncate text-[11px] text-ink-4">{detalhe}</span>}
      </span>
      {ativo && <span className="h-1.25 w-1.25 shrink-0 rounded-full bg-ink" />}
    </motion.button>
  );
}
