import { useRef } from 'react';
import { Moon, Sun } from 'lucide-react';
import { trocarTema } from '../../../app/transicaoDeTema';
import { Segmented } from '../../../components/ui/Fields';
import { Card, CardHeader } from '../../../components/ui/Surfaces';
import { useTema } from '../../../hooks/usePreferencias';
import type { Tema } from '../../../services/preferencias';

export function AparenciaSecao() {
  const tema = useTema();
  const controleRef = useRef<HTMLDivElement>(null);
  return (
    <Card>
      <CardHeader
        title="Tema"
        subtitle="Claro é o padrão. A escolha vale só para este navegador; cada pessoa escolhe o seu."
        action={
          <div ref={controleRef}>
            <Segmented<Tema>
              layoutId="config-tema"
              label="Tema"
              value={tema}
              // O círculo nasce da opção escolhida.
              onChange={(t) =>
                trocarTema(t, controleRef.current?.querySelector(`[data-valor="${t}"]`) ?? controleRef.current)
              }
              items={[
                { value: 'light', label: 'Claro', icon: <Sun className="h-3.5 w-3.5" /> },
                { value: 'dark', label: 'Escuro', icon: <Moon className="h-3.5 w-3.5" /> },
              ]}
            />
          </div>
        }
      />
    </Card>
  );
}
