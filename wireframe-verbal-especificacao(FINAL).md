# Wireframe Verbal — Baseado na Especificação Técnica

---

### Login

Tela cheia, sem tab bar. Fundo branco. Topo: logo do app centralizado, abaixo texto simples "Entrar". Centro: input com border-bottom "E-mail", input com border-bottom "Senha". Botão cheio, largura total, "Entrar". Abaixo do botão, texto simples "Não tem conta? Cadastre-se", levando à tela de Cadastro. Após entrar, leva para Home (Pais) ou Painel (Coordenação), dependendo do papel do usuário.

---

### Cadastro

Tela cheia, com header simples (seta de voltar), sem tab bar. Fundo branco. Topo: seta de voltar + título "Criar conta". Centro: input com border-bottom "Nome", input com border-bottom "E-mail", input com border-bottom "Senha". Botão cheio, largura total, "Criar conta". Após criar conta, leva direto para a Home (Pais) — cadastro público só existe para o perfil pai.

---

### Home (Pais)

Tela cheia, com tab bar inferior. Fundo branco. Topo: texto simples "Olá, [nome do responsável]". Centro: lista de cards, um por solicitação já feita pelo usuário, cada card com nome do aluno, nome da turma, etiqueta de status. Floating button no canto inferior direito, ícone "+", leva para a tela Turmas Disponíveis. Tab bar com ícones: Início (esta tela), Turmas, Solicitações, Notificações.

---

### Turmas Disponíveis

Tela com header, com tab bar inferior (perfil pai). Fundo branco. Topo: título "Turmas". Centro: lista de cards, um por turma, cada card mostrando nome da turma e turno — sem número de vagas. Toque em um card leva à tela Nova Solicitação com a turma já selecionada. Tab bar com ícones: Início, Turmas (esta tela), Solicitações, Notificações.

---

### Nova Solicitação

Tela cheia, com header simples (seta de voltar), sem tab bar. Fundo branco. Topo: seta de voltar + título "Nova solicitação". Centro: texto simples mostrando a turma escolhida (nome + turno), input com border-bottom "Nome do aluno". Botão cheio, largura total, "Enviar solicitação". Se sem conexão, texto simples acima do botão avisando que a solicitação será enviada quando a internet voltar.

---

### Minhas Solicitações

Tela com header, com tab bar inferior (perfil pai). Fundo branco. Topo: título "Minhas solicitações". Centro: lista de cards, um por solicitação, cada card com nome do aluno, nome da turma, etiqueta de status (Pendente, Aprovada, Recusada ou Cancelada). Card com status Recusada mostra também o texto do motivo da recusa. Card com status Pendente mostra botão outline "Cancelar" dentro do próprio card. Tab bar com ícones: Início, Turmas, Solicitações (esta tela), Notificações.

---

### Notificações

Tela com header, com tab bar inferior (perfil pai). Fundo branco. Topo: título "Notificações". Centro: lista de cards, um por notificação, cada card com título e texto da notificação, data pequena no canto. Notificação não lida com uma bolinha colorida no canto do card. Tab bar com ícones: Início, Turmas, Solicitações, Notificações (esta tela).

---

### Painel (Coordenação)

Tela cheia, com tab bar inferior. Fundo branco. Topo: texto simples "Olá, [nome da coordenação]". Centro: lista de cards, um por solicitação pendente, cada card com nome do aluno, nome da turma. Toque em um card leva para a tela Solicitações Pendentes. Tab bar com ícones: Início (esta tela), Turmas, Solicitações, Período.

---

### Gestão de Turmas

Tela com header, com tab bar inferior (perfil coordenação). Fundo branco. Topo: título "Turmas". Centro: lista de cards, um por turma, cada card com nome, turno, total de vagas, vagas ocupadas, etiqueta "Ativa" ou "Inativa". Floating button no canto inferior direito, ícone "+", abre formulário de nova turma com input "Nome", input "Turno", input numérico "Total de vagas", switch "Ativa". Toque em um card abre o mesmo formulário preenchido para edição. Tab bar com ícones: Início, Turmas (esta tela), Solicitações, Período.

---

### Configuração do Período de Matrícula

Tela com header, com tab bar inferior (perfil coordenação). Fundo branco. Topo: título "Período de matrícula". Centro: input de data "Início", input de data "Fim", switch "Anunciar abertura do período". Botão cheio, largura total, "Salvar". Tab bar com ícones: Início, Turmas, Solicitações, Período (esta tela).

---

### Solicitações Pendentes

Tela com header, com tab bar inferior (perfil coordenação). Fundo branco. Topo: título "Solicitações pendentes". Centro: lista de cards, um por solicitação, ordenada da mais antiga para a mais nova, cada card com nome do aluno, nome do responsável, nome da turma, dois botões lado a lado dentro do card — botão outline "Recusar" e botão cheio "Aprovar". Toque em "Recusar" abre um campo de texto com border-bottom "Motivo da recusa" dentro do próprio card, com botão cheio "Confirmar recusa" (desabilitado até o texto ser preenchido). Toque em "Aprovar" remove o card da lista imediatamente. Tab bar com ícones: Início, Turmas, Solicitações (esta tela), Período.
