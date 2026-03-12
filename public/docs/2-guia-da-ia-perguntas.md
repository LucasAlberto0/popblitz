# 🤖 Guia de Criação e Inserção de Perguntas (Para IAs Futuras)

Este documento dita as regras, formatações e escopos de conhecimento que uma Inteligência Artificial deve seguir ao gerar, curar ou debugar perguntas para o banco de dados do **Pop Guess** (Nosso banco de Cultura Pop focado em adivinhação rápida de imagens e textos, inspirado estilisticamente no JKLM).

---

## 🎯 1. Filosofia das Perguntas

O jogo foi feito para ser ágil, competitivo e sem "spoilers visuais". Os jogadores digitam rápido.
* Não crie perguntas de múltipla escolha. A resposta sempre é digitada.
* O jogo suporta perguntas **apenas com texto** ou perguntas **completadas por imagens**.
* Priorize **MUITO MAIS** perguntas com imagens do que apenas texto. É a essência visual que atrai no "Pop Sauce".

---

## 📸 2. Regras Rígidas Para Imagens (ATENÇÃO, PARA DIFICULTAR O JOGO)

1. **PROIBIDO Capas e Pôsteres Oficiais:** Nunca, sob nenhuma hipótese, use imagens promocionais, capas de filmes/séries que contenham o **logotipo ou o título da obra escrito**. Isso entrega a resposta de bandeja (Ex: Uma foto de Supernatural gigante escrito "Supernatural").
2. **Prioridade MÁXIMA para *"Frames / Backdrops"***: Para filmes, séries e animes, **SEMPRE** pesquise e utilize um *screenshot* de uma cena do meio do episódio. O *background* perfeito é focado no ambiente e em um objeto ou em um enquadramento menos óbvio do personagem (Ex: Apenas as costas de um personagem icônico ou a arma no chão).
3. **Pergunta Genérica:** Ao atrelar um frame de cena, a pergunta deve ser intencionalmente genérica para forçar a pessoa a olhar a imagem. Use formulações do tipo:
   - *"De qual série foi tirada essa imagem/cena?"*
   - *"A qual obra este ambiente/frame pertence?"* 
   - *"Essa cena intensa aconteceu em qual anime?"*
   - Não escreva o enredo na pergunta quando tiver imagem. A imagem é o desafio primário.
4. **Imagens de Pessoas/Celebridades/Atletas:** Use avatares, fotos em shows (sem texto grande), fotos em coletivas ou recortes de Wikipedia de alta qualidade.
5. **Sem "Pistas Escritas":** Se uma cena animada ou de jogo tiver legendas grandes entregando a resposta, procure outra foto.

---

## 🛠 3. Estruturação no Banco de Dados Supabase (Tabela `question_pool`)

Para inserir ou atualizar novas perguntas massivamente, você deverá preparar o esquema correspondente à nossa tabela:
* `question` (text): A pergunta exibida na tela (Ex: *"Quem é este ator veterano de Hollywood?"*)
* `primary_answer` (text): A string resposta **exatamente formatada e capitalizada**, usada para exibir quem "Acertou" no painel de sucesso (Ex: *"Leonardo DiCaprio"*).
* `alternative_answers` (jsonb array): Atalhos, siglas, títulos abrasileirados ou erros de digitação comuns em caixa baixa (Ex: `["dicaprio", "leonardo di caprio"]`). O backend do jogo normatiza automaticamente removendo acentos, então `Coração` e `coracao` batem sozinhos, não precisa incluir versões sem acento, apenas nomes sinônimos.
* `difficulty` (text): Enum (`very_easy`, `easy`, `medium`, `hard`, `impossible`).
* `type` (text): `'image'` ou `'text'`.
* `image_url` (text): Link ABSOLUTO de uma imagem hospedada. *Se `type` for `'text'`, passe null.*
* `category` (text): Categorias como `'pop-culture'`, `'movies'`, `'music'`, `'games'`, `'sports'`, `'anime'`, `'brazil'`.

---

## 🌎 4. Temas, Exemplos e Categorias Sugeridas

Abaixo estão os guias de assuntos para a IA explorar. Lembre-se, seja *criativo e abrangente*!

