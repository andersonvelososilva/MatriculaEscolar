# Sistema PWA de Reserva de Matrícula Escolar — Documento Técnico

> **Tipo de documento:** Script técnico para desenvolvimento de MVP
> **Prazo alvo:** 24 horas
> **Stack:** Next.js + Firebase (Firestore, Auth, FCM, Hosting)
> **Escopo:** PWA com suporte offline parcial, sem upload de documentos, sem backend customizado

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
| **Pais/responsáveis** | Usuário final — solicita reserva de matrícula em uma turma/curso |

O fluxo central é simples: o responsável **solicita** uma vaga; a coordenação **avalia** e **decide** (aprovar ou recusar, com justificativa obrigatória em caso de recusa). Não há envio de documentos pelo sistema — a entrega documental é **presencial**, fora do escopo digital.

### 1.2 Objetivo (foco em MVP)

- Entregar um fluxo funcional completo (solicitação → análise → decisão) em até 24h de desenvolvimento.
- Utilizar exclusivamente serviços gerenciados do Firebase, eliminando a necessidade de backend próprio.
- Garantir que o app funcione, ainda que de forma degradada, sem conexão à internet.
- Manter o escopo estritamente funcional: **sem upload de arquivos, sem microserviços, sem infraestrutura extra**.

### 1.3 Fora de escopo (reforço)

- Upload/armazenamento de documentos (RG, comprovantes, etc.)
- Pagamento online
- Backend customizado (Node/Express, etc.)
- Multi-tenant (múltiplas escolas) — assume-se uma única instituição

---

## 2. Arquitetura Simplificada (Firebase)

### 2.1 Visão geral

Arquitetura **serverless**, 100% baseada em serviços gerenciados do Firebase. O frontend Next.js se comunica diretamente com os serviços Firebase via SDK client-side, sem camada de API intermediária.

