/**
 * Configurações: tudo o que molda os processos, num só lugar. Cada seção é
 * uma aba com endereço próprio (#/configuracoes/equipe), para dar para mandar
 * o link direto.
 */
import { AnimatePresence, motion } from 'motion/react';
import { navegar, rotas, type SecaoConfig } from '../../app/router';
import { PageHeader, Tabs, type TabItem } from '../../components/ui/Surfaces';
import { ativos } from '../../domain/config';
import { useConfig } from '../../hooks/useStore';
import { enterFast, exitFast } from '../../lib/motion';
import { ListaEditavel } from './ListaEditavel';
import { AparenciaSecao } from './secoes/AparenciaSecao';
import { BackupSecao } from './secoes/BackupSecao';
import { EtapasSecao } from './secoes/EtapasSecao';

function Secao({ secao }: { secao: SecaoConfig }) {
  switch (secao) {
    case 'etapas':
      return <EtapasSecao />;
    case 'equipe':
      return (
        <ListaEditavel
          lista="membros"
          textos={{
            titulo: 'Equipe CX',
            subtitulo: 'As pessoas que aparecem como responsáveis pelos processos e como autoras dos registros.',
            vazio: 'Cadastre as pessoas da equipe CX para escolher responsáveis nos processos.',
            placeholderNome: 'Nome',
          }}
        />
      );
    case 'setores':
      return (
        <ListaEditavel
          lista="setores"
          textos={{
            titulo: 'Setores',
            subtitulo: 'Setores da instituição que podem ser donos de um processo.',
            vazio: 'Cadastre os setores da instituição que podem ser donos de processos.',
            placeholderNome: 'Nome do setor',
          }}
        />
      );
    case 'origens':
      return (
        <ListaEditavel
          lista="origens"
          textos={{
            titulo: 'Origens da demanda',
            subtitulo: 'De onde uma demanda pode chegar ao CX.',
            vazio: 'Cadastre de onde as demandas podem chegar ao CX.',
            placeholderNome: 'Nova origem',
          }}
        />
      );
    case 'niveis':
      return (
        <div className="grid gap-4 lg:grid-cols-2">
          <ListaEditavel
            lista="prioridades"
            ordenavel
            textos={{
              titulo: 'Prioridade',
              subtitulo: 'Do menor para o maior. Nos processos, o mais alto aparece em vermelho, os do meio em amarelo e o primeiro em cinza.',
              vazio: 'Cadastre os níveis de prioridade, do menor para o maior.',
              placeholderNome: 'Novo nível',
            }}
          />
          <ListaEditavel
            lista="impactos"
            ordenavel
            textos={{
              titulo: 'Impacto no aluno',
              subtitulo: 'Do menor para o maior. O nível mais alto aparece destacado nos processos.',
              vazio: 'Cadastre os níveis de impacto, do menor para o maior.',
              placeholderNome: 'Novo nível',
            }}
          />
        </div>
      );
    case 'aparencia':
      return <AparenciaSecao />;
    case 'backup':
      return <BackupSecao />;
  }
}

export function ConfiguracoesPage({ secao }: { secao: SecaoConfig }) {
  const config = useConfig();

  const abas: TabItem<SecaoConfig>[] = [
    { id: 'etapas', label: 'Etapas', count: config.etapas.length },
    { id: 'equipe', label: 'Equipe', count: ativos(config.membros).length },
    { id: 'setores', label: 'Setores', count: ativos(config.setores).length },
    { id: 'origens', label: 'Origens', count: ativos(config.origens).length },
    { id: 'niveis', label: 'Prioridade e impacto' },
    { id: 'aparencia', label: 'Aparência' },
    { id: 'backup', label: 'Backup' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configurações"
        description="O fluxo de etapas, as listas usadas nos processos, a aparência e o backup dos dados. O que muda aqui vale para todos os processos."
      >
        <Tabs
          items={abas}
          value={secao}
          onChange={(s) => navegar(rotas.configuracoes(s), { substituir: true })}
          layoutId="config-abas"
          label="Seções das configurações"
        />
      </PageHeader>

      <div className="max-w-4xl">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={secao}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: enterFast }}
            exit={{ opacity: 0, transition: exitFast }}
          >
            <Secao secao={secao} />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
