/**
 * Raiz: carrega os dados, monta os provedores (confirmação, avisos) e escolhe
 * a tela pela rota. As telas de apresentação e impressão rodam fora do shell.
 */
import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { IdentityGate } from './app/IdentityGate';
import { NaoEncontrada } from './app/NaoEncontrada';
import { Shell } from './app/Shell';
import { useRota, type Rota } from './app/router';
import { Card, EmptyState, Skeleton } from './components/ui/Surfaces';
import { ConfirmProvider } from './components/ui/Overlay';
import { ToastProvider, useToast } from './components/ui/Toast';
import { store } from './data';
import { ConfiguracoesPage } from './features/configuracoes/ConfiguracoesPage';
import { DemandasPage } from './features/demandas/DemandasPage';
import { MeuTrabalhoPage } from './features/meu-trabalho/MeuTrabalhoPage';
import { NotasPage } from './features/notas/NotasPage';
import { PainelPage } from './features/painel/PainelPage';
import { ComparacaoPage } from './features/processo/ComparacaoPage';
import { ProcessoPage } from './features/processo/ProcessoPage';
import { ResumoImpressao } from './features/processo/ResumoImpressao';
import { ConcluidosPage } from './features/processos/ConcluidosPage';
import { ProcessosPage } from './features/processos/ProcessosPage';
import { RelatorioGeral } from './features/relatorio/RelatorioGeral';
import { useStore } from './hooks/useStore';

function Tela({ rota }: { rota: Rota }) {
  switch (rota.nome) {
    case 'painel':
      return <PainelPage />;
    case 'meu-trabalho':
      return <MeuTrabalhoPage />;
    case 'processos':
      return <ProcessosPage query={rota.query} />;
    case 'concluidos':
      return <ConcluidosPage query={rota.query} />;
    case 'processo':
      return <ProcessoPage codigo={rota.codigo} aba={rota.aba} concluido={rota.concluido} />;
    case 'demandas':
      return <DemandasPage demandaId={rota.demandaId} />;
    case 'notas':
      return <NotasPage notaId={rota.notaId} />;
    case 'configuracoes':
      return <ConfiguracoesPage secao={rota.secao} />;
    case 'comparacao':
    case 'resumo':
    case 'relatorio':
    case 'nao-encontrada':
      return <NaoEncontrada />;
  }
}

/** Telas sem o shell: projetar na reunião e imprimir. */
function TelaSemShell({ rota }: { rota: Rota }) {
  if (rota.nome === 'comparacao') return <ComparacaoPage codigo={rota.codigo} />;
  if (rota.nome === 'resumo') return <ResumoImpressao codigo={rota.codigo} />;
  if (rota.nome === 'relatorio') return <RelatorioGeral />;
  return null;
}

const SEM_SHELL: ReadonlyArray<Rota['nome']> = ['comparacao', 'resumo', 'relatorio'];

/** Uma gravação que falhar vira um aviso — nunca some em silêncio. */
function AvisoDeFalhas() {
  const toast = useToast();
  useEffect(
    () => store.aoFalhar((mensagem) => toast({ title: 'Não foi possível salvar', description: mensagem, tone: 'crit' })),
    [toast],
  );
  return null;
}

function Carregando() {
  return (
    <div className="flex min-h-screen bg-canvas" aria-busy="true" aria-label="Carregando">
      <div className="hidden h-screen w-[244px] shrink-0 flex-col gap-3 bg-surface p-4 md:flex">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="mt-6 h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
      <div className="flex-1 space-y-4 px-4 py-24 sm:px-8">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    </div>
  );
}

function FalhaAoAbrir({ mensagem }: { mensagem: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas p-4">
      <Card padded={false} className="w-full max-w-md">
        <EmptyState icon={<AlertTriangle className="h-5 w-5" />} title="Não foi possível abrir o sistema" message={mensagem} />
      </Card>
    </div>
  );
}

export default function App() {
  const carga = useStore((e) => e.carga);
  const erroCarga = useStore((e) => e.erroCarga);
  const rota = useRota();

  if (carga === 'carregando') return <Carregando />;
  if (carga === 'falhou') return <FalhaAoAbrir mensagem={erroCarga ?? 'Erro desconhecido.'} />;

  return (
    <ToastProvider>
      <ConfirmProvider>
        <AvisoDeFalhas />
        {SEM_SHELL.includes(rota.nome) ? (
          <TelaSemShell rota={rota} />
        ) : (
          <Shell rota={rota}>
            <Tela rota={rota} />
          </Shell>
        )}
        <IdentityGate />
      </ConfirmProvider>
    </ToastProvider>
  );
}
