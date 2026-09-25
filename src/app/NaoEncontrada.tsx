import { Compass } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, EmptyState } from '../components/ui/Surfaces';
import { useIdentidade } from '../hooks/usePreferencias';
import { navegar, rotas } from './router';

export function NaoEncontrada({
  titulo = 'Página não encontrada',
  mensagem = 'O endereço pode ter mudado ou o registro pode ter sido removido.',
}: {
  titulo?: string;
  mensagem?: string;
}) {
  // Quem é do TI não tem painel: volta para a fila.
  const doTi = useIdentidade().pessoa?.tipo === 'ti';
  return (
    <Card padded={false}>
      <EmptyState
        icon={<Compass className="h-5 w-5" />}
        title={titulo}
        message={mensagem}
        action={
          <Button size="sm" onClick={() => navegar(doTi ? rotas.ti() : rotas.painel())}>
            {doTi ? 'Voltar à fila do TI' : 'Voltar ao painel'}
          </Button>
        }
      />
    </Card>
  );
}
