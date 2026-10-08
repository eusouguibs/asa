# Asa

App de escalas para ministérios de louvor: escalas, confirmação de presença, repertório, avisos e aniversariantes.

## Como funciona

- O app é um site que se instala no celular (no navegador: "Adicionar à tela de início").
- Os dados ficam no Supabase. A estrutura do banco está em `supabase/schema.sql`.
- As chaves públicas do Supabase ficam em `config.js`. Com os campos vazios, o app abre em modo demonstração.

## Arquivos

| Arquivo | Para que serve |
| --- | --- |
| `index.html` | Página que abre o app |
| `app.js` | Telas e navegação |
| `data.js` | Conversa com o banco de dados (e o modo demonstração) |
| `styles.css` | Visual do app |
| `config.js` | Endereço e chave pública do Supabase |
| `sw.js`, `manifest.webmanifest`, `icon.svg` | Permitem instalar o app na tela do celular |
| `supabase/schema.sql` | Tabelas e regras de acesso do banco |
