# Wireframes Verbais — PWA Reserva de Matrícula Escolar

---

### 1. Onboarding (3 slides)

**Layout geral**
- Tela cheia, sem header nem tab bar
- Fundo branco
- Estrutura: topo vazio, centro com ilustração e texto, rodapé com indicador de páginas e botões

**Topo (Header)**
- Vazio, apenas respiro de espaço
- Botão "Pular" no canto superior direito, texto simples

**Conteúdo principal**
- Ilustração grande centralizada (ocupa metade da tela)
- Título em destaque, centralizado, abaixo da ilustração
- Descrição curta (1–2 linhas), texto simples, centralizada, abaixo do título
- Slide 1: ilustração de família + escola — título "Solicite a matrícula em minutos" — descrição "Escolha a turma e envie sua solicitação direto pelo celular"
- Slide 2: ilustração de notificação/sino — título "Acompanhe tudo em tempo real" — descrição "Receba avisos assim que sua solicitação for analisada"
- Slide 3: ilustração de wi-fi cortado — título "Funciona até sem internet" — descrição "Suas solicitações são enviadas automaticamente quando a conexão voltar"

**Rodapé / Navegação**
- Indicador de páginas: 3 bolinhas centralizadas, bolinha ativa preenchida
- Botão outline "Pular" (só nos slides 1 e 2, canto ou lado esquerdo do rodapé)
- Botão cheio "Próximo" (lado direito); no slide 3 o texto muda para "Começar"

**Ações do usuário**
- Deslizar entre slides
- Pular direto para o login
- Avançar slide a slide até finalizar e ir para o login

---

### 2. Login

**Layout geral**
- Tela cheia, sem header, sem tab bar
- Fundo branco
- Estrutura: topo com logo, centro com formulário, rodapé com link de cadastro

**Topo (Header)**
- Logo/ícone do app centralizado
- Abaixo do logo, texto simples: "Entrar na sua conta"

**Conteúdo principal**
- Input com border-bottom: "E-mail"
- Input com border-bottom: "Senha" (com ícone de olho para mostrar/ocultar)
- Texto simples alinhado à direita: "Esqueci minha senha"
- Botão cheio, largura total: "Entrar"
- Divisor com texto centralizado: "ou"
- Aviso de erro (quando houver): texto vermelho pequeno acima do botão

**Rodapé / Navegação**
- Texto simples centralizado: "Ainda não tem conta?" + botão outline ou link em destaque: "Cadastre-se"

**Ações do usuário**
- Preencher e-mail/senha e entrar
- Tocar em "Esqueci minha senha"
- Ir para tela de Cadastro

---

### 3. Cadastro

**Layout geral**
- Tela cheia, com header simples (seta de voltar)
- Fundo branco
- Estrutura: topo com voltar, centro com formulário, rodapé com botão de ação

**Topo (Header)**
- Ícone de seta "voltar" no canto superior esquerdo
- Título centralizado: "Criar conta"

**Conteúdo principal**
- Texto simples: "Preencha seus dados de responsável"
- Input com border-bottom: "Nome completo"
- Input com border-bottom: "E-mail"
- Input com border-bottom: "Senha"
- Input com border-bottom: "Confirmar senha"
- Aviso de erro (quando houver): texto vermelho pequeno abaixo do campo correspondente

**Rodapé / Navegação**
- Botão cheio, largura total: "Criar conta"
- Texto simples centralizado: "Já tem conta? Entrar" (link para Login)

**Ações do usuário**
- Preencher formulário e criar conta
- Voltar para o Login

---

### 4. Home (Pais)

**Layout geral**
- Tela com header e tab bar inferior
- Fundo cinza claro (destaca os cards brancos)
- Estrutura: topo com saudação, centro com resumo e atalhos, rodapé com tab bar

**Topo (Header)**
- Alinhado à esquerda: "Olá, [Nome do responsável]"
- Alinhado à direita: ícone de sino (notificações), com bolinha vermelha se houver não lidas

**Conteúdo principal**
- Card com sombra leve no topo: contador simples — "Você tem X solicitação(ões) em andamento"
- Lista vertical curta (até 3 itens) com as solicitações mais recentes: cada item é um card com nome do aluno, turma, e uma etiqueta de status colorida (amarelo = pendente, verde = aprovada, vermelho = recusada)
- Texto simples "Ver todas" alinhado à direita, abaixo da lista
- Se não houver nenhuma solicitação: ilustração pequena + texto simples "Você ainda não fez nenhuma solicitação"

