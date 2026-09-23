/**
 * "Quem está usando?" — autoria sem login.
 *
 * Abre sozinho na primeira visita (e sempre que a pessoa salva deixou de
 * existir na equipe). Enquanto ninguém for escolhido, não fecha: todo registro
 * precisa de um autor. Pelo menu do header, abre para trocar de pessoa.
 *
 * Se a equipe ainda estiver vazia, a própria pessoa se cadastra aqui mesmo —
 * ninguém precisa descobrir sozinho onde fica Configurações.
 */
import { useState, useSyncExternalStore, type FormEvent } from 'react';
import { Plus, UserRound } from 'lucide-react';
import { Avatar, Tag } from '../components/ui/Badges';
import { Button, LinkButton } from '../components/ui/Button';
import { Field, TextInput } from '../components/ui/Fields';
import { Modal } from '../components/ui/Overlay';
import { Row } from '../components/ui/Surfaces';
import { useToast } from '../components/ui/Toast';
import { ativos } from '../domain/config';
import { useIdentidade } from '../hooks/usePreferencias';
import { useConfig } from '../hooks/useStore';
import { acoesConfig } from '../services/acoes';
import { identidade, type Pessoa } from '../services/identidade';
import type { Identidade } from '../data/types';

/* Pedido de troca vindo do header ou da busca rápida. */
let trocando = false;
const ouvintes = new Set<() => void>();
const seletor = {
  get: () => trocando,
  subscribe(fn: () => void) {
    ouvintes.add(fn);
    return () => {
      ouvintes.delete(fn);
    };
  },
  definir(v: boolean) {
    trocando = v;
    ouvintes.forEach((f) => f());
  },
};

export function abrirSeletorDeIdentidade() {
  seletor.definir(true);
}

function mesmaPessoa(i: Identidade, p: Pessoa | null) {
  if (!p) return false;
  return i.tipo === 'diretoria' ? p.tipo === 'diretoria' : p.tipo === 'membro' && p.id === i.membroId;
}

export function IdentityGate() {
  const config = useConfig();
  const { pessoa, precisaEscolher } = useIdentidade();
  const pedidoDeTroca = useSyncExternalStore(seletor.subscribe, seletor.get);
  const toast = useToast();

  const [formAberto, setFormAberto] = useState(false);
  const [nome, setNome] = useState('');
  const [funcao, setFuncao] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  const membros = ativos(config.membros);
  const equipeVazia = membros.length === 0;
  const aberto = precisaEscolher || pedidoDeTroca;
  const mostrarForm = equipeVazia || formAberto;

  const fechar = () => {
    seletor.definir(false);
    setFormAberto(false);
    setErro(null);
  };

  const escolher = (i: Identidade, nomeExibido: string) => {
    identidade.definir(i);
    fechar();
    toast({ title: `Você está como ${nomeExibido}.` });
  };

  const cadastrar = (e: FormEvent) => {
    e.preventDefault();
    const r = acoesConfig.adicionarItem('membros', { nome, funcao });
    if (!r.ok) {
      setErro(r.motivo);
      return;
    }
    const nomeLimpo = nome.trim();
    setNome('');
    setFuncao('');
    escolher({ tipo: 'membro', membroId: r.valor }, nomeLimpo);
  };

  const opcoes: Array<{ chave: string; id: Identidade; nome: string; detalhe: string | null }> = [
    ...membros.map((m) => ({
      chave: m.id,
      id: { tipo: 'membro' as const, membroId: m.id },
      nome: m.nome,
      detalhe: m.funcao || 'Equipe CX',
    })),
    { chave: 'diretoria', id: { tipo: 'diretoria' }, nome: 'Diretoria', detalhe: 'Acompanha os processos' },
  ];

  return (
    <Modal
      open={aberto}
      onClose={fechar}
      dismissible={!precisaEscolher}
      size="sm"
      icon={<UserRound className="h-4 w-4" />}
      title="Quem está usando?"
      description="Seu nome fica registrado nos andamentos e nas alterações. Dá para trocar depois, no canto superior direito."
    >
      <div className="divide-y divide-hairline">
        {opcoes.map((o) => (
          <Row key={o.chave} onClick={() => escolher(o.id, o.nome)} className="group">
            <div className="flex items-center gap-3 px-5 py-3">
              <Avatar nome={o.nome} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-ink">{o.nome}</p>
                {o.detalhe && <p className="truncate text-[12px] text-ink-3">{o.detalhe}</p>}
              </div>
              {mesmaPessoa(o.id, pessoa) && <Tag>Você</Tag>}
            </div>
          </Row>
        ))}
      </div>

      <div className="border-t border-hairline px-5 py-4">
        {mostrarForm ? (
          <form onSubmit={cadastrar} className="space-y-3">
            <p className="text-[12px] leading-relaxed text-ink-3">
              {equipeVazia
                ? 'A equipe CX ainda não foi cadastrada. Adicione seu nome para começar; os colegas fazem o mesmo quando abrirem o sistema.'
                : 'Adicione seu nome à equipe CX.'}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Nome" required error={erro}>
                {(id) => (
                  <TextInput
                    id={id}
                    value={nome}
                    autoComplete="name"
                    data-autofocus={equipeVazia || undefined}
                    onChange={(e) => {
                      setNome(e.target.value);
                      setErro(null);
                    }}
                  />
                )}
              </Field>
              <Field label="Função">
                {(id) => <TextInput id={id} value={funcao} onChange={(e) => setFuncao(e.target.value)} />}
              </Field>
            </div>
            <div className="flex justify-end">
              <Button type="submit" variant={equipeVazia ? 'primary' : 'secondary'} size="sm" disabled={!nome.trim()}>
                Adicionar e entrar
              </Button>
            </div>
          </form>
        ) : (
          <LinkButton onClick={() => setFormAberto(true)}>
            <Plus className="h-3.5 w-3.5" />
            Não estou na lista
          </LinkButton>
        )}
      </div>
    </Modal>
  );
}
