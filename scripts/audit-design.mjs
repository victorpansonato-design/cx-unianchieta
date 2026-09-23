#!/usr/bin/env node
/**
 * Auditoria do design system (docs/DESIGN_SYSTEM.md §14 e §16).
 *
 * Varre src/ procurando os anti-padrões que mais facilmente voltam com o
 * tempo: hex escrito no componente, classes `dark:`, `transition-all`,
 * `font-bold`, sombra fora de overlay, borda fechando forma, gradiente,
 * hover-lift, cor da paleta padrão do Tailwind no lugar de token, emoji.
 *
 * Uso: npm run audit:design — sai com código 1 se encontrar algo.
 * Para uma exceção legítima, acrescente-a em PERMITIDOS com o motivo.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const RAIZ = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const SRC = join(RAIZ, 'src');

/** Um token de classe isolado: precedido e seguido por espaço, aspas, crase ou fim. */
const cls = (padrao) => new RegExp(`(^|[\\s'"\`{])(${padrao})(?=[\\s'"\`}]|$)`);

const REGRAS = [
  {
    id: 'hex',
    msg: 'hex no componente — use um token semântico (§3)',
    re: /#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?(?:[0-9a-fA-F]{2})?\b(?!\/)/,
  },
  { id: 'dark', msg: 'classe dark: — o tema resolve por token (§3)', re: cls('dark:[\\w-]+') },
  { id: 'transition-all', msg: 'transition-all — use transition-colors (§8)', re: cls('transition-all') },
  {
    id: 'peso',
    msg: 'peso fora de 400/500/600 (§5)',
    re: cls('font-(?:bold|extrabold|black|light|thin|extralight)'),
  },
  { id: 'sombra', msg: 'sombra fora de overlay (Regra 5)', re: cls('shadow-(?:xs|sm|md|lg|xl|2xl)') },
  { id: 'borda', msg: 'borda fechando forma (Regra 1/2) — use contraste de superfície', re: cls('border|border-\\d') },
  { id: 'ring-moldura', msg: 'ring-1 como moldura — só o anel de foco desenha linha (§10.12)', re: cls('ring-1') },
  { id: 'gradiente', msg: 'gradiente decorativo (§14)', re: /bg-gradient-|bg-linear-|bg-radial-/ },
  { id: 'hover-lift', msg: 'hover-lift — use hover:bg-surface-hover + whileTap (§8)', re: /hover:-?(?:scale|translate)/ },
  { id: 'raio', msg: 'raio fora do sistema (Regra 3)', re: /rounded-\[|rounded-3xl|rounded-4xl/ },
  {
    id: 'paleta',
    msg: 'cor da paleta padrão do Tailwind — use um token (§3)',
    re: /\b(?:bg|text|border|fill|stroke|ring|divide|outline)-(?:red|blue|green|gray|slate|zinc|neutral|stone|orange|amber|yellow|lime|emerald|teal|cyan|sky|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b|\b(?:bg|text)-black\b/,
  },
  { id: 'emoji', msg: 'emoji na UI — use lucide-react (§2)', re: /\p{Extended_Pictographic}/u },
  {
    // `hidden` e `inline-flex` sem variante na mesma classe: quem vence é a ordem
    // na folha de estilo (inline-flex vem depois), não a intenção. Use um invólucro.
    id: 'display-conflito',
    msg: '`hidden` junto de outra classe de display sem variante — use um invólucro',
    re: /className=["'`](?=[^"'`]*(?:^|\s)hidden(?:\s|["'`]))(?=[^"'`]*(?:^|\s)(?:inline-flex|flex|block|grid|inline-block|inline-grid)(?:\s|["'`]))/,
  },
];

/** Exceções legítimas: [arquivo relativo, id da regra, trecho que identifica a linha, motivo]. */
const PERMITIDOS = [
  ['src/components/ui/Fields.tsx', 'sombra', 'rounded-full bg-white shadow-sm', 'thumb do Switch (§10.12)'],
];

function arquivos(dir) {
  return readdirSync(dir).flatMap((nome) => {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) return arquivos(caminho);
    return /\.(tsx?|jsx?)$/.test(nome) ? [caminho] : [];
  });
}

function ehComentario(linha) {
  const t = linha.trim();
  return t.startsWith('//') || t.startsWith('*') || t.startsWith('/*');
}

const achados = [];

for (const arquivo of arquivos(SRC)) {
  const rel = relative(RAIZ, arquivo).split(sep).join('/');
  const linhas = readFileSync(arquivo, 'utf8').split(/\r?\n/);
  linhas.forEach((linha, i) => {
    if (ehComentario(linha)) return;
    for (const regra of REGRAS) {
      if (!regra.re.test(linha)) continue;
      const permitido = PERMITIDOS.some(([a, id, trecho]) => a === rel && id === regra.id && linha.includes(trecho));
      if (permitido) continue;
      achados.push(`${rel}:${i + 1}  [${regra.id}] ${regra.msg}\n    ${linha.trim().slice(0, 140)}`);
    }
  });
}

if (achados.length > 0) {
  console.error(`\nAuditoria do design system: ${achados.length} ocorrência(s)\n`);
  for (const a of achados) console.error(a);
  console.error('');
  process.exit(1);
}

console.log('Auditoria do design system: nenhuma ocorrência. ✓');