**Rodapé / Navegação**
- Floating button no canto inferior direito, ícone de "+": nova solicitação
- Tab bar com ícones: Início (ativo), Solicitações, Notificações, Perfil

**Ações do usuário**
- Ver resumo das solicitações
- Tocar em uma solicitação para ver detalhe
- Iniciar nova solicitação pelo botão flutuante
- Navegar pela tab bar

---

### 5. Minhas Solicitações

**Layout geral**
- Tela com header e tab bar inferior
- Fundo cinza claro
- Estrutura: topo com título e filtro, centro com lista, rodapé com tab bar

**Topo (Header)**
- Título centralizado: "Minhas Solicitações"
- Abaixo do título, linha de filtros horizontais (chips): "Todas", "Pendente", "Aprovada", "Recusada"

**Conteúdo principal**
- Lista vertical de cards, um por solicitação
- Cada card: nome do aluno (destaque), nome da turma (texto simples menor), etiqueta de status colorida no canto direito, data da solicitação em texto pequeno no rodapé do card
- Se offline e a solicitação ainda não sincronizou: etiqueta extra discreta "Aguardando sincronização"
- Se a lista estiver vazia (filtro sem resultado): texto simples centralizado "Nenhuma solicitação encontrada"

**Rodapé / Navegação**
- Floating button no canto inferior direito, ícone de "+": nova solicitação
- Tab bar com ícones: Início, Solicitações (ativo), Notificações, Perfil

**Ações do usuário**
- Filtrar por status
- Tocar em um card para abrir o detalhe
- Iniciar nova solicitação

---

### 6. Detalhe da Solicitação

**Layout geral**
- Tela cheia, com header simples (seta de voltar), sem tab bar
- Fundo branco
- Estrutura: topo com voltar, centro com informações em blocos, rodapé com ação condicional

**Topo (Header)**
- Ícone de seta "voltar" no canto superior esquerdo
- Título centralizado: "Detalhes da solicitação"

**Conteúdo principal**
- Etiqueta de status grande, centralizada, colorida (amarelo/verde/vermelho), com o texto do status
- Card com sombra leve: "Aluno" (título pequeno) + nome do aluno (texto grande)
- Card com sombra leve: "Turma" (título pequeno) + nome da turma + turno
- Card com sombra leve: "Data da solicitação" (título pequeno) + data/hora
- Se status = Recusada: card adicional com fundo levemente vermelho: "Motivo da recusa" (título pequeno) + texto da justificativa
- Se status = Aprovada: texto simples informativo abaixo dos cards: "Procure a secretaria para finalizar a matrícula presencialmente"

**Rodapé / Navegação**
- Se status = Pendente: botão outline, largura total: "Cancelar solicitação"
- Se status ≠ Pendente: rodapé vazio (sem ação disponível)

**Ações do usuário**
- Ler os detalhes da solicitação
- Cancelar a solicitação (somente se pendente)
- Voltar para a lista

---

### 7. Seleção de Curso/Turma

**Layout geral**
- Tela cheia, com header simples (seta de voltar), sem tab bar
- Fundo branco
- Estrutura: topo com voltar e progresso, centro com lista de turmas, rodapé com botão de avançar

**Topo (Header)**
- Ícone de seta "voltar" no canto superior esquerdo
- Título centralizado: "Escolha a turma"
- Abaixo do título: indicador de progresso simples, texto "Passo 1 de 3"

**Conteúdo principal**
- Lista vertical de cards com sombra leve, um por turma
- Cada card: nome da turma (destaque), turno (texto simples menor) — sem qualquer menção a vagas
- Card selecionado fica com borda colorida de destaque
- Se a turma estiver inativa/fechada: card com opacidade reduzida e etiqueta "Encerrada" (não selecionável)

**Rodapé / Navegação**
- Botão cheio, largura total: "Continuar" (desabilitado até uma turma ser selecionada)

**Ações do usuário**
- Selecionar uma turma
- Avançar para o próximo passo
- Voltar

---

### 8. Cadastro de Aluno

**Layout geral**
- Tela cheia, com header simples (seta de voltar), sem tab bar
- Fundo branco
- Estrutura: topo com voltar e progresso, centro com formulário, rodapé com botão de avançar

