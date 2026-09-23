/**
 * Andamentos: a linha do tempo do processo. Em cima, o registro manual (nota,
 * reunião, decisão, retorno da diretoria ou do TI, com data e hora ajustáveis).
 * Embaixo, tudo o que aconteceu, agrupado por dia — os automáticos em tinta
 * apagada, para os registros da equipe se destacarem.
 */
import { useMemo, useState, type FormEvent } from 'react';
import { History, Pencil, Trash2 } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { DateInput } from '../../../components/ui/DateInput';
import { Segmented, TextArea, TextInput } from '../../../components/ui/Fields';
import { useConfirm } from '../../../components/ui/Overlay';
import { Card, EmptyState, SectionLabel } from '../../../components/ui/Surfaces';
import type { Andamento, Processo, Snapshot, TipoAndamentoManual } from '../../../data/types';
import { NOME_TIPO, ordenarAndamentos, TIPOS_MANUAIS } from '../../../domain/andamentos';
import { cn } from '../../../lib/cn';
import { agoraISO, formatarDataDeMomento, formatarHora, hoje, paraDateOnly, somarDias } from '../../../lib/dates';
import { acoesAndamento } from '../../../services/acoes';

const PLACEHOLDER: Record<TipoAndamentoManual, string> = {
  nota: 'O que vale registrar sobre o processo.',
  reuniao: 'Com quem foi, o que se discutiu e o que ficou combinado.',
  decisao: 'O que foi decidido e por quem.',
  'retorno-diretoria': 'O que a diretoria respondeu.',
  'retorno-ti': 'O que o TI respondeu: prazo, viabilidade, próximos passos.',
};

type Filtro = 'todos' | 'equipe' | 'automaticos';

/** Junta data (AAAA-MM-DD) e hora (hh:mm) digitadas num momento ISO local. */
function momentoDe(data: string, hora: string): string {
  const [a, m, d] = data.split('-').map(Number);
  const [h, min] = /^\d{2}:\d{2}$/.test(hora) ? hora.split(':').map(Number) : [new Date().getHours(), new Date().getMinutes()];
  return new Date(a, m - 1, d, h, min).toISOString();
}

function mascararHora(texto: string) {
  const d = texto.replace(/\D/g, '').slice(0, 4);
  return d.length <= 2 ? d : `${d.slice(0, 2)}:${d.slice(2)}`;
}

function rotuloDoDia(dia: string) {
  if (dia === hoje()) return 'Hoje';
  if (dia === somarDias(hoje(), -1)) return 'Ontem';
  return formatarDataDeMomento(`${dia}T12:00:00`);
}

function Registro({ andamento: a }: { andamento: Andamento }) {
  const confirmar = useConfirm();
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState(a.texto);

  const remover = async () => {
    const ok = await confirmar({
      title: 'Remover este registro?',
      message: 'Ele sai da linha do tempo do processo. Esta ação não pode ser desfeita.',
      confirmLabel: 'Remover registro',
      tone: 'danger',
    });
    if (ok) acoesAndamento.remover(a.id);
  };

  return (
    <li className="relative flex gap-3 py-2.5">
      <span
        className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', a.automatico ? 'bg-hairline-strong' : 'bg-ink-2')}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <p className={cn('text-[12px] font-semibold', a.automatico ? 'text-ink-3' : 'text-ink')}>{NOME_TIPO[a.tipo]}</p>
        {editando ? (
          <div className="mt-1.5 space-y-2">
            <TextArea value={texto} onChange={(e) => setTexto(e.target.value)} rows={3} aria-label="Texto do registro" autoFocus />
            <div className="flex gap-2">
              <Button
                size="xs"
                onClick={() => {
                  acoesAndamento.editar(a.id, { texto });
                  setEditando(false);
                }}
                disabled={!texto.trim()}
              >
                Salvar
              </Button>
              <Button
                size="xs"
                variant="ghost"
                onClick={() => {
                  setTexto(a.texto);
                  setEditando(false);
                }}
              >
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <p className={cn('mt-0.5 text-[13px] leading-relaxed whitespace-pre-wrap', a.automatico ? 'text-ink-3' : 'text-ink-2')}>
            {a.texto}
          </p>
        )}
        <p className="mt-1 text-[11.5px] text-ink-4">
          <span className="font-mono">{formatarHora(a.quando)}</span> · {a.autor.nome}
        </p>
      </div>
      {!a.automatico && !editando && (
        <div className="flex shrink-0 items-start gap-0.5">
          <Button variant="ghost" size="xs" square aria-label="Editar registro" icon={<Pencil className="h-3.5 w-3.5" />} onClick={() => setEditando(true)} />
          <Button variant="ghost" size="xs" square aria-label="Remover registro" icon={<Trash2 className="h-3.5 w-3.5" />} onClick={remover} />
        </div>
      )}
    </li>
  );
}

