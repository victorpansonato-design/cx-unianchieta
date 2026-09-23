/**
 * Troca de tema com revelação circular.
 *
 * O tema novo aparece dentro de um círculo de borda nítida que nasce no centro
 * do botão que a pessoa apertou e cresce até o canto mais distante da tela; o
 * que o círculo ainda não alcançou continua parado no tema antigo. Curva e
 * duração foram medidas quadro a quadro no vídeo de referência (raio × tempo):
 * `ease` em ~630ms.
 *
 * Usa a View Transitions API: o navegador tira uma foto da tela no tema antigo,
 * aplica o novo e anima o recorte da camada nova. Sem suporte (ou com
 * "reduzir movimento" ligado), a troca é instantânea.
 */
import { flushSync } from 'react-dom';
import { definirTema, tema as prefTema, type Tema } from '../services/preferencias';

const DURACAO = 630;
const CURVA = 'cubic-bezier(0.25, 0.1, 0.25, 1)'; // `ease`

type DocumentoComTransicao = Document & {
  startViewTransition?: (atualizar: () => void) => { ready: Promise<void>; finished: Promise<void> };
};

/** Centro do elemento de origem; sem origem, o botão de tema do header; sem ele, o canto superior direito. */
function pontoDeOrigem(origem?: Element | null): { x: number; y: number } {
  const el = origem ?? document.querySelector('[data-alternar-tema]');
  if (el) {
    const r = el.getBoundingClientRect();
    if (r.width > 0) return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }
  return { x: window.innerWidth - 40, y: 36 };
}

export function trocarTema(novo: Tema, origem?: Element | null) {
  if (novo === prefTema.get()) return;
  const html = document.documentElement;

  // As cores dos componentes têm transition-colors de 150ms; durante a troca
  // elas mudariam em degradê dentro do círculo. Desligadas, a revelação é limpa.
  const aplicar = () => {
    html.classList.add('trocando-tema');
    flushSync(() => definirTema(novo));
  };
  const liberar = () => html.classList.remove('trocando-tema');

  const doc = document as DocumentoComTransicao;
  const reduzido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!doc.startViewTransition || reduzido) {
    aplicar();
    requestAnimationFrame(() => requestAnimationFrame(liberar));
    return;
  }

  const { x, y } = pontoDeOrigem(origem);
  const raio = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));

  const transicao = doc.startViewTransition(aplicar);
  transicao.ready
    .then(() => {
      html.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${raio}px at ${x}px ${y}px)`] },
        { duration: DURACAO, easing: CURVA, pseudoElement: '::view-transition-new(root)' },
      );
    })
    .catch(liberar);
  transicao.finished.finally(liberar);
}
