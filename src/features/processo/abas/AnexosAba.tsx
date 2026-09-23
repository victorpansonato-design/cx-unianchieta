/** Anexos: todos os arquivos do processo num lugar só, inclusive os do antes e depois. */
import { useState } from 'react';
import { AreaDeArquivos, LinhaDeAnexo, VisualizadorAnexo } from '../../../components/domain/Anexos';
import { Card, CardHeader } from '../../../components/ui/Surfaces';
import { useToast } from '../../../components/ui/Toast';
import type { Anexo, Processo, Snapshot } from '../../../data/types';
import { anexosDoProcesso } from '../../../domain/anexos';
import { acoesAnexo } from '../../../services/acoes';

export function AnexosAba({ processo: p, s }: { processo: Processo; s: Snapshot }) {
  const toast = useToast();
  const [vendo, setVendo] = useState<Anexo | null>(null);
  const anexos = anexosDoProcesso(s, p.id);

  const anexar = async (arquivos: File[]) => {
    try {
      await acoesAnexo.anexar(p.id, arquivos, 'geral');
      toast({ title: arquivos.length > 1 ? `${arquivos.length} arquivos anexados.` : 'Arquivo anexado.' });
    } catch (e) {
      toast({ title: 'Não foi possível anexar.', description: e instanceof Error ? e.message : undefined, tone: 'crit' });
    }
  };

  return (
    <Card padded={false}>
      <CardHeader
        className="px-5 pt-5 pb-4"
        title="Anexos"
        subtitle="Todos os arquivos do processo, inclusive os do antes e depois. Ficam guardados neste navegador."
      />
      <div className="px-5 pb-4">
        <AreaDeArquivos onArquivos={anexar} />
      </div>
      {anexos.length > 0 && (
        <ul className="divide-y divide-hairline border-t border-hairline px-5">
          {anexos.map((a) => (
            <li key={a.id} className="py-2.5">
              <LinhaDeAnexo anexo={a} onVer={setVendo} />
            </li>
          ))}
        </ul>
      )}
      <VisualizadorAnexo anexo={vendo} onClose={() => setVendo(null)} />
    </Card>
  );
}
