# Wireframe Verbal — Baseado na Especificação Técnica

---

### Login

Tela cheia, sem tab bar. Fundo branco. Topo: logo do app centralizado, abaixo texto simples "Entrar". Centro: input com border-bottom "E-mail", input com border-bottom "Senha". Botão cheio, largura total, "Entrar". Abaixo do botão, texto simples "Não tem conta? Cadastre-se", levando à tela de Cadastro.

---

### Cadastro

Tela cheia, com header simples (seta de voltar), sem tab bar. Fundo branco. Topo: seta de voltar + título "Criar conta". Centro: input com border-bottom "Nome", input com border-bottom "E-mail", input com border-bottom "Senha". Botão cheio, largura total, "Criar conta".

---

### Turmas Disponíveis

Tela com header, sem tab bar (perfil pai). Fundo branco. Topo: título "Turmas". Centro: lista de cards, um por turma, cada card mostrando nome da turma e turno — sem número de vagas. Toque em um card leva à tela Nova Solicitação com a turma já selecionada.

---

### Nova Solicitação

Tela cheia, com header simples (seta de voltar), sem tab bar. Fundo branco. Topo: seta de voltar + título "Nova solicitação". Centro: texto simples mostrando a turma escolhida (nome + turno), input com border-bottom "Nome do aluno". Botão cheio, largura total, "Enviar solicitação". Se sem conexão, texto simples acima do botão avisando que a solicitação será enviada quando a internet voltar.

---

### Minhas Solicitações

Tela com header, sem tab bar (perfil pai). Fundo branco. Topo: título "Minhas solicitações". Centro: lista de cards, um por solicitação, cada card com nome do aluno, nome da turma, etiqueta de status (Pendente, Aprovada, Recusada ou Cancelada). Card com status Recusada mostra também o texto do motivo da recusa. Card com status Pendente mostra botão outline "Cancelar" dentro do próprio card.

---

### Notificações

Tela com header, sem tab bar (perfil pai). Fundo branco. Topo: título "Notificações". Centro: lista de cards, um por notificação, cada card com título e texto da notificação, data pequena no canto. Notificação não lida com uma bolinha colorida no canto do card.

---

### Gestão de Turmas

Tela com header (perfil coordenação). Fundo branco. Topo: título "Turmas". Centro: lista de cards, um por turma, cada card com nome, turno, total de vagas, vagas ocupadas, etiqueta "Ativa" ou "Inativa". Floating button no canto inferior direito, ícone "+", abre formulário de nova turma com input "Nome", input "Turno", input numérico "Total de vagas", switch "Ativa". Toque em um card abre o mesmo formulário preenchido para edição.

---

### Configuração do Período de Matrícula

Tela cheia, com header simples (seta de voltar), sem tab bar. Fundo branco. Topo: seta de voltar + título "Período de matrícula". Centro: input de data "Início", input de data "Fim", switch "Anunciar abertura do período". Botão cheio, largura total, "Salvar".

---

### Solicitações Pendentes

Tela com header (perfil coordenação). Fundo branco. Topo: título "Solicitações pendentes". Centro: lista de cards, um por solicitação, ordenada da mais antiga para a mais nova, cada card com nome do aluno, nome do responsável, nome da turma, dois botões lado a lado dentro do card — botão outline "Recusar" e botão cheio "Aprovar". Toque em "Recusar" abre um campo de texto com border-bottom "Motivo da recusa" dentro do próprio card, com botão cheio "Confirmar recusa" (desabilitado até o texto ser preenchido). Toque em "Aprovar" remove o card da lista imediatamente.