**Topo (Header)**
- Ícone de seta "voltar" no canto superior esquerdo
- Título centralizado: "Dados do aluno"
- Abaixo do título: indicador de progresso, texto "Passo 2 de 3"

**Conteúdo principal**
- Texto simples: "Turma selecionada: [nome da turma] · [turno]" (lembrete do passo anterior, texto pequeno em card discreto)
- Input com border-bottom: "Nome completo do aluno"
- Aviso de erro (quando houver): texto vermelho pequeno abaixo do campo

**Rodapé / Navegação**
- Botão cheio, largura total: "Continuar" (desabilitado até o nome ser preenchido)

**Ações do usuário**
- Preencher o nome do aluno
- Avançar para a confirmação
- Voltar para trocar a turma

---

### 9. Confirmação de Solicitação

**Layout geral**
- Tela cheia, com header simples (seta de voltar), sem tab bar
- Fundo branco
- Estrutura: topo com voltar e progresso, centro com resumo, rodapé com botão de enviar

**Topo (Header)**
- Ícone de seta "voltar" no canto superior esquerdo
- Título centralizado: "Confirme sua solicitação"
- Abaixo do título: indicador de progresso, texto "Passo 3 de 3"

**Conteúdo principal**
- Card com sombra leve, resumo em lista vertical:
  - "Aluno" + nome preenchido
  - "Turma" + nome + turno
- Texto simples de aviso, ícone de informação ao lado: "Após enviar, a coordenação irá analisar sua solicitação"
- Se estiver offline: faixa discreta no topo do conteúdo, fundo cinza, texto: "Sem conexão — sua solicitação será enviada assim que a internet voltar"

**Rodapé / Navegação**
- Botão cheio, largura total: "Enviar solicitação"

**Ações do usuário**
- Revisar os dados antes de enviar
- Confirmar e enviar a solicitação
- Voltar para corrigir algum dado

---

### 10. Notificações

**Layout geral**
- Tela com header e tab bar inferior
- Fundo cinza claro
- Estrutura: topo com título, centro com lista, rodapé com tab bar

**Topo (Header)**
- Título centralizado: "Notificações"

**Conteúdo principal**
- Lista vertical de cards, um por notificação
- Cada card: ícone à esquerda (sino para status, calendário para período de matrícula), título em destaque, texto simples abaixo (corpo da notificação), data/hora pequena no canto direito
- Notificação não lida: card com uma bolinha colorida no canto esquerdo e fundo levemente destacado
- Se a lista estiver vazia: ilustração pequena + texto simples "Nenhuma notificação por enquanto"

**Rodapé / Navegação**
- Tab bar com ícones: Início, Solicitações, Notificações (ativo), Perfil

**Ações do usuário**
- Tocar em uma notificação para marcar como lida e ir ao detalhe relacionado (quando aplicável)
- Rolar a lista

---

### 11. Perfil

**Layout geral**
- Tela com header e tab bar inferior
- Fundo cinza claro
- Estrutura: topo com dados do usuário, centro com opções em lista, rodapé com tab bar

**Topo (Header)**
- Ícone de avatar circular centralizado (inicial do nome)
- Nome completo abaixo do avatar, centralizado, texto grande
- E-mail abaixo do nome, centralizado, texto pequeno

**Conteúdo principal**
- Lista vertical de opções, cada uma como uma linha simples com ícone à esquerda e texto ao lado:
  - "Minhas Solicitações"
  - "Notificações"
  - "Ajuda / Fale conosco"
- Cada linha com seta ">" no canto direito

**Rodapé / Navegação**
- Botão outline, largura total, cor de alerta: "Sair da conta"
- Tab bar com ícones: Início, Solicitações, Notificações, Perfil (ativo)

**Ações do usuário**
- Navegar para as opções listadas
- Sair da conta

---

### 12. Dashboard (Coordenação)

**Layout geral**
- Tela com header e tab bar inferior
- Fundo cinza claro
- Estrutura: topo com saudação, centro com indicadores e atalhos, rodapé com tab bar

**Topo (Header)**
- Alinhado à esquerda: "Olá, [Nome da coordenação]"
- Alinhado à direita: ícone de sino (notificações internas, se houver)