```
┌─────────────────────────────────────────────────────────┐
│                     CLIENTE (Browser)                     │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Next.js PWA (React)                               │  │
│  │  - Páginas: /login, /pai, /coordenacao             │  │
│  │  - Service Worker (cache + offline)                │  │
│  │  - Firestore SDK (persistência offline habilitada) │  │
│  └───────────────────────────────────────────────────┘  │
└───────────────────────┬───────────────────────────────────┘
                         │ HTTPS (SDK client-side)
                         ▼
┌─────────────────────────────────────────────────────────┐
│                       FIREBASE                            │
│  ┌───────────────┐ ┌───────────────┐ ┌────────────────┐ │
│  │ Firebase Auth  │ │  Firestore    │ │  Cloud         │ │
│  │ (login pais/   │ │  (dados:      │ │  Messaging     │ │
│  │  coordenação)  │ │  turmas,      │ │  (FCM —        │ │
│  │                │ │  solicitações)│ │  notificações) │ │
│  └───────────────┘ └───────────────┘ └────────────────┘ │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Firebase Hosting  — deploy do PWA      │  │
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
| Next.js (App Router) | Renderização client-side (CSR), Roteamento de páginas, PWA shell,Uso de Client Components ("use client"),Integração direta com Firebase SDK,Sem uso de SSR, API Routes ou lógica backend no Next.js |
| Firebase Authentication | Login de pais e coordenação (e-mail/senha) |
| Firestore | Armazenamento de turmas, solicitações e usuários |
| Firestore Offline Persistence | Cache local automático + escrita offline |
| Firebase Cloud Messaging | Notificação push de aprovação/recusa |
| Service Worker (Workbox/next-pwa) | Cache de assets e páginas, funcionamento offline |
| Firebase Hosting  | Hospedagem e deploy contínuo |

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
    {
      urlPattern: /^https:\/\/firestore\.googleapis\.com\/.*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'firestore-cache',
        networkTimeoutSeconds: 5,
        expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 },
      },
    },
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
| Chamadas ao Firestore (via SDK) | Gerenciado pela persistência offline do Firestore (não pelo Service Worker) | Firestore SDK tem cache próprio, mais confiável que interceptar via SW |
| Páginas/rotas Next.js (HTML/JS/CSS) | `StaleWhileRevalidate` | Abre rápido, atualiza em segundo plano |
| Imagens/ícones estáticos | `CacheFirst` | Recursos que raramente mudam |
| Rota de login (Auth) | Sem cache agressivo | Depende de rede para autenticar |

### 3.3 Persistência offline do Firestore

O SDK do Firestore possui um mecanismo nativo de cache local (IndexedDB) que deve ser habilitado explicitamente:

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
| Visualizar turmas/solicitações já carregadas | Dados atualizados do servidor | Dados servidos do cache local do Firestore (podem estar desatualizados) |
| Criar solicitação de matrícula (pai) | Grava direto no Firestore | Grava localmente; documento fica com estado pendente de sincronização; é enviado automaticamente quando a conexão retornar |
| Aprovar/recusar solicitação (coordenação) | Grava direto no Firestore | Mesma lógica de escrita offline; **risco de conflito** em controle de vagas (ver seção 3.5) |
| Notificações (FCM) | Recebidas em tempo real | Não são entregues offline; sincronizadas apenas quando o dispositivo reconectar |

### 3.5 Limitações do modo offline

- **Consistência eventual**: escritas feitas offline só são persistidas no servidor quando a conexão retorna. Até lá, outros usuários não veem essas mudanças.
- **Transactions não funcionam offline de forma confiável**: o controle de vagas (que depende de `runTransaction`) exige rede ativa para garantir atomicidade real contra o servidor. Em modo offline, a escrita fica **pendente** e só é validada (podendo falhar) quando sincronizada.
- **Login inicial requer internet**: Firebase Authentication precisa de conexão para autenticar pela primeira vez; sessões já autenticadas permanecem válidas offline graças ao token em cache.
- **Notificações push não chegam offline** (dependem de conexão ativa com os servidores do FCM).
- **Não há resolução automática de conflitos complexa** — em caso de concorrência (duas gravações offline para a mesma vaga), a estratégia é *last-write-wins* nativa do Firestore, mitigada pelo uso de transactions quando online.

---

## 4. Modelagem de Dados (Firestore)

### 4.1 Visão geral das collections

| Collection | Descrição |
|---|---|
| `users` | Dados de perfil (pai ou coordenação) vinculados ao UID do Firebase Auth |
| `classes` | Turmas/cursos disponíveis, com controle de vagas |
| `enrollmentRequests` | Solicitações de matrícula feitas pelos pais |

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
| `fcmToken` | string | não | Token do dispositivo para push notifications |

### 4.3 `classes/{classId}`

```json
{
  "id": "turma-1a-2025",
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
| `id` | string | sim | Identificador da turma |
| `name` | string | sim | Nome/descrição da turma |
| `period` | string | sim | Turno (Manhã/Tarde/Integral) |
| `totalSpots` | number | sim | Total de vagas da turma |
| `occupiedSpots` | number | sim | Vagas já ocupadas (atualizado via transaction) |
| `active` | boolean | sim | Se a turma está aberta para solicitações |
| `createdAt` | timestamp | sim | Data de criação |

> **Nota de negócio:** o campo `occupiedSpots` é a fonte de verdade para o cálculo de vagas disponíveis (`totalSpots - occupiedSpots`). Pais **não têm acesso de leitura** a `totalSpots`/`occupiedSpots` (ver seção 5).

### 4.4 `enrollmentRequests/{requestId}`

```json
{
  "id": "req-001",
  "parentId": "f8h2k9...",
  "parentName": "Maria Souza",
  "studentName": "João Souza",
  "classId": "turma-1a-2025",
  "className": "1º Ano A - Ensino Fundamental",
  "status": "pending",
  "rejectionReason": null,
  "createdAt": "2025-02-01T09:00:00Z",
  "updatedAt": "2025-02-01T09:00:00Z",
  "reviewedBy": null
}
```

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `id` | string | sim | Identificador da solicitação |
| `parentId` | string | sim | UID do responsável solicitante |
| `parentName` | string | sim | Nome do responsável (desnormalizado para exibição) |
| `studentName` | string | sim | Nome do aluno |
| `classId` | string | sim | Referência à turma solicitada |
| `className` | string | sim | Nome da turma (desnormalizado) |
| `status` | string (`pending` \| `approved` \| `rejected`) | sim | Estado da solicitação |
| `rejectionReason` | string \| null | condicional | Obrigatório quando `status = rejected` |
| `createdAt` | timestamp | sim | Data da solicitação |
| `updatedAt` | timestamp | sim | Última atualização de status |
| `reviewedBy` | string \| null | não | UID do membro da coordenação que avaliou |

### 4.5 Diagrama relacional (descritivo)

```
users (1) ──────< enrollmentRequests (N)
  (role=parent)         │
                         │ classId
                         ▼
                     classes (1)
```

- Um `user` (pai) pode ter várias `enrollmentRequests`.
- Cada `enrollmentRequest` referencia exatamente uma `class`.
- `classes` não referencia `enrollmentRequests` diretamente — a contagem de vagas é mantida via campo `occupiedSpots`, atualizado por transaction no momento da aprovação.

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
| Criar solicitação de matrícula | ✅ (para si/seus filhos) | ❌ |
| Ver suas próprias solicitações | ✅ | ✅ (todas) |
| Ver vagas disponíveis/ocupadas de uma turma | ❌ | ✅ |
| Ver lista de turmas (nome, período) | ✅ (dados básicos) | ✅ (completo) |
| Aprovar/recusar solicitação | ❌ | ✅ |
| Editar solicitação após criada | ❌ | ✅ (apenas status/justificativa) |
| Criar/editar turmas | ❌ | ✅ |

> Conforme especificado: **pais não veem vagas**; apenas a coordenação tem acesso a `totalSpots`/`occupiedSpots`. Isso é garantido tanto na UI quanto nas **Security Rules** (camada de segurança real).

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

### 6.1 Fluxo do pai (solicitação de matrícula)

```
1. Pai faz login (Firebase Auth)
2. Pai visualiza lista de turmas disponíveis (nome, período — sem vagas)
3. Pai preenche formulário:
   - Nome do aluno
   - Turma desejada
4. Pai envia solicitação
   → Cria documento em enrollmentRequests com status "pending"
5. Pai acompanha status da solicitação (pending / approved / rejected)
6. Pai recebe notificação (FCM) quando status mudar
```

### 6.2 Fluxo da coordenação (aprovação/recusa)

```
1. Coordenação faz login (Firebase Auth)
2. Coordenação visualiza lista de solicitações pendentes
   (com nome do aluno, nome do pai, turma solicitada)
3. Coordenação visualiza vagas disponíveis da turma (totalSpots - occupiedSpots)
4. Coordenação decide:
   a) APROVAR
      → Executa transaction:
         - Verifica se ainda há vaga disponível
         - Incrementa occupiedSpots
         - Atualiza status da solicitação para "approved"
      → Dispara notificação FCM ao pai
   b) RECUSAR
      → Exige preenchimento de justificativa (rejectionReason)
      → Atualiza status da solicitação para "rejected"
      → Dispara notificação FCM ao pai
```

### 6.3 Fluxo offline (sincronização)

```
1. Usuário perde conexão
2. App continua funcionando com dados em cache (Service Worker + Firestore local)
3. Usuário realiza ação (ex.: pai cria solicitação; coordenação aprova)
   → Firestore SDK grava a operação localmente (fila de escrita pendente)
   → UI reflete a mudança otimisticamente (estado "local", ainda não confirmado)
4. Conexão retorna
5. Firestore SDK sincroniza automaticamente a fila de escritas com o servidor
6. Em caso de aprovação offline:
   → A transaction de controle de vagas só é validada de fato quando sincronizada
   → Se a vaga não existir mais no momento da sincronização, a transaction falha
     e a coordenação deve ser avisada para reavaliar a solicitação
```

---

## 7. Regras de Negócio

### 7.1 Controle de vagas

- Cada turma (`classes/{classId}`) possui `totalSpots` e `occupiedSpots`.
- Vagas disponíveis = `totalSpots - occupiedSpots`.
- Uma solicitação só pode ser **aprovada** se `occupiedSpots < totalSpots` no momento da aprovação.
- O incremento de `occupiedSpots` **deve** ocorrer dentro de uma `runTransaction`, para evitar condição de corrida quando duas aprovações simultâneas disputam a última vaga.

### 7.2 Máquina de estados da solicitação

```
pending ──approve──> approved
   │
   └──reject────────> rejected (rejectionReason obrigatório)
```

| Status | Descrição |
|---|---|
| `pending` | Estado inicial, aguardando análise da coordenação |
| `approved` | Vaga confirmada; `occupiedSpots` incrementado |
| `rejected` | Solicitação recusada; `rejectionReason` preenchido |

- Transições são **unidirecionais** no MVP (não há reversão de `approved`/`rejected` para `pending`).
- `rejectionReason` é **campo obrigatório** sempre que `status` for definido como `rejected` — validado tanto na UI quanto na Security Rule.

### 7.3 Exemplo de transaction (aprovação com controle de vagas)

```javascript
import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export async function approveEnrollmentRequest(requestId, classId, reviewerUid) {
  const classRef = doc(db, 'classes', classId);
  const requestRef = doc(db, 'enrollmentRequests', requestId);

  await runTransaction(db, async (transaction) => {
    const classSnap = await transaction.get(classRef);

    if (!classSnap.exists()) {
      throw new Error('Turma não encontrada.');
    }

    const { totalSpots, occupiedSpots } = classSnap.data();

    if (occupiedSpots >= totalSpots) {
      throw new Error('Não há vagas disponíveis nesta turma.');
    }

    transaction.update(classRef, {
      occupiedSpots: occupiedSpots + 1,
    });

    transaction.update(requestRef, {
      status: 'approved',
      reviewedBy: reviewerUid,
      updatedAt: serverTimestamp(),
    });
  });
}
```

### 7.4 Exemplo de recusa (com justificativa obrigatória)

```javascript
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export async function rejectEnrollmentRequest(requestId, reviewerUid, reason) {
  if (!reason || reason.trim().length === 0) {
    throw new Error('A justificativa de recusa é obrigatória.');
  }

  const requestRef = doc(db, 'enrollmentRequests', requestId);

  await updateDoc(requestRef, {
    status: 'rejected',
    rejectionReason: reason,
    reviewedBy: reviewerUid,
    updatedAt: serverTimestamp(),
  });
}
```

---

## 8. Integração Firebase

### 8.1 Firestore — CRUD básico

**Criar solicitação (pai):**

```javascript
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export async function createEnrollmentRequest({ parentId, parentName, studentName, classId, className }) {
  return addDoc(collection(db, 'enrollmentRequests'), {
    parentId,
    parentName,
    studentName,
    classId,
    className,
    status: 'pending',
    rejectionReason: null,
    reviewedBy: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}
```

**Listar solicitações do pai (com listener em tempo real):**

```javascript
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';

export function listenParentRequests(parentId, callback) {
  const q = query(collection(db, 'enrollmentRequests'), where('parentId', '==', parentId));

  return onSnapshot(q, (snapshot) => {
    const requests = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(requests);
  });
}
```

**Listar solicitações pendentes (coordenação):**

```javascript
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';

export function listenPendingRequests(callback) {
  const q = query(
    collection(db, 'enrollmentRequests'),
    where('status', '==', 'pending'),
    orderBy('createdAt', 'asc')
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

### 8.3 Firebase Cloud Messaging — notificações

**Registro do token no cliente:**

```javascript
import { getToken } from 'firebase/messaging';
import { doc, updateDoc } from 'firebase/firestore';
import { getMessagingIfSupported, db } from './firebase';

export async function registerFcmToken(uid) {
  const messaging = await getMessagingIfSupported();
  if (!messaging) return;

  const token = await getToken(messaging, {
    vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
  });

  if (token) {
    await updateDoc(doc(db, 'users', uid), { fcmToken: token });
  }
}
```

**Service Worker de mensagens (`public/firebase-messaging-sw.js`):**

```javascript
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'SUA_API_KEY',
  authDomain: 'SEU_PROJETO.firebaseapp.com',
  projectId: 'SEU_PROJETO',
  messagingSenderId: 'SEU_SENDER_ID',
  appId: 'SEU_APP_ID',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  self.registration.showNotification(payload.notification.title, {
    body: payload.notification.body,
    icon: '/icons/icon-192.png',
  });
});
```

**Envio de notificação ao aprovar/recusar** — no MVP, o envio de push via FCM a partir do cliente exige uma função server-side (Cloud Function) **ou** pode ser simplificado usando apenas notificação in-app (Firestore listener) para reduzir complexidade dentro das 24h. Recomenda-se, para o MVP estrito, **substituir o push real por notificação in-app** (badge/alerta na UI via `onSnapshot`), deixando o FCM como melhoria futura caso o tempo permita uma Cloud Function simples de disparo.

---

## 9. Tecnologias Sugeridas

### 9.1 Justificativa da escolha do Firebase

| Necessidade do projeto | Como o Firebase atende |
|---|---|
| Backend em poucas horas | Serviços gerenciados prontos (Auth, Firestore, FCM) — zero infraestrutura para provisionar |
| Autenticação segura | Firebase Auth pronto, com SDK client-side simples |
| Banco de dados em tempo real | Firestore com listeners nativos (`onSnapshot`) |
| Funcionamento offline | Firestore possui persistência offline nativa (IndexedDB) |
| Hospedagem rápida | Firebase Hosting ou Vercel — deploy em minutos |
| Controle de acesso sem backend | Security Rules substituem a necessidade de uma API de autorização |
| Notificações | FCM integrado ao mesmo ecossistema |

### 9.2 Vantagens para desenvolvimento em 24h

- **Zero setup de servidor**: não há necessidade de provisionar, configurar ou fazer deploy de um backend.
- **SDKs client-side maduros**: reduzem drasticamente a quantidade de código necessário para CRUD, autenticação e tempo real.
- **Security Rules como única camada de autorização**: elimina a necessidade de escrever middleware de autenticação/autorização.
- **Ecossistema único**: Auth, Firestore, FCM e Hosting integrados, sem necessidade de conectar múltiplos provedores.
- **Persistência offline "out of the box"**: atende ao requisito de PWA offline sem código adicional de sincronização manual.

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
      // Pais podem ler apenas campos básicos (a restrição de campo é reforçada na camada de UI;
      // Firestore Rules não filtram campos, então dados sensíveis de vaga idealmente
      // ficam em subcoleção separada visível apenas a admin — ver nota abaixo)
      allow read: if isSignedIn();
      allow write: if isAdmin();
    }

    // --- enrollmentRequests ---
    match /enrollmentRequests/{requestId} {
      allow create: if isParent()
                    && request.resource.data.parentId == request.auth.uid
                    && request.resource.data.status == 'pending';

      allow read: if isSignedIn() &&
                  (isAdmin() || resource.data.parentId == request.auth.uid);

      // Apenas admin pode alterar status/justificativa
      allow update: if isAdmin()
                    && (request.resource.data.status in ['approved', 'rejected'])
                    && (request.resource.data.status != 'rejected'
                        || request.resource.data.rejectionReason is string
                        && request.resource.data.rejectionReason.size() > 0);

      allow delete: if false;
    }
  }
}
```

