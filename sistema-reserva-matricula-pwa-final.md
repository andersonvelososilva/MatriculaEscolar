# Sistema PWA de Reserva de Matrícula Escolar — Documento Técnico (VERSÃO FINAL CORRIGIDA)

> **Tipo de documento:** Script técnico para desenvolvimento de MVP
> **Prazo alvo:** 24 horas
> **Stack:** Next.js (CSR only) + Firebase (Firestore, Auth, FCM, Hosting)
> **Escopo:** PWA com suporte offline parcial, sem upload de documentos, sem backend customizado
> **Nota de revisão:** esta versão corrige as inconsistências identificadas na auditoria técnica anterior — nomenclatura de coleção, case de status, nomes de campos, coleções ausentes da modelagem, e regras de segurança incompletas.

---

## Sumário

1. [Visão Geral do Sistema](#1-visão-geral-do-sistema)
2. [Arquitetura Simplificada (Firebase)](#2-arquitetura-simplificada-firebase)
3. [Estratégia PWA e Offline](#3-estratégia-pwa-e-offline)
4. [Modelagem de Dados (Firestore)](#4-modelagem-de-dados-firestore)
5. [Perfis de Usuário e Permissões](#5-perfis-de-usuário-e-permissões)
6. [Fluxos do Sistema (MVP)](#6-fluxos-do-sistema-mvp)
7. [Regras de Negócio](#7-regras-de-negócio)
8. [Integração Firebase](#8-integração-firebase)
9. [Tecnologias Sugeridas](#9-tecnologias-sugeridas)
10. [Segurança (Firebase)](#10-segurança-firebase)
11. [Limitações do MVP](#11-limitações-do-mvp)

---

## 1. Visão Geral do Sistema

### 1.1 Descrição

O sistema é um **PWA (Progressive Web App)** de reserva de matrícula escolar, com dois perfis de usuário:

| Perfil | Papel |
|---|---|
| **Coordenação escolar** | Administrador/moderador — cria turmas, analisa solicitações, aprova ou recusa |
| **Pais/responsáveis** | Usuário final — solicita reserva de matrícula em uma turma |

O fluxo central é simples: o responsável **solicita** uma vaga; a coordenação **avalia** e **decide** (aprovar ou recusar, com justificativa obrigatória em caso de recusa). Não há envio de documentos pelo sistema — a entrega documental é **presencial**, fora do escopo digital.

### 1.2 Objetivo (foco em MVP)

- Entregar um fluxo funcional completo (solicitação → análise → decisão) em até 24h de desenvolvimento.
- Utilizar exclusivamente serviços gerenciados do Firebase, eliminando a necessidade de backend próprio.
- Garantir que o app funcione, ainda que de forma degradada, sem conexão à internet.
- Manter o escopo estritamente funcional: **sem upload de arquivos, sem microserviços, sem infraestrutura extra**.
- Notificações no MVP são **in-app** (via Firestore); push real (FCM em segundo plano) fica fora de escopo — ver seção 8.3 e 11.1.

### 1.3 Fora de escopo (reforço)

- Upload/armazenamento de documentos (RG, comprovantes, etc.)
- Pagamento online
- Backend customizado (Node/Express, etc.)
- Multi-tenant (múltiplas escolas) — assume-se uma única instituição
- Push notification real com app fechado (ver seção 11.1)

---

## 2. Arquitetura Simplificada (Firebase)

### 2.1 Visão geral

Arquitetura **serverless**, 100% baseada em serviços gerenciados do Firebase. O frontend Next.js se comunica diretamente com os serviços Firebase via SDK client-side, sem camada de API intermediária.

```
┌─────────────────────────────────────────────────────────┐
│                     CLIENTE (Browser)                     │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Next.js PWA (React, 100% CSR)                     │  │
│  │  - Páginas: /login, /pai, /coordenacao             │  │
│  │  - Service Worker (cache de assets + shell offline) │  │
│  │  - Firestore SDK (persistência offline habilitada) │  │
│  └───────────────────────────────────────────────────┘  │
└───────────────────────┬───────────────────────────────────┘
                         │ HTTPS (SDK client-side)
                         ▼
┌─────────────────────────────────────────────────────────┐
│                       FIREBASE                            │
│  ┌───────────────┐ ┌───────────────┐ ┌────────────────┐ │
│  │ Firebase Auth  │ │  Firestore    │ │  Cloud         │ │
│  │ (login pais/   │ │  (users,      │ │  Messaging     │ │
│  │  coordenação)  │ │  classes,     │ │  (token apenas │ │
│  │                │ │  reservations,│ │  no MVP —      │ │
│  │                │ │  notifications,│ │  ver 8.3)      │ │
│  │                │ │  settings)    │ │                │ │
│  └───────────────┘ └───────────────┘ └────────────────┘ │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Firebase Hosting  — deploy do PWA                 │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### 2.2 Justificativa da arquitetura

- **Sem backend próprio:** todas as regras de acesso e integridade são garantidas via **Firestore Security Rules** e **transactions** client-side.
- **Sem API intermediária:** o SDK do Firestore já expõe CRUD seguro diretamente ao cliente, reduzindo tempo de desenvolvimento.
- **Escalabilidade não é prioridade no MVP** — a prioridade é entregar rápido e funcional.

### 2.3 Componentes principais

| Componente | Função |
|---|---|
| Next.js (App Router) | Renderização client-side (CSR), roteamento de páginas, PWA shell, Client Components (`"use client"`); sem SSR, API Routes ou lógica backend |
| Firebase Authentication | Login de pais e coordenação (e-mail/senha) |
| Firestore | Armazenamento de `users`, `classes`, `reservations`, `notifications`, `settings` |
| Firestore Offline Persistence | Cache local automático + escrita offline |
| Firebase Cloud Messaging | Registro de token do dispositivo (transporte pronto para push futuro); notificação efetiva no MVP é in-app via Firestore — ver 8.3 |
| Service Worker (`next-pwa`) | Cache de assets e shell da aplicação para funcionamento offline |
| Firebase Hosting | Hospedagem e deploy (única opção adotada — Vercel descartado para manter tudo no ecossistema Firebase) |

---

## 3. Estratégia PWA e Offline

### 3.1 Configuração de PWA no Next.js

Uso da biblioteca `next-pwa` (baseada em Workbox) para gerar o Service Worker automaticamente a partir da build do Next.js.

**Instalação:**

```bash
npm install next-pwa
```

**`next.config.js`:**

```javascript
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    // Atenção: NÃO cachear chamadas ao Firestore (firestore.googleapis.com) aqui.
    // O Firestore usa um canal de comunicação em stream (WebChannel/gRPC-Web),
    // incompatível com estratégias de cache tradicionais de Service Worker.
    // A persistência offline do Firestore é tratada pelo próprio SDK (seção 3.3).
    {
      urlPattern: /\.(?:png|jpg|jpeg|svg|ico)$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'image-cache',
        expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 30 },
      },
    },
    {
      urlPattern: /^https:\/\/.*\.(?:js|css)$/,
      handler: 'StaleWhileRevalidate',
      options: { cacheName: 'static-resources' },
    },
  ],
});

module.exports = withPWA({
  reactStrictMode: true,
  output: 'export', // build 100% estática — obrigatório dado que o projeto proíbe SSR/API Routes
});
```

**`public/manifest.json`:**

```json
{
  "name": "Matrícula Escolar",
  "short_name": "Matrícula",
  "description": "App de reserva de matrícula escolar",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#1a73e8",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

Referenciar o manifest no `app/layout.tsx`:

```html
<link rel="manifest" href="/manifest.json" />
<meta name="theme-color" content="#1a73e8" />
```

### 3.2 Estratégias de cache (resumo)

| Tipo de recurso | Estratégia | Motivo |
|---|---|---|
| Chamadas ao Firestore (via SDK) | Gerenciado pela persistência offline do Firestore (**não** pelo Service Worker) | Firestore SDK tem cache próprio (IndexedDB), mais confiável que interceptar via SW |
| Páginas/rotas Next.js (HTML/JS/CSS) | `StaleWhileRevalidate` | Abre rápido, atualiza em segundo plano |
| Imagens/ícones estáticos | `CacheFirst` | Recursos que raramente mudam |
| Rota de login (Auth) | Sem cache agressivo | Depende de rede para autenticar pela primeira vez |

### 3.3 Persistência offline do Firestore

```javascript
// firebase.js
import { initializeApp } from 'firebase/app';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentSingleTabManager,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getMessaging, isSupported } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

// Habilita persistência offline (cache local em IndexedDB)
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentSingleTabManager({}),
  }),
});

export const auth = getAuth(app);

export const getMessagingIfSupported = async () => {
  if (typeof window !== 'undefined' && (await isSupported())) {
    return getMessaging(app);
  }
  return null;
};
```

### 3.4 Funcionamento offline — comportamento esperado

| Ação | Online | Offline |
|---|---|---|
| Abrir o app | Carrega normalmente | Carrega via cache do Service Worker (shell da aplicação) |
| Visualizar turmas/reservas já carregadas | Dados atualizados do servidor | Dados servidos do cache local do Firestore (podem estar desatualizados) |
| Criar reserva de matrícula (pai) | Grava direto no Firestore | Grava localmente; documento fica pendente de sincronização; é enviado automaticamente quando a conexão retornar |
| Aprovar/recusar reserva (coordenação) | Grava direto no Firestore | Mesma lógica de escrita offline; **risco de conflito** em controle de vagas (ver 3.5) |
| Notificações in-app | Recebidas em tempo real via `onSnapshot` | Não chegam até reconectar |

### 3.5 Limitações do modo offline

- **Consistência eventual**: escritas feitas offline só são persistidas no servidor quando a conexão retorna. Até lá, outros usuários não veem essas mudanças.
- **Transactions não têm garantia final offline**: o controle de vagas (`runTransaction`) exige rede ativa para atomicidade real contra o servidor. Em modo offline, a escrita fica **pendente** e só é validada (podendo falhar) quando sincronizada.
- **Login inicial requer internet**: sessões já autenticadas permanecem válidas offline graças ao token em cache.
- **Notificações in-app não chegam offline** (dependem de `onSnapshot` ativo com o servidor).
- **Sem resolução automática de conflitos complexa** — em caso de concorrência, a estratégia é *last-write-wins* nativa do Firestore, mitigada pelo uso de transactions quando online.

---

## 4. Modelagem de Dados (Firestore)

### 4.1 Visão geral das collections

| Collection | Descrição |
|---|---|
| `users` | Dados de perfil (pai ou coordenação) vinculados ao UID do Firebase Auth |
| `classes` | Turmas disponíveis, com controle de vagas |
| `reservations` | Solicitações de matrícula feitas pelos pais |
| `notifications` | Notificações in-app (mudança de status, abertura de período) |
| `settings` | Documento único de configuração do período de matrícula |

### 4.2 `users/{uid}`

```json
{
  "uid": "f8h2k9...",
  "name": "Maria Souza",
  "email": "maria@email.com",
  "role": "parent",
  "createdAt": "2025-01-10T14:00:00Z",
  "fcmToken": "d3f4a9..."
}
```

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `uid` | string | sim | Igual ao UID do Firebase Auth |
| `name` | string | sim | Nome do usuário |
| `email` | string | sim | E-mail de login |
| `role` | string (`parent` \| `admin`) | sim | Define permissões |
| `createdAt` | timestamp | sim | Data de criação do perfil |
| `fcmToken` | string | não | Token do dispositivo atual (um único dispositivo por vez no MVP) |

### 4.3 `classes/{classId}`

```json
{
  "name": "1º Ano A - Ensino Fundamental",
  "period": "Manhã",
  "totalSpots": 30,
  "occupiedSpots": 27,
  "active": true,
  "createdAt": "2025-01-05T10:00:00Z"
}
```

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `name` | string | sim | Nome/descrição da turma |
| `period` | string | sim | Turno (Manhã/Tarde/Integral) |
| `totalSpots` | number | sim | Total de vagas da turma |
| `occupiedSpots` | number | sim | Vagas já ocupadas (atualizado via transaction) |
| `active` | boolean | sim | Se a turma está aberta para solicitações |
| `createdAt` | timestamp | sim | Data de criação |

> **Nota de negócio:** `occupiedSpots` é a fonte de verdade para o cálculo de vagas disponíveis (`totalSpots - occupiedSpots`). Pais não têm acesso a esses campos **na UI** (ver seção 5). Tecnicamente, a Security Rule de leitura de `classes` é "tudo ou nada" por documento (limitação do Firestore) — a ocultação é uma decisão de interface, não uma garantia de regra. Esse trade-off é aceito no MVP e documentado na seção 10.1.
>
> **Nota sobre escrita:** `occupiedSpots` só deve ser alterado via `runTransaction` (seção 6.2, seção 8.1). A Security Rule (`allow write: if isAdmin()`) não impede tecnicamente uma escrita direta fora de transaction — essa é uma disciplina de implementação da equipe, não uma garantia imposta pelas regras.

### 4.4 `reservations/{reservationId}`

```json
{
  "parentId": "f8h2k9...",
  "parentName": "Maria Souza",
  "studentName": "João Souza",
  "classId": "turma-1a-2025",
  "className": "1º Ano A - Ensino Fundamental",
  "status": "PENDING",
  "overCapacity": false,
  "rejectionReason": null,
  "reviewedBy": null,
  "createdAt": "2025-02-01T09:00:00Z",
  "updatedAt": "2025-02-01T09:00:00Z"
}
```

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `parentId` | string | sim | UID do responsável solicitante |
| `parentName` | string | sim | Nome do responsável (desnormalizado) |
| `studentName` | string | sim | Nome do aluno |
| `classId` | string | sim | Referência à turma solicitada |
| `className` | string | sim | Nome da turma (desnormalizado) |
| `status` | string (`PENDING` \| `APPROVED` \| `REJECTED` \| `CANCELLED`) | sim | Estado da solicitação |
| `overCapacity` | boolean | sim | `true` se aprovada além da capacidade da turma |
| `rejectionReason` | string \| null | condicional | Obrigatório quando `status = REJECTED` |
| `reviewedBy` | string \| null | não | UID do membro da coordenação que avaliou |
| `createdAt` | timestamp | sim | Data da solicitação |
| `updatedAt` | timestamp | sim | Última atualização de status |

### 4.5 `notifications/{notificationId}`

```json
{
  "userId": "f8h2k9...",
  "title": "Solicitação aprovada",
  "body": "Sua reserva para o 1º Ano A foi aprovada.",
  "type": "APPROVED",
  "reservationId": "req-001",
  "read": false,
  "createdAt": "2025-02-02T10:00:00Z"
}
```

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `userId` | string | sim | Destinatário (UID do pai) |
| `title` | string | sim | Título curto |
| `body` | string | sim | Corpo da mensagem |
| `type` | string (`APPROVED` \| `REJECTED` \| `PERIOD_START`) | sim | Tipo do evento |
| `reservationId` | string \| null | não | Reserva relacionada, se aplicável |
| `read` | boolean | sim | Se o pai já visualizou |
| `createdAt` | timestamp | sim | Data de criação |

### 4.6 `settings/enrollmentPeriod` (documento único)

```json
{
  "startDate": "2025-03-01T00:00:00Z",
  "endDate": "2025-03-31T23:59:59Z",
  "announced": false
}
```

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `startDate` | timestamp | sim | Início do período de matrícula |
| `endDate` | timestamp | sim | Fim do período de matrícula |
| `announced` | boolean | sim | Setado manualmente pela coordenação para disparar notificação de abertura |

### 4.7 Diagrama relacional (descritivo)

```
users (1) ──────< reservations (N) >────── notifications (N)
  (role=parent)         │
                         │ classId
                         ▼
                     classes (1)

settings/enrollmentPeriod — documento independente, lido por todos os usuários autenticados
```

- Um `user` (pai) pode ter várias `reservations` e várias `notifications`.
- Cada `reservation` referencia exatamente uma `class`.
- `classes` não referencia `reservations` diretamente — a contagem de vagas é mantida via `occupiedSpots`, atualizado por transaction no momento da aprovação.
- Índice composto necessário: `reservations` por (`status` ASC, `createdAt` ASC), usado na listagem de pendentes da coordenação — deve ser criado no deploy (seção 9) ou via link automático do console na primeira execução da query.

---

## 5. Perfis de Usuário e Permissões

### 5.1 Roles

| Role | Descrição | Como é atribuído |
|---|---|---|
| `parent` | Responsável que solicita matrícula | Padrão no cadastro público |
| `admin` | Membro da coordenação | Atribuído manualmente (via Firebase Console ou script de seed) — **não há autocadastro de admin** |

### 5.2 Regras de acesso (resumo funcional)

| Ação | Pai (`parent`) | Coordenação (`admin`) |
|---|---|---|
| Criar reserva de matrícula | ✅ (para si/seus filhos) | ❌ |
| Ver suas próprias reservas | ✅ | ✅ (todas) |
| Cancelar sua reserva (enquanto `PENDING`) | ✅ | ❌ |
| Ver vagas disponíveis/ocupadas de uma turma | ❌ (só na UI — ver nota 4.3) | ✅ |
| Ver lista de turmas (nome, período) | ✅ (dados básicos) | ✅ (completo) |
| Aprovar/recusar reserva | ❌ | ✅ |
| Editar reserva após criada | ❌ | ✅ (apenas status/justificativa, só enquanto `PENDING`) |
| Criar/editar turmas | ❌ | ✅ |
| Configurar período de matrícula | ❌ | ✅ |

### 5.3 Autenticação (Firebase Auth)

- Método: **E-mail/senha** (`signInWithEmailAndPassword` / `createUserWithEmailAndPassword`).
- Ao cadastrar um pai, cria-se automaticamente um documento em `users/{uid}` com `role: "parent"`.
- Contas `admin` são criadas manualmente (fora do fluxo de autocadastro), garantindo que ninguém se autopromova a coordenação.

```javascript
// Cadastro de um pai
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';

export async function registerParent(name, email, password) {
  const { user } = await createUserWithEmailAndPassword(auth, email, password);

  await setDoc(doc(db, 'users', user.uid), {
    uid: user.uid,
    name,
    email,
    role: 'parent',
    createdAt: serverTimestamp(),
  });

  return user;
}
```

---

## 6. Fluxos do Sistema (MVP)

### 6.1 Pais/Responsáveis

1. **Login/Cadastro** — Firebase Authentication (email/senha); sessão persistida localmente pelo SDK (funciona offline após primeiro login).
2. **Consulta de turmas** — leitura da coleção `classes` via Firestore. A UI exibe apenas `name`/`period`; `totalSpots`/`occupiedSpots` não são exibidos para este papel.
3. **Solicitação de matrícula** — formulário com nome do aluno (`studentName`) e seleção de turma. Cria documento em `reservations` com `status: "PENDING"`. Funciona online ou offline (o SDK enfileira a escrita automaticamente); a UI mostra a reserva de forma otimista até a confirmação de sincronização.
4. **Cancelamento** — permitido apenas enquanto `status == "PENDING"` (`updateDoc` simples para `status: "CANCELLED"`, sem transaction).
5. **Acompanhamento** — `onSnapshot` na(s) reserva(s) do usuário; status atualiza em tempo real (`PENDING` / `APPROVED` / `REJECTED` / `CANCELLED`).
6. **Notificações** — leitura em tempo real da coleção `notifications` filtrada por `userId` (mudança de status, abertura do período de matrícula). Push real via FCM fica limitado ao registro do token; notificação com app fechado é débito técnico fora do escopo do MVP (ver 8.3).

### 6.2 Coordenação Escolar

1. **Login** — Firebase Authentication; papel definido por `users/{uid}.role == "admin"` (sem Custom Claims no MVP).
2. **Gestão de turmas** — CRUD simples em `classes` (`name`, `period`, `totalSpots`, `occupiedSpots`, `active`).
3. **Configuração do período de matrícula** — documento único `settings/enrollmentPeriod` com `startDate`/`endDate` e flag `announced`, setada manualmente pela coordenação para disparar a notificação de abertura.
4. **Gestão de solicitações** — leitura em tempo real (`onSnapshot`) da coleção `reservations`, filtrando `status == "PENDING"`, ordenada por `createdAt`.

   **Aprovar:**
   - `runTransaction`:
     1. Lê `classes/{classId}` (`totalSpots`, `occupiedSpots`)
     2. Incrementa `occupiedSpots`
     3. Atualiza `reservations.status = "APPROVED"`, `overCapacity` (true se `occupiedSpots > totalSpots` após o incremento), `reviewedBy`, `updatedAt`
   - Se offline no momento da aprovação: a transaction só é validada na sincronização; se a vaga não existir mais, a transaction falha e a solicitação **retorna à lista de pendentes** com aviso para reavaliação.
   - Turma cheia não bloqueia a aprovação — só marca `overCapacity: true`.

   **Rejeitar:**
   - Exige `rejectionReason` não vazio (validado na UI e na Security Rule).
   - `updateDoc`: `status = "REJECTED"`, `rejectionReason`, `reviewedBy`, `updatedAt`.

   Em ambos os casos, um documento é criado em `notifications` para o responsável correspondente.

### 6.3 Fluxo offline (comum aos dois papéis)

1. Conexão cai → app continua funcionando com Service Worker (assets) e cache local do Firestore (dados).
2. Escritas (criar reserva, aprovar, rejeitar, cancelar) são enfileiradas automaticamente pelo SDK do Firestore — sem fila manual.
3. UI reflete a mudança de forma otimista, marcada como "pendente de sincronização" quando aplicável.
4. Ao reconectar, o SDK sincroniza a fila automaticamente.
5. Exceção: uma aprovação feita offline que dependia de uma vaga que já não existe mais falha na sincronização — a UI deve tratar esse erro e devolver a solicitação para a lista de pendentes, avisando a coordenação.

---

## 7. Regras de Negócio

**RN01 — Visibilidade de vagas**
`totalSpots`/`occupiedSpots` ocultados na UI do responsável. *(Proteção de interface, não uma Security Rule por campo — trade-off documentado na seção 10.1.)*

**RN02 — Solicitação sempre permitida**
O Firestore não bloqueia a criação de `reservations`; toda validação de vaga ocorre apenas no momento da aprovação.

**RN03 — Consistência de aprovação**
Incremento de `occupiedSpots` e atualização de `status` ocorrem dentro de um único `runTransaction`, evitando condição de corrida entre aprovações simultâneas.

**RN04 — Aprovação além da capacidade**
Permitida sem bloqueio técnico; grava `overCapacity: true` quando `occupiedSpots > totalSpots` após o incremento.

**RN05 — Recusa exige justificativa**
`rejectionReason` obrigatório, validado na UI e reforçado na Security Rule.

**RN06 — Imutabilidade pós-decisão**
Security Rule permite `update` de `reservations` pela coordenação apenas quando `resource.data.status == "PENDING"` — evita reprocessamento (ex.: dupla aprovação incrementando vaga duas vezes).

**RN07 — Cancelamento pelo responsável**
Permitido apenas enquanto `status == "PENDING"`; update simples restrito à transição `PENDING → CANCELLED`, feito apenas pelo dono da reserva (`parentId == request.auth.uid`), sem transaction (não há vaga a decrementar nesse estado).

**RN08 — Concorrência**
Toda alteração de `occupiedSpots` ocorre via Firestore Transaction; não há locks explícitos — o próprio Firestore garante atomicidade da transação.

**RN09 — Notificação de abertura do período**
Disparada quando a coordenação marca `announced: true` no documento `settings/enrollmentPeriod`; clientes recebem a atualização via `onSnapshot` e geram a notificação in-app. Sem Cloud Function/agendamento automático no MVP.

**RN10 — Notificação de mudança de status**
Documento criado em `notifications` a cada aprovação/rejeição, lido em tempo real pelo responsável. Push via FCM limitado à entrega em primeiro plano (token registrado, mas sem dispatcher server-side).

---

## 8. Integração Firebase

### 8.1 Firestore — CRUD básico

**Criar reserva (pai):**

```javascript
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export async function createReservation({ parentId, parentName, studentName, classId, className }) {
  return addDoc(collection(db, 'reservations'), {
    parentId,
    parentName,
    studentName,
    classId,
    className,
    status: 'PENDING',
    overCapacity: false,
    rejectionReason: null,
    reviewedBy: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}
```

**Cancelar reserva (pai):**

```javascript
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export async function cancelReservation(reservationId) {
  await updateDoc(doc(db, 'reservations', reservationId), {
    status: 'CANCELLED',
    updatedAt: serverTimestamp(),
  });
}
```

**Listar reservas do pai (listener em tempo real):**

```javascript
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';

export function listenParentReservations(parentId, callback) {
  const q = query(collection(db, 'reservations'), where('parentId', '==', parentId));

  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}
```

**Listar reservas pendentes (coordenação):**

```javascript
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';

export function listenPendingReservations(callback) {
  const q = query(
    collection(db, 'reservations'),
    where('status', '==', 'PENDING'),
    orderBy('createdAt', 'asc')
  );
  // Requer índice composto (status ASC, createdAt ASC) — criar no deploy (seção 9).

  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}
```

**Aprovar reserva (transaction):**

```javascript
import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export async function approveReservation(reservationId, classId, reviewerUid) {
  const classRef = doc(db, 'classes', classId);
  const reservationRef = doc(db, 'reservations', reservationId);

  await runTransaction(db, async (tx) => {
    const classSnap = await tx.get(classRef);
    if (!classSnap.exists()) throw new Error('Turma não encontrada.');

    const { totalSpots, occupiedSpots } = classSnap.data();
    const newOccupied = occupiedSpots + 1;

    tx.update(classRef, { occupiedSpots: newOccupied });
    tx.update(reservationRef, {
      status: 'APPROVED',
      overCapacity: newOccupied > totalSpots,
      reviewedBy: reviewerUid,
      updatedAt: serverTimestamp(),
    });
  });
}
```

**Rejeitar reserva (com justificativa obrigatória):**

```javascript
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export async function rejectReservation(reservationId, reviewerUid, reason) {
  if (!reason || reason.trim().length === 0) {
    throw new Error('A justificativa de recusa é obrigatória.');
  }

  await updateDoc(doc(db, 'reservations', reservationId), {
    status: 'REJECTED',
    rejectionReason: reason.trim(),
    reviewedBy: reviewerUid,
    updatedAt: serverTimestamp(),
  });
}
```

**Registrar notificação in-app (chamado junto com approve/reject):**

```javascript
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export async function createNotification({ userId, title, body, type, reservationId = null }) {
  return addDoc(collection(db, 'notifications'), {
    userId,
    title,
    body,
    type,
    reservationId,
    read: false,
    createdAt: serverTimestamp(),
  });
}
```

**Listar notificações do usuário:**

```javascript
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';

export function listenNotifications(userId, callback) {
  const q = query(
    collection(db, 'notifications'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}
```

### 8.2 Firebase Authentication — login

```javascript
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

export async function login(email, password) {
  const { user } = await signInWithEmailAndPassword(auth, email, password);
  const userDoc = await getDoc(doc(db, 'users', user.uid));

  if (!userDoc.exists()) {
    throw new Error('Perfil de usuário não encontrado.');
  }

  return { uid: user.uid, ...userDoc.data() };
}
```

### 8.3 Firebase Cloud Messaging — apenas registro de token (MVP)

No MVP, **não é implementado push real em segundo plano** (exigiria uma Cloud Function ou Admin SDK server-side, proibidos pela stack do projeto). A notificação efetiva do MVP é **in-app**, via `notifications` + `onSnapshot` (seção 8.1). O código abaixo registra o token do dispositivo apenas como preparação para uma melhoria futura — não há Service Worker de mensagens nem listener de background nesta versão.

```javascript
import { getToken } from 'firebase/messaging';
import { doc, updateDoc } from 'firebase/firestore';
import { getMessagingIfSupported, db } from './firebase';

export async function registerFcmToken(uid) {
  const messaging = await getMessagingIfSupported();
  if (!messaging) return;

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return;

  const token = await getToken(messaging, {
    vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
  });

  if (token) {
    await updateDoc(doc(db, 'users', uid), { fcmToken: token });
  }
}
```

> **Débito técnico documentado:** para push real (app fechado/minimizado), será necessária futuramente uma Cloud Function acionada por escrita em `reservations`/`settings` que chama a Admin SDK do FCM — fora do escopo deste MVP de 24h.

---

## 9. Tecnologias Sugeridas

### 9.1 Justificativa da escolha do Firebase

| Necessidade do projeto | Como o Firebase atende |
|---|---|
| Backend em poucas horas | Serviços gerenciados prontos (Auth, Firestore, FCM) — zero infraestrutura para provisionar |
| Autenticação segura | Firebase Auth pronto, com SDK client-side simples |
| Banco de dados em tempo real | Firestore com listeners nativos (`onSnapshot`) |
| Funcionamento offline | Firestore possui persistência offline nativa (IndexedDB) |
| Hospedagem rápida | Firebase Hosting — deploy em minutos, mesmo ecossistema |
| Controle de acesso sem backend | Security Rules substituem a necessidade de uma API de autorização |
| Notificações | FCM integrado ao mesmo ecossistema (token pronto para push futuro) |

### 9.2 Vantagens para desenvolvimento em 24h

- **Zero setup de servidor**: não há necessidade de provisionar, configurar ou fazer deploy de um backend.
- **SDKs client-side maduros**: reduzem drasticamente a quantidade de código necessário para CRUD, autenticação e tempo real.
- **Security Rules como única camada de autorização**: elimina a necessidade de escrever middleware de autenticação/autorização.
- **Ecossistema único**: Auth, Firestore, FCM e Hosting integrados, sem necessidade de conectar múltiplos provedores.
- **Persistência offline "out of the box"**: atende ao requisito de PWA offline sem código adicional de sincronização manual.

### 9.3 Deploy — passo a passo

1. Criar projeto no Firebase Console → ativar Authentication (Email/Senha), Firestore (modo produção), Cloud Messaging.
2. `npm install -g firebase-tools` → `firebase login`.
3. `firebase init hosting` (apontar `public directory` para `out/`, gerado pelo `output: 'export'` do Next.js) e `firebase init firestore` (regras + índices).
4. Criar o índice composto de `reservations` (`status` ASC, `createdAt` ASC) em `firestore.indexes.json` ou via link automático do console na primeira execução da query.
5. `npm run build` → gera `out/`.
6. `firebase deploy --only firestore:rules,firestore:indexes`.
7. `firebase deploy --only hosting`.
8. Testar instalação do PWA (prompt "Instalar app" no Chrome).
9. Criar usuário admin inicial manualmente (Authentication + documento em `users/{uid}` com `role: "admin"`).

---

## 10. Segurança (Firebase)

### 10.1 Security Rules — Firestore

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    function isSignedIn() {
      return request.auth != null;
    }

    function getRole() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role;
    }

    function isAdmin() {
      return isSignedIn() && getRole() == 'admin';
    }

    function isParent() {
      return isSignedIn() && getRole() == 'parent';
    }

    // --- users ---
    match /users/{userId} {
      allow read: if isSignedIn() && (request.auth.uid == userId || isAdmin());
      allow create: if isSignedIn() && request.auth.uid == userId
                    && request.resource.data.role == 'parent'; // ninguém se autopromove a admin
      allow update: if isSignedIn() && request.auth.uid == userId
                    && request.resource.data.role == resource.data.role; // não pode alterar a própria role
      allow delete: if false;
    }

    // --- classes ---
    match /classes/{classId} {
      // Leitura "tudo ou nada": pais tecnicamente conseguem ler totalSpots/occupiedSpots
      // via acesso direto ao documento — a ocultação é garantida apenas na UI (RN01, seção 4.3).
      allow read: if isSignedIn();
      allow write: if isAdmin();
    }

    // --- reservations ---
    match /reservations/{reservationId} {
      allow create: if isParent()
                    && request.resource.data.parentId == request.auth.uid
                    && request.resource.data.status == 'PENDING';

      allow read: if isSignedIn() &&
                  (isAdmin() || resource.data.parentId == request.auth.uid);

      // Coordenação: só pode decidir enquanto ainda está PENDING (RN06 — imutabilidade pós-decisão)
      allow update: if (isAdmin()
                        && resource.data.status == 'PENDING'
                        && request.resource.data.status in ['APPROVED', 'REJECTED']
                        && (request.resource.data.status != 'REJECTED'
                            || (request.resource.data.rejectionReason is string
                                && request.resource.data.rejectionReason.size() > 0)))
                    // Pai: só pode cancelar a própria reserva enquanto PENDING (RN07)
                    || (isSignedIn()
                        && resource.data.parentId == request.auth.uid
                        && resource.data.status == 'PENDING'
                        && request.resource.data.status == 'CANCELLED');

      allow delete: if false;
    }

    // --- notifications ---
    match /notifications/{notificationId} {
      allow create: if isAdmin();
      allow read: if isSignedIn() && resource.data.userId == request.auth.uid;
      allow update: if isSignedIn() && resource.data.userId == request.auth.uid; // marcar como lida
      allow delete: if false;
    }

    // --- settings ---
    match /settings/{settingId} {
      allow read: if isSignedIn();
      allow write: if isAdmin();
    }
  }
}
```

> **Nota sobre ocultar vagas dos pais:** Firestore Security Rules não filtram campos individuais de um documento — a regra é "tudo ou nada" por documento. Para impedir tecnicamente que pais leiam `totalSpots`/`occupiedSpots`, uma evolução futura seria mover esses campos para uma subcoleção `classes/{classId}/admin/capacity` legível apenas por admin. No MVP, esse trade-off é aceito e documentado (RN01).

### 10.2 Controle de acesso por role — resumo

| Recurso | Regra de leitura | Regra de escrita |
|---|---|---|
| `users/{uid}` | Próprio usuário ou admin | Próprio usuário (sem alterar role) |
| `classes/{classId}` | Qualquer usuário autenticado | Somente admin |
| `reservations/{id}` | Dono da reserva ou admin | Criação: pai (para si); decisão: admin (só enquanto `PENDING`); cancelamento: pai dono (só `PENDING → CANCELLED`) |
| `notifications/{id}` | Dono da notificação (`userId`) | Criação: admin; marcar como lida: dono |
| `settings/{id}` | Qualquer usuário autenticado | Somente admin |

### 10.3 Proteção básica de dados

- Todas as escritas exigem `request.auth != null` (usuário autenticado).
- O incremento de `occupiedSpots` deve ocorrer exclusivamente dentro de uma `runTransaction` **por disciplina de implementação** — a Security Rule (`allow write: if isAdmin()`) permite qualquer escrita de admin em `classes`, com ou sem transaction; não há, no MVP, uma regra que force tecnicamente o uso de transaction.
- Dados sensíveis (e-mail, nome) seguem princípio de menor exposição: pais só leem seus próprios dados; coordenação lê tudo por necessidade operacional.
- Sem upload de arquivos → **elimina superfície de ataque relacionada a arquivos maliciosos**, alinhado à restrição do projeto.

---

## 11. Limitações do MVP

### 11.1 O que não será implementado

- Upload, envio ou armazenamento de qualquer documento.
- Pagamento ou integração financeira.
- Backend customizado (APIs REST/GraphQL próprias).
- Múltiplas escolas/unidades (multi-tenant).
- Recuperação de senha customizada (usar fluxo padrão do Firebase Auth).
- Histórico/auditoria detalhada de alterações (apenas `updatedAt`/`reviewedBy` simples).
- Reversão de status (`APPROVED`/`REJECTED` → `PENDING`).
- Filtragem de campos sensíveis por regra nativa do Firestore (mitigada via UI, conforme nota da seção 10.1).
- **Push notification real com app fechado/minimizado** — apenas notificação in-app e registro de token FCM, conforme seção 8.3.

### 11.2 Trade-offs do uso de Firebase

| Trade-off | Descrição |
|---|---|
| Vendor lock-in | Toda a lógica depende do ecossistema Firebase/Google Cloud |
| Regras "tudo ou nada" por documento | Exige modelagem cuidadosa (ou subcoleções) para esconder campos específicos, como `occupiedSpots` |
| Lógica de negócio no cliente | Transactions e validações rodam no client-side, exigindo Security Rules bem escritas como última linha de defesa |
| Notificações push reais exigem Cloud Function | Simplificado no MVP para notificação in-app, conforme seção 8.3 |
| Sem camada de API própria | Qualquer regra de negócio mais complexa no futuro exigirá Cloud Functions |
| `occupiedSpots` não é protegido contra escrita direta fora de transaction | Depende de disciplina da equipe de implementação (seção 10.3) |

### 11.3 Limitações offline

- Consistência **eventual**, não imediata — dados podem estar desatualizados até a reconexão.
- Aprovações feitas offline não têm garantia final até a sincronização (a transaction pode falhar se a vaga se esgotar entre a ação offline e a sincronização).
- Notificações in-app não são entregues enquanto o dispositivo estiver offline.
- Primeiro login sempre exige conexão ativa.
- Não há indicador sofisticado de "status de sincronização" no MVP — recomenda-se, no mínimo, um indicador simples de "alterações pendentes de sincronização" na UI.

---

*Fim do documento técnico.*