**Conteúdo principal**
- Grid de cards com sombra leve (2 colunas): "Pendentes" + número em destaque; "Aprovadas hoje" + número; "Recusadas hoje" + número; "Turmas ativas" + número
- Card de destaque, largura total, abaixo do grid: "Período de matrícula" + status atual (texto "Aberto" ou "Fechado") + botão outline pequeno "Configurar"
- Lista vertical curta: "Últimas solicitações pendentes" (até 3 cards, mesmo formato de card usado na lista de solicitações)
- Texto simples "Ver todas" alinhado à direita, abaixo da lista

**Rodapé / Navegação**
- Tab bar com ícones: Painel (ativo), Solicitações, Turmas, Perfil

**Ações do usuário**
- Visualizar indicadores gerais
- Configurar o período de matrícula
- Tocar em uma solicitação pendente para abrir o detalhe
- Navegar pela tab bar

---

### 13. Lista de Solicitações (Coordenação)

**Layout geral**
- Tela com header e tab bar inferior
- Fundo cinza claro
- Estrutura: topo com título e filtros, centro com lista, rodapé com tab bar

**Topo (Header)**
- Título centralizado: "Solicitações"
- Abaixo do título, linha de filtros horizontais (chips): "Pendentes", "Aprovadas", "Recusadas", "Todas"
- Abaixo dos filtros, input com border-bottom e ícone de lupa: "Buscar por aluno ou turma"

**Conteúdo principal**
- Lista vertical de cards, um por solicitação
- Cada card: nome do aluno (destaque), nome do responsável (texto simples menor), nome da turma, etiqueta de status colorida no canto direito, data da solicitação em texto pequeno
- Se a lista estiver vazia (filtro sem resultado): texto simples centralizado "Nenhuma solicitação encontrada"

**Rodapé / Navegação**
- Tab bar com ícones: Painel, Solicitações (ativo), Turmas, Perfil

**Ações do usuário**
- Filtrar por status
- Buscar por nome
- Tocar em um card para abrir o detalhe e decidir

---

### 14. Detalhe da Solicitação (Coordenação)

**Layout geral**
- Tela cheia, com header simples (seta de voltar), sem tab bar
- Fundo branco
- Estrutura: topo com voltar, centro com informações em blocos, rodapé com ações de decisão

**Topo (Header)**
- Ícone de seta "voltar" no canto superior esquerdo
- Título centralizado: "Analisar solicitação"

**Conteúdo principal**
- Etiqueta de status grande, centralizada, colorida
- Card com sombra leve: "Aluno" + nome do aluno
- Card com sombra leve: "Responsável" + nome + e-mail
- Card com sombra leve: "Turma" + nome + turno
- Card com sombra leve: "Data da solicitação" + data/hora
- Se status ≠ Pendente: card adicional mostrando a decisão já tomada ("Aprovada em [data]" ou "Recusada em [data]" + motivo)

**Rodapé / Navegação**
- Se status = Pendente: dois botões lado a lado — botão outline cor de alerta "Recusar" (à esquerda) e botão cheio "Aprovar" (à direita)
- Ao tocar em "Recusar": abre modal simples com input de texto (border-bottom) "Motivo da recusa" e botão cheio "Confirmar recusa" (desabilitado até o texto ser preenchido)
- Se status ≠ Pendente: rodapé vazio (sem ação disponível)

**Ações do usuário**
- Ler os dados completos da solicitação
- Aprovar a solicitação
- Recusar a solicitação informando justificativa obrigatória
- Voltar para a lista

---

### 15. Gestão de Turmas

**Layout geral**
- Tela com header e tab bar inferior
- Fundo cinza claro
- Estrutura: topo com título, centro com lista de turmas, rodapé com tab bar e botão flutuante

**Topo (Header)**
- Título centralizado: "Turmas"

**Conteúdo principal**
- Lista vertical de cards com sombra leve, uma por turma
- Cada card: nome da turma (destaque), turno (texto simples menor), ocupação no formato "27/30 vagas" (texto pequeno, canto direito), etiqueta "Ativa" ou "Encerrada"
- Toque no card abre modal/tela de edição com: input "Nome da turma", input "Turno", input numérico "Total de vagas", switch "Ativa"

**Rodapé / Navegação**
- Floating button no canto inferior direito, ícone de "+": nova turma
- Tab bar com ícones: Painel, Solicitações, Turmas (ativo), Perfil

**Ações do usuário**
- Ver todas as turmas e sua ocupação
- Criar nova turma
- Editar turma existente (nome, turno, total de vagas, status ativo/encerrada)
