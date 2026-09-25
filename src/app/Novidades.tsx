/**
 * Novidades — o sino do header.
 *
 * Não há número: um ponto discreto avisa que há algo novo desde a última vez
 * que a pessoa abriu a lista, e só. Abrir marca tudo como visto; as que eram
 * novas continuam destacadas enquanto a lista estiver aberta, para dar tempo
 * de ler. Embaixo das novas ficam as anteriores, apagadas, para a lista nunca
 * abrir vazia sem explicação.
 *
 * O que entra para cada pessoa está em domain/novidades.ts.
 */
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { motion } from 'motion/react';
import { Bell } from 'lucide-react';
import { Avatar, NewDot } from '../components/ui/Badges';
import { Button } from '../components/ui/Button';
import { Popover } from '../components/ui/Overlay';
import { novidadesPara, type Novidade } from '../domain/novidades';
import { useIdentidade } from '../hooks/usePreferencias';
import { useSnapshot } from '../hooks/useStore';
import { cn } from '../lib/cn';
import { agoraISO, formatarMomento, formatarRelativo } from '../lib/dates';
import { press } from '../lib/motion';
import { marcarNovidadesVistas, novidadesVistas } from '../services/preferencias';
import type { Pessoa } from '../services/identidade';
import { rotas } from './router';

function chaveDa(p: Pessoa): string {
  return p.tipo === 'diretoria' ? 'diretoria' : `${p.tipo}:${p.id}`;
}

const O_QUE_APARECE: Record<Pessoa['tipo'], string> = {
  membro: 'Aparece aqui o que outras pessoas fazem nos processos em que você é responsável, e tudo o que o TI faz.',
  ti: 'Aparece aqui o que o CX faz nos processos que você puxou, e cada processo que entra na fila.',
  diretoria: 'Aparece aqui o que a equipe faz em todos os processos.',
};

function ItemDeNovidade({ item, nova, href, onAbrir }: { item: Novidade; nova: boolean; href: string; onAbrir: () => void }) {
  return (
    <motion.a
      href={href}
      whileTap={press}
      onClick={onAbrir}
      className="relative flex gap-2.5 rounded-md px-2.5 py-2 transition-colors hover:bg-surface-2"
    >
      <Avatar nome={item.autor ?? 'TI'} size="xs" className={cn(!nova && 'opacity-60')} />
      <div className="min-w-0 flex-1">
        <p className={cn('text-[12.5px] leading-snug', nova ? 'text-ink' : 'text-ink-3')}>
          {item.autor && <span className="font-semibold">{item.autor} · </span>}
          {item.texto}
        </p>
        <p className="mt-0.5 truncate text-[11px] text-ink-4">
          <span className="font-mono">{item.processo.codigo}</span> · {item.processo.titulo}
        </p>
      </div>
      <span className="shrink-0 pt-0.5 text-[11px] text-ink-4" title={formatarMomento(item.em)}>
        {formatarRelativo(item.em)}
      </span>
    </motion.a>
  );
}

export function Novidades() {
  const s = useSnapshot();
  const { pessoa } = useIdentidade();
  const vistas = useSyncExternalStore(novidadesVistas.subscribe, novidadesVistas.get);
  const [aberto, setAberto] = useState(false);
  // O "desde" de quando a lista abriu: mantém as novas destacadas enquanto ela estiver aberta.
  const [desdeAoAbrir, setDesdeAoAbrir] = useState<string | null>(null);
  const ancora = useRef<HTMLButtonElement>(null);

  const chave = pessoa ? chaveDa(pessoa) : null;
  const desde = chave ? (vistas[chave] ?? null) : null;

  // Primeira vez desta pessoa neste navegador: começa do zero, sem despejar o histórico inteiro como novidade.
  useEffect(() => {
    if (chave && !novidadesVistas.get()[chave]) marcarNovidadesVistas(chave, agoraISO());
  }, [chave]);

  const itens = useMemo(() => (pessoa ? novidadesPara(s, { tipo: pessoa.tipo, id: pessoa.id }) : []), [s, pessoa]);
  const temNovas = desde !== null && itens.some((i) => i.em > desde);

  if (!pessoa || !chave) return null;

  const referencia = aberto ? desdeAoAbrir : desde;
  const novas = referencia ? itens.filter((i) => i.em > referencia) : [];
  const anteriores = itens.filter((i) => !novas.includes(i)).slice(0, Math.max(0, 12 - novas.length));
  const hrefDe = (i: Novidade) =>
    pessoa.tipo === 'ti' ? rotas.tiProcesso(i.processo.codigo) : rotas.processo(i.processo.codigo, 'andamentos');

  const abrir = () => {
    if (aberto) {
      setAberto(false);
      return;
    }
    setDesdeAoAbrir(desde);
    setAberto(true);
    marcarNovidadesVistas(chave, agoraISO());
  };

  return (
    <>
      <span className="relative inline-flex">
        <Button
          ref={ancora}
          variant="ghost"
          size="sm"
          square
          aria-haspopup="dialog"
          aria-expanded={aberto}
          aria-label={temNovas ? 'Novidades: há novidades desde a sua última visita' : 'Novidades'}
          title="Novidades"
          icon={<Bell className="h-4 w-4" />}
          onClick={abrir}
        />
        {temNovas && <NewDot className="top-1.5 right-1.5" />}
      </span>

      <Popover
        open={aberto}
        onClose={() => setAberto(false)}
        anchorRef={ancora}
        align="end"
        label="Novidades"
        className="w-[380px] max-w-[calc(100vw-24px)]"
      >
        <div className="border-b border-hairline px-2.5 pt-1.5 pb-2.5">
          <p className="text-[13px] font-semibold text-ink">Novidades</p>
          <p className="mt-0.5 text-[11.5px] text-ink-3">
            {desdeAoAbrir ? `Desde a sua última visita, em ${formatarMomento(desdeAoAbrir)}.` : 'Desde a sua última visita.'}
          </p>
        </div>
        <div className="scroll-slim max-h-[60vh] overflow-y-auto py-1">
          {novas.length === 0 && (
            <p className="px-2.5 py-2 text-[12px] leading-relaxed text-ink-3">
              <span className="font-medium text-ink-2">Nada novo por aqui.</span> {O_QUE_APARECE[pessoa.tipo]}
            </p>
          )}
          {novas.map((i) => (
            <ItemDeNovidade key={i.id} item={i} nova href={hrefDe(i)} onAbrir={() => setAberto(false)} />
          ))}
          {anteriores.length > 0 && (
            <>
              <p className="px-2.5 pt-3 pb-1 text-[11px] font-medium text-ink-4">Anteriores</p>
              {anteriores.map((i) => (
                <ItemDeNovidade key={i.id} item={i} nova={false} href={hrefDe(i)} onAbrir={() => setAberto(false)} />
              ))}
            </>
          )}
        </div>
      </Popover>
    </>
  );
}
