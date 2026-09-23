/**
 * Ponto de troca do armazenamento.
 *
 * Para ligar um banco compartilhado no futuro, escreva um adaptador que
 * implemente CxRepository (src/data/repository.ts) e troque a linha abaixo.
 * Nada mais no sistema precisa mudar. Ver docs/ARQUITETURA.md.
 */
import { criarRepositorioLocal } from './adapters/local/localRepository';
import { criarStore } from './store';

const repositorio = criarRepositorioLocal();

export const store = criarStore(repositorio);

export type { Op } from './ops';
export type { EstadoSalvamento, EstadoStore } from './store';
export * from './types';