### 🎬 Filmes e Séries (`movies` / `tv`)
* **Exemplo de Imagem:** Um frame de um balão e uma casa voando.
* **Pergunta:** "De qual animação da Pixar é esta cena lindíssima?"
* **Resposta Ideal:** `Up` | **Alt:** `["up altas aventuras", "up - altas aventuras"]`
* **Exemplo de Texto:** "Qual casa nobre de Game of Thrones possui o lema 'O Inverno Está Chegando'?"
* **Resposta:** `Stark` | **Alt:** `["casa stark", "starks"]`

### 🎮 Videogames (`games`)
* **Exemplo de Imagem:** Kratos de costas em um barco em God Of War (2018).
* **Pergunta:** "Quem é o famoso deus grego nesta imagem?"
* **Resposta:** `Kratos` | **Alt:** `["kratos", "god of war"]`
* **Exemplo de Imagem:** Printscreen gameplay retro num cenário quadrado esverdeado.
* **Pergunta:** "De qual aclamado jogo sandbox é esta imagem?"
* **Resposta:** `Minecraft` | **Alt:** `["mine"]`

### 🧑‍🎤 Celebridades Musicais e Cultura Pop (`music` / `pop-culture`)
* **Exemplo de Texto:** "Qual ícone pop canta a música que diz 'So wake me up when it's all over...'?"
* **Resposta:** `Avicii` | **Alt:** `[]`
* **Exemplo de Imagem:** Rihanna em uma premiação (Foto padrão).
* **Pergunta:** "Quem estrela a marca de beleza Fenty Beauty e produziu a música 'Umbrella'?"
* **Resposta Ideal:** `Rihanna` | **Alt:** `[]`

### ⚽ Esportes (`sports`)
* **Exemplo de Imagem:** Atleta Stephen Curry em postura de chute sem focar 100% no rosto para forçar reconhecimento pelas roupas.
* **Pergunta:** "Quem é este multicampeão de cestas de 3 pontos na NBA?"
* **Resposta:** `Stephen Curry` | **Alt:** `["curry", "steph", "steph curry"]`
* **Sugestões Reais:** Pilotos de F1 (Max Verstappen, Lewis Hamilton), Lendas de Tênis (Serena Williams), Futebol (Messi, Pelé, Neymar).

### 🇧🇷 Cultura e Referências Brasileiras (`brazil`)
* *(Aviso da Moderação: Apenas inclua como surpresas ocasionais. Não faça com que o jogo vire local-only!)*
* **Exemplo de Imagem:** Castelo Rá-Tim-Bum (O castelo em si).
* **Pergunta:** "Qual lendária série/programa educacional brasileiro se passava neste local?"
* **Resposta:** `Castelo Rá-Tim-Bum` | **Alt:** `["castelo ratimbum", "ratimbum"]`

---

## 🤖 5. Soluções e Scripts para a IA Executar

Quando a máquina (outra sessão de Agente/IA) precisar inserir dezenas de perguntas, ela não deve copiar URLs do Google Image Search (que caem/rooteiam facilmente retornando erro `403 Forbidden`).

**Passo a passo mandatário para inserir perguntas automatizada no Supabase:**
1. A IA deve gerar um script em *Node.js*.
2. O Script deve "hit-ar" de forma anônima APIs de cultura rest:
   - `TMDB API (The Movie Database)` para Filmes e Backdrops.
   - `TVMaze API` para Series Backdrops.
   - `Wikipedia Media Pages` (Thumbnails via JSON) para Celebridades, Games e Memes.
3. O script baixa o buffer das imagens destas APIs, as chuta para o Storage do Supabase (Bucket: `question-images`) do projeto do Alocador usando a Key Anônima.
4. O Storage retorna a **URL Definitiva da Imagem** hospedada para o jogo próprio (Ex: `https://.../storage/v1/object/public/question-images/rihanna-1234.jpg`).
5. A IA finalmente insere o array destas URLs no database via Inserção Postgres, atrelando as perguntas formuladas. 

*Seguir este manual garante que o pop-guess nunca fique com "imagens quebradas" nas rodadas.*
