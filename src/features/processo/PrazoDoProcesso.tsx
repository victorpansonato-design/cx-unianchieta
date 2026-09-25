/**
 * O prazo do processo no painel de campos, com o histórico.
 *
 * Definir o primeiro prazo é direto. Mudar um prazo que já existia pede o
 * motivo numa folha curta (opcional: dá para salvar sem): é o que a diretoria
 * lê depois, quando quer saber por que algo atrasou. Cancelar desfaz a data
 * digitada.
 *
 * Embaixo do campo, quando há histórico, um link discreto abre a lista das
 * mudanças: de quando para quando, quem mudou e por quê.
 */
import { useRef, useState } from 'react';
import { CalendarClock, History } from 'lucide-react';
import { Button, LinkButton } from '../../components/ui/Button';
import { DateInput } from '../../components/ui/DateInput';
import { Field, TextArea } from '../../components/ui/Fields';
import { Modal, Popover } from '../../components/ui/Overlay';
import type { DateOnly, Processo } from '../../data/types';
import { ehAdiamento, estaVencido, textoMudancaPrazo, vezesAdiado } from '../../domain/processos';
import { formatarMomento } from '../../lib/dates';
import { acoesProcesso } from '../../services/acoes';

function HistoricoDoPrazo({ processo: p }: { processo: Processo }) {
  const [aberto, setAberto] = useState(false);
  const ancora = useRef<HTMLButtonElement>(null);
  if (p.historicoPrazos.length === 0) return null;
  const adiado = vezesAdiado(p);
  const rotulo = adiado > 0 ? (adiado === 1 ? 'Adiado 1 vez' : `Adiado ${adiado} vezes`) : 'Histórico do prazo';

  return (
    <>
      <LinkButton ref={ancora} onClick={() => setAberto((v) => !v)} aria-expanded={aberto} className="mt-0.5 text-[11.5px] text-ink-3">
        <History className="h-3 w-3" />
        {rotulo}
      </LinkButton>
      <Popover open={aberto} onClose={() => setAberto(false)} anchorRef={ancora} align="start" label="Histórico do prazo" className="w-[320px]">
        <p className="px-2.5 pt-1.5 pb-2 text-[12px] font-semibold text-ink-3">Histórico do prazo</p>
        <ul className="scroll-slim max-h-[320px] divide-y divide-hairline overflow-y-auto">
          {[...p.historicoPrazos].reverse().map((m) => (
            <li key={m.em} className="px-2.5 py-2">
              <p className={ehAdiamento(m) ? 'text-[12.5px] font-medium text-ink' : 'text-[12.5px] text-ink-2'}>
                {textoMudancaPrazo(m.de, m.para)}
              </p>
              {m.motivo && <p className="mt-0.5 text-[12px] leading-relaxed text-ink-2">{m.motivo}</p>}
              <p className="mt-0.5 text-[11px] text-ink-4">
                {m.autor.nome} · {formatarMomento(m.em)}
              </p>
            </li>
          ))}
        </ul>
      </Popover>
    </>
  );
}

export function PrazoDoProcesso({ processo: p }: { processo: Processo }) {
  const [pedido, setPedido] = useState<{ para: DateOnly | null } | null>(null);
  const [motivo, setMotivo] = useState('');
  // Muda a chave do campo para ele voltar à data salva quando a mudança é cancelada.
  const [versao, setVersao] = useState(0);

  const mudar = (para: DateOnly | null) => {
    if (p.prazo === null) {
      void acoesProcesso.mudarPrazo(p.id, para);
      return;
    }
    setMotivo('');
    setPedido({ para });
  };

  const cancelar = () => {
    setPedido(null);
    setVersao((v) => v + 1);
  };

  const salvar = () => {
    if (!pedido) return;
    void acoesProcesso.mudarPrazo(p.id, pedido.para, motivo);
    setPedido(null);
  };

  const adiando = pedido !== null && pedido.para !== null && p.prazo !== null && pedido.para > p.prazo;

  return (
    <div>
      <DateInput
        key={versao}
        variant="inline"
        aria-label="Prazo previsto"
        placeholder="Sem prazo"
        value={p.prazo}
        tone={estaVencido(p) ? 'crit' : undefined}
        onChange={mudar}
      />
      <HistoricoDoPrazo processo={p} />

      <Modal
        open={pedido !== null}
        onClose={cancelar}
        size="sm"
        icon={<CalendarClock className="h-4 w-4" />}
        title={adiando ? 'Por que o prazo foi adiado?' : 'Por que o prazo mudou?'}
        description={pedido ? textoMudancaPrazo(p.prazo, pedido.para) : undefined}
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={cancelar}>
              Cancelar
            </Button>
            <Button variant="primary" size="sm" onClick={salvar}>
              Salvar prazo
            </Button>
          </>
        }
      >
        <div className="px-5 py-4">
          <Field label="Motivo" help="Opcional. Fica no histórico do prazo e na linha do tempo do processo.">
            {(id) => (
              <TextArea
                id={id}
                data-autofocus
                rows={3}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Ex.: aguardando o retorno do TI sobre o Lyceum."
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) salvar();
                }}
              />
            )}
          </Field>
        </div>
      </Modal>
    </div>
  );
}
