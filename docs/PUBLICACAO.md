# Publicação no Funcionário Online

O sistema é um conjunto de arquivos estáticos. Não há servidor de aplicação nem banco nesta versão.

## Gerar o build

```bash
npm install
npm run check      # tipos + auditoria do design system + build
```

O resultado fica em `dist/`:

```
dist/
  index.html
  favicon.svg
  assets/index-<hash>.js
  assets/index-<hash>.css
```

## Publicar

Copie **todo o conteúdo de `dist/`** para qualquer pasta servida pelo servidor web, por exemplo
`https://…/funcionario-online/cx/`.

- **Qualquer subcaminho funciona.** O build usa caminhos relativos (`base: './'`).
- **Não é preciso configurar reescrita de URL.** As rotas vivem no hash (`…/cx/#/processos/CX-001`),
  e o servidor sempre entrega o mesmo `index.html`.
- **Cache:** os arquivos em `assets/` têm hash no nome e podem ter cache longo. O `index.html`
  deve ter cache curto ou nenhum, para as atualizações chegarem.

O controle de acesso ("apenas os selecionados têm acesso a esta aba") fica no Funcionário Online.
O sistema não tem login próprio. Na primeira abertura, a pessoa escolhe quem é, para registrar a
autoria.

## Pontos para o TI

### 1. Armazenamento e iframe

Os dados ficam no navegador (localStorage + IndexedDB), atrelados ao **endereço de onde o sistema é
servido**.

| Como o Funcionário Online abre o sistema | Efeito no armazenamento |
|---|---|
| Aba própria, ou iframe **no mesmo domínio** | normal |
| Iframe de **outro domínio** | Chrome e Edge isolam os dados por site. Funciona, mas os dados ficam presos àquele contexto. Safari e alguns bloqueios de privacidade podem **impedir** o armazenamento, e o sistema avisa que não conseguiu abrir os dados. |

**Recomendação:** servir no mesmo domínio do Funcionário Online, ou abrir em aba própria.

**Mudar o endereço muda a "gaveta".** Se o sistema trocar de domínio ou de porta, os dados do
endereço antigo não aparecem no novo. Nesse caso, exporte um backup antes e importe no endereço novo.

### 2. HTTP ou HTTPS

Funciona nos dois. O sistema não depende de recursos exclusivos de HTTPS. Os IDs usam
`crypto.getRandomValues`, e não `crypto.randomUUID`.

### 3. Fontes

A tipografia (Geist e Geist Mono) vem do Google Fonts. Se a política de segurança (CSP) ou a rede
bloquearem `fonts.googleapis.com` e `fonts.gstatic.com`, o sistema continua funcionando com a fonte
do sistema operacional. Para não depender de rede externa, dá para hospedar as fontes junto; basta
pedir.

### 4. CSP

Se o Funcionário Online aplicar Content-Security-Policy, o sistema precisa de:
- `script-src 'self' 'unsafe-inline'`: o `index.html` tem um script curto que aplica o tema antes
  do primeiro paint;
- `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`;
- `font-src https://fonts.gstatic.com`;
- `img-src 'self' blob: data:` e `frame-src blob:`: prévia de anexos.

### 5. Futuro: banco compartilhado

Quando houver um banco compartilhado, o front end não muda de lugar. Só ganha um adaptador novo
que conversa com a API. Ver [ARQUITETURA.md](ARQUITETURA.md).
