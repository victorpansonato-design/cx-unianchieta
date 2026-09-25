/**
 * Lista configurável editável na própria tela: renomear clicando no nome,
 * adicionar pelo campo do rodapé, remover com confirmação. Um item em uso é
 * arquivado em vez de apagado, e pode ser restaurado.
 */
import { useMemo, useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowDown, ArrowUp, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { Avatar, Tag } from '../../components/ui/Badges';
import { Button, LinkButton } from '../../components/ui/Button';
import { InlineText, TextInput } from '../../components/ui/Fields';
import { useConfirm } from '../../components/ui/Overlay';
import { Card, CardHeader, EmptyState } from '../../components/ui/Surfaces';
import { useToast } from '../../components/ui/Toast';
import type { ItemLista, ListaConfig, Membro } from '../../data/types';
import { arquivados, ativos, contarUso, ehListaDePessoas, ehNivelMaisAlto, grauDoNivel } from '../../domain/config';
import { useIdentidade } from '../../hooks/usePreferencias';
import { useSnapshot } from '../../hooks/useStore';
import { cn } from '../../lib/cn';
import { collapseVariants, spring } from '../../lib/motion';
import { plural } from '../../lib/text';
import { acoesConfig } from '../../services/acoes';

/** A cor que a prioridade vai ter nos processos, para a equipe ver ao ordenar. */
const COR_GRAU = { alto: 'bg-crit', medio: 'bg-accent', baixo: 'bg-ink-4' } as const;

function PontoDePrioridade({ lista, id }: { lista: ItemLista[]; id: string }) {
  const grau = grauDoNivel(lista, id);
  return (
    <span
      aria-hidden="true"
      className={cn('h-1.5 w-1.5 shrink-0 rounded-full', grau ? COR_GRAU[grau] : 'bg-transparent')}
    />
  );
}

export interface TextosLista {
  titulo: string;
  subtitulo: string;
  vazio: string;
  placeholderNome: string;
}

export function ListaEditavel({
  lista,
  textos,
  ordenavel = false,
}: {
  lista: ListaConfig;
  textos: TextosLista;
  /** Níveis têm ordem (do menor para o maior); o mais alto fica destacado. */
  ordenavel?: boolean;
}) {
  const snapshot = useSnapshot();
  const { pessoa } = useIdentidade();
  const confirmar = useConfirm();
  const toast = useToast();
  const [nome, setNome] = useState('');
  const [funcao, setFuncao] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [verArquivados, setVerArquivados] = useState(false);

  const todos = snapshot.config[lista] as ItemLista[];
  const itens = useMemo(() => ativos(todos), [todos]);
  const removidos = useMemo(() => arquivados(todos), [todos]);
  const ehEquipe = ehListaDePessoas(lista);

  const adicionar = (e: FormEvent) => {
    e.preventDefault();
    const r = acoesConfig.adicionarItem(lista, { nome, funcao });
    if (!r.ok) {
      setErro(r.motivo);
      return;
    }
    setNome('');
    setFuncao('');
    setErro(null);
  };

  const renomear = (id: string, campo: 'nome' | 'funcao', valor: string) => {
    const r = acoesConfig.atualizarItem(lista, id, { [campo]: valor });
    if (!r.ok) {
      toast({ title: r.motivo, tone: 'crit' });
      return false;
    }
    return true;
  };

  const remover = async (item: ItemLista) => {
    const usos = contarUso(snapshot, lista, item.id);
    const souEu =
      ehEquipe && pessoa?.tipo === (lista === 'equipeTi' ? 'ti' : 'membro') && pessoa.id === item.id;
    const detalhes = [
      usos > 0
        ? `Está em uso em ${plural(usos, 'registro', 'registros')}. Sai das listas de escolha, mas o nome continua aparecendo onde já foi usado.`
        : 'Esta ação não pode ser desfeita.',
      souEu ? 'Você está usando o sistema com este nome: será preciso escolher quem você é de novo.' : null,
    ].filter(Boolean);
    const ok = await confirmar({
      title: `Remover “${item.nome}”?`,
      message: (
        <div className="space-y-2">
          {detalhes.map((d) => (
            <p key={d}>{d}</p>
          ))}
        </div>
      ),
      confirmLabel: 'Remover',
      tone: 'danger',
    });
    if (!ok) return;
    const { arquivado } = acoesConfig.removerItem(lista, item.id);
    toast({ title: arquivado ? `“${item.nome}” foi arquivado.` : `“${item.nome}” foi removido.` });
  };

  const restaurar = (item: ItemLista) => {
    const r = acoesConfig.restaurarItem(lista, item.id);
    if (!r.ok) toast({ title: r.motivo, tone: 'crit' });
    else toast({ title: `“${item.nome}” voltou para a lista.` });
  };

  return (
    <Card padded={false}>
      <CardHeader title={textos.titulo} subtitle={textos.subtitulo} className="px-5 pt-5 pb-4" />

      {itens.length === 0 ? (
        <div className="border-t border-hairline">
          <EmptyState compact title="Nada cadastrado ainda" message={textos.vazio} />
        </div>
      ) : (
        <ul className="divide-y divide-hairline border-t border-hairline">
          {itens.map((item, i) => {
            const usos = contarUso(snapshot, lista, item.id);
            return (
              <motion.li
                key={item.id}
                layout="position"
                transition={spring}
                className="flex items-center gap-3 px-5 py-2.5"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  {ehEquipe && <Avatar nome={item.nome} size="sm" />}
                  {lista === 'prioridades' && <PontoDePrioridade lista={todos} id={item.id} />}
                  <div className={ehEquipe ? 'grid min-w-0 flex-1 gap-x-4 sm:grid-cols-2' : 'min-w-0 flex-1'}>
                    <InlineText
                      value={item.nome}
                      aria-label={`Nome: ${item.nome}`}
                      delay={null}
                      required
                      onCommit={(v) => renomear(item.id, 'nome', v)}
                      className="text-[13px] font-medium"
                    />
                    {ehEquipe && (
                      <InlineText
                        value={(item as Membro).funcao}
                        aria-label={`Função de ${item.nome}`}
                        placeholder="Adicionar função"
                        onCommit={(v) => renomear(item.id, 'funcao', v)}
                        className="text-[12px] text-ink-3"
                      />
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {/* Invólucro: `hidden` na própria Tag perderia para o `inline-flex` dela. */}
                  <span className="hidden items-center gap-2 sm:flex">
                    {ordenavel && lista !== 'prioridades' && ehNivelMaisAlto(todos, item.id) && <Tag>Destacado</Tag>}
                    {usos > 0 && <Tag>Em uso</Tag>}
                  </span>
                  <div className="flex items-center gap-0.5">
                    {ordenavel && (
                      <>
                        <Button
                          variant="ghost"
                          size="xs"
                          square
                          aria-label={`Mover ${item.nome} para cima`}
                          disabled={i === 0}
                          icon={<ArrowUp className="h-3.5 w-3.5" />}
                          onClick={() => acoesConfig.moverItem(lista, item.id, -1)}
                        />
                        <Button
                          variant="ghost"
                          size="xs"
                          square
                          aria-label={`Mover ${item.nome} para baixo`}
                          disabled={i === itens.length - 1}
                          icon={<ArrowDown className="h-3.5 w-3.5" />}
                          onClick={() => acoesConfig.moverItem(lista, item.id, 1)}
                        />
                      </>
                    )}
                    <Button
                      variant="ghost"
                      size="xs"
                      square
                      aria-label={`Remover ${item.nome}`}
                      icon={<Trash2 className="h-3.5 w-3.5" />}
                      onClick={() => remover(item)}
                    />
                  </div>
                </div>
              </motion.li>
            );
          })}
        </ul>
      )}

      <form onSubmit={adicionar} className="border-t border-hairline px-5 py-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <TextInput
            value={nome}
            onChange={(e) => {
              setNome(e.target.value);
              setErro(null);
            }}
            placeholder={textos.placeholderNome}
            aria-label={textos.placeholderNome}
            className="sm:flex-1"
          />
          {ehEquipe && (
            <TextInput
              value={funcao}
              onChange={(e) => setFuncao(e.target.value)}
              placeholder="Função"
              aria-label="Função"
              className="sm:flex-1"
            />
          )}
          <Button type="submit" size="md" icon={<Plus className="h-4 w-4" />} disabled={!nome.trim()}>
            Adicionar
          </Button>
        </div>
        {erro && <p className="mt-1.5 text-[11.5px] font-medium text-crit">{erro}</p>}
      </form>

      {removidos.length > 0 && (
        <div className="border-t border-hairline px-5 py-3">
          <LinkButton onClick={() => setVerArquivados((v) => !v)}>
            {verArquivados ? 'Ocultar arquivados' : `Mostrar ${plural(removidos.length, 'arquivado', 'arquivados')}`}
          </LinkButton>
          <AnimatePresence initial={false}>
            {verArquivados && (
              <motion.div
                variants={collapseVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="overflow-hidden"
              >
                <p className="mt-2 text-[11.5px] leading-relaxed text-ink-4">
                  Arquivados não aparecem nas listas de escolha, mas continuam nos processos onde já foram usados.
                </p>
                <ul className="mt-2 divide-y divide-hairline">
                  {removidos.map((item) => (
                    <li key={item.id} className="flex items-center justify-between gap-3 py-2">
                      <span className="min-w-0 truncate text-[13px] text-ink-3">{item.nome}</span>
                      <Button
                        variant="ghost"
                        size="xs"
                        icon={<RotateCcw className="h-3.5 w-3.5" />}
                        onClick={() => restaurar(item)}
                      >
                        Restaurar
                      </Button>
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </Card>
  );
}