export function AndamentosAba({ processo: p, s }: { processo: Processo; s: Snapshot }) {
  const [tipo, setTipo] = useState<TipoAndamentoManual>('nota');
  const [texto, setTexto] = useState('');
  const [data, setData] = useState<string | null>(null);
  const [hora, setHora] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('todos');

  const todos = useMemo(() => ordenarAndamentos(s.andamentos.filter((a) => a.processoId === p.id)), [s.andamentos, p.id]);
  const visiveis = todos.filter((a) =>
    filtro === 'todos' ? true : filtro === 'equipe' ? !a.automatico : a.automatico,
  );

  const dias = useMemo(() => {
    const grupos: Array<{ dia: string; itens: Andamento[] }> = [];
    for (const a of visiveis) {
      const dia = paraDateOnly(new Date(a.quando));
      const ultimo = grupos[grupos.length - 1];
      if (ultimo && ultimo.dia === dia) ultimo.itens.push(a);
      else grupos.push({ dia, itens: [a] });
    }
    return grupos;
  }, [visiveis]);

  const registrar = (e?: FormEvent) => {
    e?.preventDefault();
    if (!texto.trim()) return;
    const quando = data ? momentoDe(data, hora) : agoraISO();
    acoesAndamento.registrar(p.id, tipo, texto, quando);
    setTexto('');
    setData(null);
    setHora('');
  };

  return (
    <div className="space-y-4">
      <Card>
        <form onSubmit={registrar} className="space-y-3">
          <div className="scroll-slim -mx-1 overflow-x-auto px-1 pb-0.5">
            <Segmented<TipoAndamentoManual>
              layoutId={`andamento-tipo-${p.id}`}
              label="Tipo de registro"
              size="xs"
              value={tipo}
              onChange={setTipo}
              items={TIPOS_MANUAIS.map((t) => ({ value: t.id, label: t.nome }))}
            />
          </div>
          <TextArea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) registrar();
            }}
            rows={3}
            placeholder={PLACEHOLDER[tipo]}
            aria-label="Texto do registro"
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-ink-3">Quando</span>
              <DateInput value={data} onChange={setData} aria-label="Data do registro" placeholder="Agora" className="w-[150px]" />
              <TextInput
                value={hora}
                onChange={(e) => setHora(mascararHora(e.target.value))}
                placeholder="hh:mm"
                inputMode="numeric"
                aria-label="Hora do registro"
                disabled={!data}
                className="w-[76px] font-mono"
              />
            </div>
            <Button type="submit" size="sm" disabled={!texto.trim()}>
              Registrar
            </Button>
          </div>
        </form>
      </Card>

      <Card padded={false}>
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5 pb-3">
          <h2 className="text-[15px] leading-tight font-semibold text-ink">Linha do tempo</h2>
          <Segmented<Filtro>
            layoutId={`andamento-filtro-${p.id}`}
            label="Mostrar"
            size="xs"
            value={filtro}
            onChange={setFiltro}
            items={[
              { value: 'todos', label: 'Tudo', count: todos.length },
              { value: 'equipe', label: 'Da equipe', count: todos.filter((a) => !a.automatico).length },
              { value: 'automaticos', label: 'Automáticos', count: todos.filter((a) => a.automatico).length },
            ]}
          />
        </div>
        {visiveis.length === 0 ? (
          <div className="border-t border-hairline">
            <EmptyState
              compact
              icon={<History className="h-5 w-5" />}
              title={filtro === 'equipe' ? 'Nenhum registro da equipe ainda' : 'Nada por aqui'}
              message="Registre reuniões, decisões e os retornos da diretoria e do TI. As mudanças de etapa entram sozinhas."
            />
          </div>
        ) : (
          <div className="space-y-4 px-5 pb-4">
            {dias.map((g) => (
              <section key={g.dia}>
                <SectionLabel>{rotuloDoDia(g.dia)}</SectionLabel>
                <ul className="divide-y divide-hairline">
                  {g.itens.map((a) => (
                    <Registro key={a.id} andamento={a} />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
