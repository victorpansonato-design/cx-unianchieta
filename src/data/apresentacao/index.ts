/**
 * Base da apresentação à diretoria.
 *
 * Exceção pedida pela equipe à regra de começar vazio: a diretoria abre o
 * sistema no próprio navegador, então os processos da apresentação precisam
 * vir com o build. Só entram num navegador que ainda não tem dado nenhum —
 * quem já usa o sistema continua com o que tem.
 *
 * `dados.json` foi montado em 24/09/2026. As datas andam junto com o dia em
 * que o navegador abre o sistema pela primeira vez, para que "entrou hoje",
 * "amanhã" e "vencido há 23 dias" continuem valendo em qualquer dia.
 *
 * Para voltar a começar vazio: apague esta pasta, public/apresentacao/ e a
 * chamada em adapters/local/localRepository.ts.
 */
import { diasEntre, formatarData, paraDateOnly, somarDias } from '../../lib/dates';
import { normalizarSnapshot } from '../schema';
import type { Snapshot } from '../types';

const REFERENCIA = '2026-09-24';
/** O dia de referência, da meia-noite até o último registro (horário de Brasília). */
const INICIO_DA_REFERENCIA = new Date('2026-09-24T00:00:00-03:00').getTime();
const FIM_DA_REFERENCIA = new Date('2026-09-24T11:45:00-03:00').getTime();
const DIA_MS = 86_400_000;

export interface BaseDaApresentacao {
  snapshot: Snapshot;
  /** Arquivos anexados: id do anexo → caminho em public/. */
  arquivos: Record<string, string>;
}

/** Carregada à parte, só na primeira abertura: não pesa no carregamento de quem já usa o sistema. */
export async function carregarBaseDaApresentacao(agora = new Date()): Promise<BaseDaApresentacao> {
  const { default: dados } = await import('./dados.json');
  const hojeLocal = paraDateOnly(agora);
  const dias = diasEntre(REFERENCIA, hojeLocal);
  const inicioDeHoje = new Date(`${hojeLocal}T00:00:00`).getTime();
  // O que aconteceu "hoje" na referência cabe entre a meia-noite e agora,
  // na mesma ordem — nada aparece no futuro se o sistema abrir cedo.
  const escala = Math.min(1, (agora.getTime() - inicioDeHoje) / (FIM_DA_REFERENCIA - INICIO_DA_REFERENCIA));

  const momento = (iso: string | null) => {
    if (!iso) return iso;
    const t = new Date(iso).getTime();
    if (t >= INICIO_DA_REFERENCIA) return new Date(inicioDeHoje + (t - INICIO_DA_REFERENCIA) * escala).toISOString();
    return new Date(t + dias * DIA_MS).toISOString();
  };
  const data = (d: string | null) => (d ? somarDias(d, dias) : d);

  const s = normalizarSnapshot(dados);
  const snapshot: Snapshot = {
    ...s,
    processos: s.processos.map((p) => ({
      ...p,
      abertura: data(p.abertura)!,
      prazo: data(p.prazo),
      conclusao: data(p.conclusao),
      historicoEtapas: p.historicoEtapas.map((h) => ({ ...h, entrada: momento(h.entrada)! })),
      criadoEm: momento(p.criadoEm)!,
      atualizadoEm: momento(p.atualizadoEm)!,
    })),
    tarefas: s.tarefas.map((t) => ({
      ...t,
      prazo: data(t.prazo),
      concluidaEm: momento(t.concluidaEm),
      criadaEm: momento(t.criadaEm)!,
    })),
    andamentos: s.andamentos.map((a) => {
      const quando = momento(a.quando)!;
      const texto = a.tipo === 'situacao' && a.texto.startsWith('Processo concluído em ')
        ? `Processo concluído em ${formatarData(paraDateOnly(new Date(quando)))}.`
        : a.texto;
      return { ...a, texto, quando, criadoEm: momento(a.criadoEm)! };
    }),
    anexos: s.anexos.map((a) => ({ ...a, adicionadoEm: momento(a.adicionadoEm)! })),
    demandas: s.demandas.map((d) => ({
      ...d,
      recebidaEm: data(d.recebidaEm)!,
      criadaEm: momento(d.criadaEm)!,
      atualizadaEm: momento(d.atualizadaEm)!,
    })),
    notas: s.notas.map((n) => ({ ...n, criadaEm: momento(n.criadaEm)!, atualizadaEm: momento(n.atualizadaEm)! })),
    meta: { ...s.meta, criadoEm: momento(s.meta.criadoEm)!, ultimoBackup: agora.toISOString() },
  };
  const arquivos = Object.fromEntries(s.anexos.map((a) => [a.id, 'apresentacao/mapa-ouvidoria.pdf']));
  return { snapshot, arquivos };
}
