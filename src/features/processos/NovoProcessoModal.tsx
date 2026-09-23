/**
 * Novo processo: só o essencial para abrir o registro. O resto — problema,
 * antes e depois, tarefas — se preenche ao longo do caminho, no detalhe.
 */
import { useEffect, useState, type FormEvent } from 'react';
import { FolderPlus } from 'lucide-react';
import { fecharNovoProcesso, useNovoProcesso } from '../../app/novoProcesso';
import { navegar, rotas } from '../../app/router';
import { SeletorDePessoas } from '../../components/domain/Pessoas';
import { Button, LinkButton } from '../../components/ui/Button';
import { DateInput } from '../../components/ui/DateInput';
import { Field, Label, Select, TextArea, TextInput } from '../../components/ui/Fields';
import { Modal } from '../../components/ui/Overlay';
import { useToast } from '../../components/ui/Toast';
import type { ID } from '../../data/types';
import { ativos } from '../../domain/config';
import { useIdentidade } from '../../hooks/usePreferencias';
import { useConfig } from '../../hooks/useStore';
import { acoesProcesso } from '../../services/acoes';

interface Rascunho {
  titulo: string;
  etapaId: ID;
  setorId: ID | '';
  origemId: ID | '';
  prioridadeId: ID | '';
  responsaveisIds: ID[];
  prazo: string | null;
  descricao: string;
}

export function NovoProcessoModal() {
  const pedido = useNovoProcesso();
  const config = useConfig();
  const { pessoa } = useIdentidade();
  const toast = useToast();
  const [r, setR] = useState<Rascunho | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  // Cada abertura começa um rascunho novo: etapa pedida (ou a primeira) e você como responsável.
  useEffect(() => {
    if (!pedido.aberto) return;
    setErro(null);
    setR({
      titulo: '',
      etapaId: pedido.etapaId ?? config.etapas[0].id,
      setorId: '',
      origemId: '',
      prioridadeId: '',
      responsaveisIds: pessoa?.tipo === 'membro' ? [pessoa.id] : [],
      prazo: null,
      descricao: '',
    });
    // Só ao abrir: mudar a configuração com o modal aberto não reinicia o que já foi digitado.
  }, [pedido.aberto, pedido.etapaId]);

  const mudar = (parcial: Partial<Rascunho>) => setR((atual) => (atual ? { ...atual, ...parcial } : atual));

  const criar = (e: FormEvent) => {
    e.preventDefault();
    if (!r) return;
    if (!r.titulo.trim()) {
      setErro('Dê um título ao processo.');
      return;
    }
    const processo = acoesProcesso.criar({
      titulo: r.titulo,
      etapaId: r.etapaId,
      setorId: r.setorId || null,
      origemId: r.origemId || null,
      prioridadeId: r.prioridadeId || null,
      responsaveisIds: r.responsaveisIds,
      prazo: r.prazo,
      descricao: r.descricao,
    });
    fecharNovoProcesso();
    toast({ title: `${processo.codigo} criado.`, description: processo.titulo });
    navegar(rotas.processo(processo.codigo));
  };

  const setores = ativos(config.setores);
  const semSetores = setores.length === 0;

  return (
    <Modal
      open={pedido.aberto}
      onClose={fecharNovoProcesso}
      size="md"
      icon={<FolderPlus className="h-4 w-4" />}
      title="Novo processo"
      description="Só o essencial para abrir o registro. O resto você preenche no próprio processo, ao longo do caminho."
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={fecharNovoProcesso}>
            Cancelar
          </Button>
          <Button variant="primary" size="sm" type="submit" form="form-novo-processo">
            Criar processo
          </Button>
        </>
      }
    >
      {r && (
        <form id="form-novo-processo" onSubmit={criar} className="grid gap-4 px-5 py-5 sm:grid-cols-2">
          <Field label="Título" required error={erro} className="sm:col-span-2" help="Um nome curto que todo mundo reconheça em reunião.">
            {(id) => (
              <TextInput
                id={id}
                data-autofocus
                value={r.titulo}
                maxLength={140}
                onChange={(e) => {
                  mudar({ titulo: e.target.value });
                  setErro(null);
                }}
              />
            )}
          </Field>

          <Field label="Setor dono do processo">
            {(id) => (
              <Select id={id} value={r.setorId} onChange={(e) => mudar({ setorId: e.target.value })}>
                <option value="">{semSetores ? 'Nenhum setor cadastrado' : 'Sem setor'}</option>
                {setores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nome}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <Field label="Origem da demanda">
            {(id) => (
              <Select id={id} value={r.origemId} onChange={(e) => mudar({ origemId: e.target.value })}>
                <option value="">Não informada</option>
                {ativos(config.origens).map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.nome}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <div>
            <Label>Responsáveis do CX</Label>
            <SeletorDePessoas
              variant="filled"
              membros={config.membros}
              selecionados={r.responsaveisIds}
              onChange={(ids) => mudar({ responsaveisIds: ids })}
            />
          </div>

          <Field label="Prioridade">
            {(id) => (
              <Select id={id} value={r.prioridadeId} onChange={(e) => mudar({ prioridadeId: e.target.value })}>
                <option value="">Não definida</option>
                {ativos(config.prioridades).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <Field label="Prazo previsto" hint="Opcional">
            {(id) => <DateInput id={id} value={r.prazo} onChange={(v) => mudar({ prazo: v })} />}
          </Field>

          <Field label="Começa na etapa">
            {(id) => (
              <Select id={id} value={r.etapaId} onChange={(e) => mudar({ etapaId: e.target.value })}>
                {config.etapas.map((et, i) => (
                  <option key={et.id} value={et.id}>
                    {i + 1}. {et.nome}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <Field label="Qual é o problema?" hint="Opcional" className="sm:col-span-2">
            {(id) => (
              <TextArea
                id={id}
                rows={3}
                value={r.descricao}
                placeholder="O que acontece hoje e como isso afeta o aluno."
                onChange={(e) => mudar({ descricao: e.target.value })}
              />
            )}
          </Field>

          {semSetores && (
            <p className="text-[11.5px] leading-relaxed text-ink-4 sm:col-span-2">
              Os setores ainda não foram cadastrados.{' '}
              <LinkButton
                onClick={() => {
                  fecharNovoProcesso();
                  navegar(rotas.configuracoes('setores'));
                }}
              >
                Cadastrar setores
              </LinkButton>
            </p>
          )}
          {/* Enter no título cria o processo. */}
          <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
        </form>
      )}
    </Modal>
  );
}
