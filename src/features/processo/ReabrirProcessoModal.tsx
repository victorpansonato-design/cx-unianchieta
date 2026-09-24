/**
 * Reabrir um processo concluído: quando a equipe identifica outras melhorias,
 * o processo volta para uma etapa anterior com tudo o que já tinha. O motivo
 * vira andamento, e a conclusão anterior continua na linha do tempo.
 */
import { useEffect, useState, type FormEvent } from 'react';
import { RotateCcw } from 'lucide-react';
import { fecharReabrirProcesso, useReabrirProcesso } from '../../app/reabrirProcesso';
import { navegar, rotas } from '../../app/router';
import { Button } from '../../components/ui/Button';
import { DateInput } from '../../components/ui/DateInput';
import { Field, Select, TextArea } from '../../components/ui/Fields';
import { Modal } from '../../components/ui/Overlay';
import { useToast } from '../../components/ui/Toast';
import { etapaAntesDaConclusao, etapaDe } from '../../domain/processos';
import { useSnapshot } from '../../hooks/useStore';
import { formatarData, hoje } from '../../lib/dates';
import { acoesProcesso } from '../../services/acoes';

interface Rascunho {
  etapaId: string;
  motivo: string;
  prazo: string | null;
}

export function ReabrirProcessoModal() {
  const pedido = useReabrirProcesso();
  const s = useSnapshot();
  const toast = useToast();
  const p = pedido.processoId ? s.processos.find((x) => x.id === pedido.processoId) : undefined;
  const aberto = Boolean(p && p.situacao === 'concluido');
  const [r, setR] = useState<Rascunho | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  // Cada abertura começa do zero, na etapa pedida ou na última antes da conclusão.
  useEffect(() => {
    if (!aberto || !p) return;
    setErro(null);
    setR({ etapaId: pedido.etapaId ?? etapaAntesDaConclusao(s.config, p), motivo: '', prazo: null });
  }, [aberto, pedido.processoId, pedido.etapaId]);

  const mudar = (parcial: Partial<Rascunho>) => setR((atual) => (atual ? { ...atual, ...parcial } : atual));
  const etapas = s.config.etapas.slice(0, -1);
  const prazoVencido = Boolean(p?.prazo && p.prazo < hoje());

  const reabrir = async (e: FormEvent) => {
    e.preventDefault();
    if (!p || !r) return;
    if (!r.motivo.trim()) {
      setErro('Conte o que foi identificado. Fica registrado nos andamentos.');
      return;
    }
    await acoesProcesso.reabrir(p.id, r);
    fecharReabrirProcesso();
    toast({ title: `${p.codigo} reaberto.`, description: `Voltou para “${etapaDe(s.config, r.etapaId)?.nome}”.` });
    navegar(rotas.processo(p.codigo));
  };

  return (
    <Modal
      open={aberto}
      onClose={fecharReabrirProcesso}
      size="md"
      icon={<RotateCcw className="h-4 w-4" />}
      title={p ? `Reabrir ${p.codigo}` : 'Reabrir processo'}
      description="O processo volta para a etapa escolhida com tudo o que já tem: textos, fluxo, indicadores, tarefas, anexos e histórico. Ele sai de Concluídos e volta para Processos."
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={fecharReabrirProcesso}>
            Cancelar
          </Button>
          <Button variant="primary" size="sm" type="submit" form="form-reabrir-processo">
            Reabrir processo
          </Button>
        </>
      }
    >
      {p && r && (
        <form id="form-reabrir-processo" onSubmit={reabrir} className="grid gap-4 px-5 py-5 sm:grid-cols-2">
          <Field
            label="O que foi identificado?"
            required
            error={erro}
            className="sm:col-span-2"
            help="As melhorias que motivaram a reabertura. Vira um andamento do processo."
          >
            {(id) => (
              <TextArea
                id={id}
                data-autofocus
                rows={3}
                value={r.motivo}
                placeholder="Ex.: depois da implantação, os alunos ainda pedem a declaração no balcão."
                onChange={(e) => {
                  mudar({ motivo: e.target.value });
                  setErro(null);
                }}
              />
            )}
          </Field>

          <Field label="Voltar para a etapa">
            {(id) => (
              <Select id={id} value={r.etapaId} onChange={(e) => mudar({ etapaId: e.target.value })}>
                {etapas.map((et, i) => (
                  <option key={et.id} value={et.id}>
                    {i + 1}. {et.nome}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <Field
            label="Novo prazo"
            hint="Opcional"
            help={
              p.prazo
                ? `Em branco, fica o prazo atual (${formatarData(p.prazo)})${prazoVencido ? ', que já passou' : ''}.`
                : 'Em branco, o processo continua sem prazo.'
            }
          >
            {(id) => <DateInput id={id} value={r.prazo} onChange={(v) => mudar({ prazo: v })} />}
          </Field>

          {p.conclusao && (
            <p className="text-[11.5px] leading-relaxed text-ink-4 sm:col-span-2">
              A conclusão de {formatarData(p.conclusao)} fica registrada nos andamentos.
            </p>
          )}
        </form>
      )}
    </Modal>
  );
}
