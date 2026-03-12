# 🎮 Projeto: Pop Guess (Adivinhação de Cultura Pop)

### Inspirado no modo "Pop Sauce" do JKLM (referência estrutural), mas construído com mecânicas inéditas e um visual premium, moderno e vibrante.

---

# 📌 1. Visão Geral do Projeto (Atualizada)

Este projeto é um **jogo multiplayer online em tempo real**, acessado via navegador. O *Pop Guess* testa o conhecimento ágil dos jogadores sobre os mais variados formatos de cultura pop, incluindo cenas de filmes icônicos, cantores, atletas, memes, letras de música, animes e muito mais.

**O foco principal do jogo é:**
* **Competitividade em Tempo Real:** Ranking e placares sincronizados instantaneamente.
* **Respostas Ágeis com Inteligência:** O sistema quebra a rigidez de jogos de texto (ignora acentuação, casing e suporta dezenas de sinônimos/atalhos — como *GOT* para *Game of Thrones* ou *Curry* para *Stephen Curry*).
* **Escalabilidade Visual:** Utiliza um layout focado em animações fluidas (Framer Motion), estética Dark/Glassmorphism e acentos neon. Sem o aspecto engessado de "sites comuns".
* **Interação Social:** Bate-papo (Chat) real time unificado, tanto no Lobby quanto na hora da partida.

---

# 🧠 2. Mecânicas Centralizadas

## 🎯 A Rodada Padrão
1. A rodada se inicia com uma transição cinematográfica de "Prepare-se" (Countdown estático na tela para prevenir problemas visuais).
2. Uma Imagem ou Pergunta em Texto central surge na tela. 
   > *Obs: As imagens são curadas para não darem "spoilers" cruciais de logotipos, usando frames puros, fan-arts clássicas ou fundos limpos.*
3. Os jogadores disputam contra um cronômetro para enviar a resposta (pelo input na base da tela).
4. O valor dos pontos de uma resposta decai proporcionalmente conforme o relógio abaixa. Responder rápido = Mais Pontos.
5. Quando o tempo acaba, o resultado do vencedor e a resposta correta saltam na tela e o Ranking lateral se reordena fluídamente.

## 👥 Salas e Configurações Multiplayer
* **1 a 16 jogadores** por sala garantindo flexibilidade.
* **Sistema de Anfitrião (Host):**
  Apenas o criador da sala possui permissão de ajustar regras e disparar o Início. As configurações disponíveis no Lobby são:
  * **Alvo de Pontos (Condição de Vitória):** Curto (80 pts) | Médio (100 pts) | Padrão (120 pts) | Longo (140 pts) | Maratona (200 pts)
  * **Dificuldade:** Muito Fácil a Impossível (ou Todas as perguntas misturadas)
  * **Tempo por Rodada:** De 10s a 30s.

---

# 🎨 3. Stack Tecnológico e Arquitetura

* **Front-end:** Next.js 14+ (App Router) & React & TypeScript
* **Estilização:** TailwindCSS customizado com animações pontuais em CSS Puro (`.glass-card`, `.gradient-bg-animated`, etc).
* **Animações (UX/UI):** Framer Motion (Transições de abas, rankings mudando de lugar, modais pop-out e animação de acerto/erro no input de chat).
* **Ícones:** Lucide React.
* **Banco de Dados & Backend:** Supabase (PostgreSQL para dados estruturados, Realtime para sincronização dos clientes, e Auth/Anon key usage para conexões).
* **Storage de Imagens Premium (Performance):** Scripts Node customizados rodam no servidor contornando apis restritivas (TVMaze, Wikipedia, TMDB) usando parsers JSON para fazer download de imagens em alta definição e fazer o split upload para o próprio Bucket de Storage do Supabase do jogo. Isso impede Link Rotting (links velhos ou quebrados de APIs terceiras durante a jogatina) e resolve erros 403 silenciosos.

---

# 🖥️ 4. Fluxo de Telas (Current State)

### 4.1 Tela Home
* Acesso imediato: o usuário digita seu apelido, gera um avatar-emoji (que viaja com ele), e pode colocar o código para `Entrar` em sala ou `Criar` a sua.

### 4.2 Tela de Lobby (A Sala de Espera)
* Painel estético com código visível estilo "Token".
* O chat unificado na lateral direita para dar boas risadas antes do Host pressionar Start.
* Painel do Host com Dropdowns responsivos alterando variáveis da sala que sincronizam via websockets na tela de todos os convidados no mesmo instante.

### 4.3 Tela de Game Principal
* **Time Circular e Topbar:** Indicadores coloridos do "Alvo" máximo de pontos para fechar o jogo e em qual Round está.
* **Centro de Palco:** O Cardão com o título contextual da Imagem (Ex: "Qual série é essa?").
* **Colunas Laterais:** Ranking instantâneo que mostra avatares e nomes, organizados do 1º colocado ao último. E o log de Chat passando acima do input.
* **Respostas via Chat Inteligente:** Errar envia a frase no chat normal. Bater perto o sistema avisa secretamente o usuário que "Falta pouco!". Acertar aciona a pontuação.

### 4.4 Flow Final (WIP / Planejado)
* Animações finais que sobem as cortinas e validam quem atingiu a barra de Target Max Score para nomear o Campeão no pódio, seguido de um reset de partida suave.

---

# 🛡️ 5. Tratamento de Casos Reais (O Coração da Jogabilidade)
Foi adicionado um motor de "normalização de palavras":
* Todas as submissões removem acentos automaticamente (`Coração` = `coracao`).
* O banco de dados possuí um array `alternative_answers` e `hints` combinados, permitindo que a base preveja as respostas.
* Exemplo Prático de Banco de Dados Preenchido Corretamente:
  * Pergunta: "Quem é o ex-The Wtiher que interpreta Superman?"
  * Resposta Primária: `Henry Cavill`
  * Alias Aceitos: `["henry cavil", "cavil", "cavill", "superman"]`

# 🛸 6. Identidade e Diferencial Adotado
Um projeto vibrante com as cores principais girando em Roxo Dark (Backgrounds), Magenta Elétrico (Gradientes e Erros), Amarelo Neon (Pontuação/Destaque), Verde Neon (Sucesso) e Bluish Cyan escuro pros fundos Glass. As partículas ao fundo reagem levemente ao clima e tudo foge completamento dum dashboard maçante ou corporativo. É um *"Couch Party Game Digital"*. Em cada detalhe, do shake vermelho da caixa de digitação ao acertar em azul, há uma preocupação primária com  **Gamification Visual e Satisfatória**.