> **Nota sobre ocultar vagas dos pais:** Firestore Security Rules não filtram campos individuais de um documento — a regra é "tudo ou nada" por documento. Para impedir tecnicamente que pais leiam `totalSpots`/`occupiedSpots`, a abordagem recomendada no MVP é:
> 1. Manter um documento público simplificado em `classesPublic/{classId}` (somente `name`, `period`, `active`) legível por todos os autenticados; **ou**
> 2. Aceitar que, no MVP, a restrição de visualização de vagas seja garantida apenas na camada de UI (pai nunca vê o campo na tela), documentando esse trade-off como limitação aceitável dado o prazo de 24h.

### 10.2 Controle de acesso por role — resumo

| Recurso | Regra de leitura | Regra de escrita |
|---|---|---|
| `users/{uid}` | Próprio usuário ou admin | Próprio usuário (sem alterar role) |
| `classes/{classId}` | Qualquer usuário autenticado | Somente admin |
| `enrollmentRequests/{id}` | Dono da solicitação ou admin | Criação: pai (para si); Atualização de status: somente admin |

### 10.3 Proteção básica de dados

- Todas as escritas exigem `request.auth != null` (usuário autenticado).
- Nenhuma escrita direta de `occupiedSpots` é permitida pelo cliente fora da transaction controlada por regra de admin.
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
- Reversão de status (`approved`/`rejected` → `pending`).
- Filtragem de campos sensíveis por regra nativa do Firestore (mitigada via UI, conforme nota da seção 10.1).

### 11.2 Trade-offs do uso de Firebase

| Trade-off | Descrição |
|---|---|
| Vendor lock-in | Toda a lógica depende do ecossistema Firebase/Google Cloud |
| Regras "tudo ou nada" por documento | Exige modelagem cuidadosa (ou subcoleções) para esconder campos específicos |
| Lógica de negócio no cliente | Transactions e validações rodam no client-side, exigindo Security Rules bem escritas como última linha de defesa |
| Notificações push reais exigem Cloud Function | Simplificado no MVP para notificação in-app, conforme seção 8.3 |
| Sem camada de API própria | Qualquer regra de negócio mais complexa no futuro exigirá Cloud Functions |

### 11.3 Limitações offline

- Consistência **eventual**, não imediata — dados podem estar desatualizados até a reconexão.
- Aprovações feitas offline não têm garantia final até a sincronização (a transaction pode falhar se a vaga se esgotar entre a ação offline e a sincronização).
- Notificações push não são entregues enquanto o dispositivo estiver offline.
- Primeiro login sempre exige conexão ativa.
- Não há indicador sofisticado de "status de sincronização" no MVP — recomenda-se, no mínimo, um indicador simples de "alterações pendentes de sincronização" na UI.

---

*Fim do documento técnico.*
