# Site do TCC — Gemini API + Vercel

Projeto estático em HTML/CSS/JavaScript, mantendo o visual escuro com detalhes ciano/roxo, animação neural, cards, quiz e desafio interativo. O chat usa uma função serverless em `/api/chat.js`; a chave Gemini é lida exclusivamente no servidor por `process.env.GEMINI_API_KEY`.

## Arquivos

- `index.html` — página principal e atividades interativas.
- `api/chat.js` — endpoint seguro do chat Gemini.
- `.gitignore` — evita publicar arquivos de ambiente e configurações locais.
- `.env.example` — exemplo sem uma chave real.

## Antes de publicar

1. Faça uma cópia/backup do repositório atual.
2. Copie o conteúdo de `index.html` para o `index.html` existente na raiz do repositório conectado à Vercel. Se o seu site usa outro arquivo como página inicial, adapte o nome em vez de apagar arquivos sem conferir.
3. Crie a pasta `api` na raiz do repositório e adicione `api/chat.js`.
4. Adicione ou atualize `.gitignore`. Não publique nenhuma chave real.
5. Envie as alterações ao GitHub. A Vercel normalmente cria um deploy Preview para branches diferentes da branch de produção e um deploy de produção ao atualizar a branch principal configurada.

## Criar uma chave Gemini

1. Acesse o Google AI Studio: https://aistudio.google.com/app/apikey
2. Crie uma chave para a API Gemini. Trate-a como senha.
3. Não cole a chave no HTML, JavaScript do navegador, GitHub, README, mensagens públicas ou no arquivo `.env.example`.

## Configurar a variável secreta na Vercel

1. Abra o projeto certo no painel da Vercel.
2. Vá a **Settings → Environment Variables**.
3. Crie uma variável com o nome exato `GEMINI_API_KEY` e cole o valor da chave como valor privado.
4. Marque pelo menos **Production**. Marque **Preview** também se quiser testar o chat nos deploys Preview.
5. Salve e faça um novo deploy (ou envie um novo commit). A variável só passa a valer em novos deploys.
6. Abra a URL do site e teste o chat. A chave não deve aparecer no HTML ou nas ferramentas do navegador.

Documentação: https://vercel.com/docs/environment-variables

## Publicar pelo GitHub conectado à Vercel

Se o repositório já está conectado ao projeto da Vercel:

1. Abra o repositório no GitHub e confirme qual branch é a de produção (geralmente `main`).
2. Envie `index.html`, `api/chat.js`, `.gitignore` e este README. Não substitua arquivos adicionais do projeto que você ainda usa.
3. Acompanhe **Deployments** no painel da Vercel. Abra primeiro o Preview, se disponível, e teste a página e o chat.
4. Depois de validar, faça merge/commit na branch de produção para publicar a versão final.

Se o projeto Vercel ainda não estiver conectado ao repositório, em Vercel use **Add New → Project**, importe o repositório GitHub e mantenha o diretório raiz como `./` quando os arquivos estiverem na raiz. Para este projeto simples, não é necessário um build command; o `index.html` e a função em `api/` são servidos pela Vercel.

## Testes após o deploy

- A página principal abre sem erro.
- Quiz e desafio funcionam sem precisar da chave Gemini.
- O chat responde a perguntas sobre IA, o TCC e TI.
- O botão “Limpar Chat” apaga o histórico apenas da conversa atual no navegador.
- Se o chat informar que a API não foi configurada, confira o nome `GEMINI_API_KEY`, o ambiente selecionado e se foi feito um novo deploy.
- Se a API retornar erro de cota, confira o uso/limites no Google AI Studio ou Google Cloud.

## Segurança e limites

- A chave fica no servidor e é enviada ao Google pela função serverless; não é exposta ao JavaScript público.
- A função limita o tamanho das mensagens e aplica uma limitação de frequência simples por instância. Essa limitação não é um sistema global de proteção contra abuso; para um site com tráfego elevado, use um rate limiter compartilhado e limites/quota no Google Cloud.
- Não peça aos visitantes que enviem senhas, documentos ou dados privados. Evite colocar informações pessoais no chat.
- As respostas são geradas por IA e podem conter erros. Para conteúdo específico do trabalho, confira o TCC original.
- A API Gemini pode ter limites ou custos de acordo com a conta, modelo e condições vigentes. Confira o painel do Google antes de deixar o chat público por longos períodos.
Atualização para testar o deploy
## Desenvolvimento local (opcional)

Uma página aberta diretamente como `file://` não consegue executar `/api/chat`. Para testar a função localmente, instale Node.js e a CLI da Vercel, faça login e rode `vercel dev` na pasta do projeto. Configure `GEMINI_API_KEY` no ambiente local sem publicar esse segredo. Nunca adicione a chave real ao Git.
