# FMS+ — Filmes, Maratonas e Séries

Projeto inicial de streaming responsivo com HTML, CSS, JavaScript e Supabase.

## 1. Configure o Supabase

1. Crie um projeto no Supabase.
2. Abra SQL Editor.
3. Execute todo o conteúdo de `supabase.sql`.
4. Em Authentication, configure o método Email.
5. Registre sua conta pelo site.
6. Promova sua conta a administrador executando o SQL indicado no final de `supabase.sql`, substituindo seu e-mail.

## 2. Configure as credenciais

Abra `app.js` e substitua:

```js
const SUPABASE_URL = "YOUR_SUPABASE_URL";
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";
```

Use Project URL e anon/public key disponíveis em Project Settings > API.

**Nunca coloque a service_role key no navegador.**

## 3. Execute localmente

Use um servidor local (recomendado) em vez de abrir o arquivo diretamente:

```bash
python -m http.server 8000
```

Acesse `http://localhost:8000`.

## 4. Deploy

Publique os arquivos em Vercel, Netlify ou GitHub Pages. Para o fluxo mais simples, use Vercel/Netlify e configure seu projeto como site estático.

## Recursos

- Interface responsiva para celular e desktop.
- Ícones Lucide sem emojis.
- Liquid Glass na navegação e modais.
- Login e cadastro Supabase Auth.
- Catálogo público de conteúdos publicados (para usuários autenticados).
- FMS+ Studio para administradores.
- Upload de vídeos e capas.
- Publicação e despublicação.
- Player usando URL assinada do Storage.
- Pesquisa de catálogo.
- RLS no banco e políticas de Storage.

## Limitações desta versão

- Upload direto de vídeos grandes pode falhar por limites de upload do navegador/Storage; para arquivos grandes, implemente upload resumível (TUS) ou serviço de vídeo dedicado.
- O catálogo usa um registro por conteúdo. Temporadas/episódios, progresso, watchlist persistente, perfis múltiplos e transcodificação ainda precisam ser adicionados.
- Para o conteúdo ser visível a visitantes sem login, será necessário ajustar a política de leitura e a lógica de sessão.
- A reprodução depende do formato de vídeo compatível com o navegador.
