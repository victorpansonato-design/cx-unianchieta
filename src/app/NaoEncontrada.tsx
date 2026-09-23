import { Compass } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, EmptyState } from '../components/ui/Surfaces';
import { navegar, rotas } from './router';

export function NaoEncontrada({
  titulo = 'Página não encontrada',
  mensagem = 'O endereço pode ter mudado ou o registro pode ter sido removido.',
}: {
  titulo?: string;
  mensagem?: string;
}) {
  return (
    <Card padded={false}>
      <EmptyState
        icon={<Compass className="h-5 w-5" />}
        title={titulo}
        message={mensagem}
        action={
          <Button size="sm" onClick={() => navegar(rotas.painel())}>
            Voltar ao painel
          </Button>
        }
      />
    </Card>
  );
}
