/**
 * Backup: enquanto os dados morarem só no navegador, é a única proteção contra
 * perda e o único jeito de levar uma cópia para outra pessoa. A tela diz isso
 * com todas as letras.
 */
import { useEffect, useRef, useState } from 'react';
import { Download, HardDrive, ShieldCheck, Upload } from 'lucide-react';
import { Status } from '../../../components/ui/Badges';
import { Button, LinkButton } from '../../../components/ui/Button';
import { MeterBar } from '../../../components/ui/Charts';
import { Switch } from '../../../components/ui/Fields';
import { useConfirm } from '../../../components/ui/Overlay';
import { Callout, Card, CardHeader } from '../../../components/ui/Surfaces';
import { useToast } from '../../../components/ui/Toast';
import { useSnapshot } from '../../../hooks/useStore';
import { formatarMomento } from '../../../lib/dates';
import { formatarBytes } from '../../../lib/files';
import { plural } from '../../../lib/text';
import {
  ErroBackup,
  estimarEspaco,
  exportarBackup,
  importarBackup,
  lerArquivoDeBackup,
  pedirArmazenamentoPersistente,
  type EspacoUsado,
} from '../../../services/backup';

export function BackupSecao() {
  const snapshot = useSnapshot();
  const confirmar = useConfirm();
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [incluirAnexos, setIncluirAnexos] = useState(true);
  const [exportando, setExportando] = useState(false);
  const [importando, setImportando] = useState(false);
  const [espaco, setEspaco] = useState<EspacoUsado | null>(null);

  const atualizarEspaco = () => void estimarEspaco().then(setEspaco);
  useEffect(atualizarEspaco, [snapshot]);

  const exportar = async () => {
    setExportando(true);
    try {
      const { nomeArquivo, tamanho } = await exportarBackup({ incluirAnexos });
      toast({ title: 'Backup exportado.', description: `${nomeArquivo} · ${formatarBytes(tamanho)}` });
    } catch {
      toast({ title: 'Não foi possível exportar o backup.', tone: 'crit' });
    } finally {
      setExportando(false);
    }
  };

  const importar = async (arquivo: File) => {
    setImportando(true);
    try {
      const backup = await lerArquivoDeBackup(arquivo);
      const n = backup.snapshot.processos.length;
      const anexos = backup.snapshot.anexos.length;
      const origem = [
        backup.exportadoEm && `exportado em ${formatarMomento(backup.exportadoEm)}`,
        backup.exportadoPor && `por ${backup.exportadoPor}`,
      ]
        .filter(Boolean)
        .join(' ');
      const ok = await confirmar({
        title: 'Substituir os dados deste navegador?',
        tone: 'danger',
        confirmLabel: 'Substituir dados',
        message: (
          <div className="space-y-2">
            <p>
              O arquivo{origem ? `, ${origem},` : ''} tem {plural(n, 'processo', 'processos')}
              {anexos > 0 ? ` e ${plural(anexos, 'anexo', 'anexos')}` : ''}.
            </p>
            <p>Tudo o que está neste navegador agora será substituído pelo conteúdo do arquivo.</p>
            {!backup.arquivos && anexos > 0 && (
              <p>Este backup não inclui os arquivos anexados: eles só abrem se já estiverem neste navegador.</p>
            )}
          </div>
        ),
      });
      if (!ok) return;
      await importarBackup(backup);
      toast({ title: 'Backup importado.', description: `${plural(n, 'processo', 'processos')} carregados.` });
    } catch (erro) {
      toast({
        title: erro instanceof ErroBackup ? erro.message : 'Não foi possível importar este arquivo.',
        tone: 'crit',
      });
    } finally {
      setImportando(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const proteger = async () => {
    const ok = await pedirArmazenamentoPersistente();
    toast(
      ok
        ? { title: 'O navegador não vai apagar estes dados sozinho.' }
        : { title: 'O navegador não aceitou o pedido agora.', description: 'Continue exportando backups com frequência.' },
    );
    atualizarEspaco();
  };

  const ultimo = snapshot.meta.ultimoBackup;

  return (
    <div className="space-y-4">
      <Callout tone="warn" title="Os dados ficam só neste navegador">
        Quem usa outro computador ou outro navegador não vê o que está aqui. Exporte um backup com frequência e
        guarde o arquivo num lugar seguro: é ele que recupera os dados se o navegador for limpo, e é ele que leva
        uma cópia para outra pessoa importar.
      </Callout>

      <Card>
        <CardHeader
          title="Exportar backup"
          subtitle="Gera um arquivo com todos os processos, tarefas, andamentos e configurações."
        />
        <div className="mt-4">
          <Switch
            checked={incluirAnexos}
            onChange={setIncluirAnexos}
            label="Incluir anexos"
            description="Guarda também os PDFs, imagens e documentos anexados. O arquivo fica maior."
          />
        </div>
        <div className="mt-4 flex flex-col-reverse gap-3 border-t border-hairline pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[12px] text-ink-3">
            {ultimo ? `Último backup em ${formatarMomento(ultimo)}.` : 'Nenhum backup feito neste navegador ainda.'}
          </p>
          <Button variant="primary" icon={<Download className="h-4 w-4" />} onClick={exportar} disabled={exportando}>
            {exportando ? 'Exportando…' : 'Exportar backup'}
          </Button>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Importar backup"
          subtitle="Carrega um arquivo exportado por este sistema. Substitui todos os dados deste navegador."
          action={
            <Button
              size="sm"
              icon={<Upload className="h-3.5 w-3.5" />}
              onClick={() => inputRef.current?.click()}
              disabled={importando}
            >
              {importando ? 'Importando…' : 'Escolher arquivo…'}
            </Button>
          }
        />
        <input
          ref={inputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const arquivo = e.target.files?.[0];
            if (arquivo) void importar(arquivo);
          }}
        />
      </Card>

      <Card>
        <CardHeader
          title="Espaço usado"
          subtitle="Quanto do armazenamento do navegador este sistema ocupa, contando os anexos."
          action={<HardDrive className="h-4 w-4 text-ink-4" />}
        />
        {espaco ? (
          <div className="mt-4 space-y-2.5">
            <MeterBar
              value={espaco.usado}
              max={espaco.cota}
              tone={espaco.cota > 0 && espaco.usado / espaco.cota > 0.8 ? 'warn' : 'neutral'}
              label={`${formatarBytes(espaco.usado)} de ${formatarBytes(espaco.cota)} usados`}
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[12px] text-ink-3">
                <span className="font-mono text-ink-2">{formatarBytes(espaco.usado)}</span> de{' '}
                <span className="font-mono">{formatarBytes(espaco.cota)}</span> disponíveis neste navegador.
              </p>
              {espaco.persistente ? (
                <Status tone="quiet">
                  <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                  Protegido contra limpeza automática
                </Status>
              ) : (
                espaco.persistente === false && (
                  <LinkButton onClick={proteger}>
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Pedir ao navegador para não apagar estes dados
                  </LinkButton>
                )
              )}
            </div>
          </div>
        ) : (
          <p className="mt-3 text-[12px] text-ink-3">Este navegador não informa o espaço usado.</p>
        )}
      </Card>
    </div>
  );
}
