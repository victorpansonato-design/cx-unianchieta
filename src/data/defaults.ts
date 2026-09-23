/**
 * Configuração inicial.
 *
 * Tudo aqui foi confirmado pela equipe CX — não é dado de exemplo. Equipe e
 * setores começam vazios de propósito: quem abre o sistema pela primeira vez
 * é guiado a cadastrá-los. Nenhum processo, pessoa ou número é criado.
 */
import { agoraISO } from '../lib/dates';
import { uid } from '../lib/ids';
import type { Config, Etapa, ItemLista, Meta } from './types';

const ETAPAS: Array<Omit<Etapa, 'id' | 'tarefasPadrao'>> = [
  {
    nome: 'Demanda identificada',
    descricao: 'Registre de onde veio a demanda e qual problema o aluno sente.',
    sinal: null,
  },
  {
    nome: 'Mapeamento do cenário atual',
    descricao:
      'Anexe o diagrama e o BPMN do escritório de processos e descreva como o processo funciona hoje.',
    sinal: null,
  },
  {
    nome: 'Diagnóstico',
    descricao: 'Liste as dores observadas e o efeito na experiência do aluno.',
    sinal: null,
  },
  {
    nome: 'Proposta de melhoria',
    descricao: 'Monte o fluxo proposto e, se houver, informe o link do protótipo.',
    sinal: null,
  },
  {
    nome: 'Apresentação à diretoria',
    descricao: 'Leve o resumo impresso e registre o retorno da diretoria nos andamentos.',
    sinal: 'diretoria',
  },
  {
    nome: 'Encaminhado ao TI',
    descricao: 'Registre o que foi pedido ao TI e o módulo do Lyceum envolvido.',
    sinal: 'ti',
  },
  {
    nome: 'Em implantação',
    descricao: 'Acompanhe as tarefas de implantação com o TI.',
    sinal: 'ti',
  },
  {
    nome: 'Em acompanhamento',
    descricao: 'Compare os indicadores de antes e depois.',
    sinal: null,
  },
  {
    nome: 'Concluído',
    descricao: 'Processo encerrado. O histórico fica disponível para consulta.',
    sinal: null,
  },
];

const ORIGENS = [
  'Ouvidoria',
  'Atendimento ao aluno',
  'Solicitação da diretoria',
  'Análise interna do CX',
  'Feedbacks de outros setores internos',
];

const PRIORIDADES = ['Baixa', 'Média', 'Alta'];
const IMPACTOS = ['Baixo', 'Médio', 'Alto'];

function itens(nomes: string[]): ItemLista[] {
  return nomes.map((nome) => ({ id: uid(), nome }));
}

export function criarConfigInicial(): Config {
  return {
    etapas: ETAPAS.map((e) => ({ id: uid(), ...e, tarefasPadrao: [] })),
    membros: [],
    setores: [],
    origens: itens(ORIGENS),
    prioridades: itens(PRIORIDADES),
    impactos: itens(IMPACTOS),
  };
}

export function criarMetaInicial(schemaVersion: number): Meta {
  return { schemaVersion, proximoNumero: 1, ultimoBackup: null, criadoEm: agoraISO() };
}
