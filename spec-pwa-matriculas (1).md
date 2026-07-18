# Especificação Técnica — PWA de Reserva de Matrículas Escolares

**Tipo de projeto:** MVP (Minimum Viable Product)
**Prazo alvo:** até 24 horas de desenvolvimento
**Stack:** Next.js (App Router, 100% client-side) + Firebase (Auth, Firestore, FCM, Hosting)

---

## Sumário

1. [Arquitetura](#1-arquitetura)
2. [Modelagem do Firestore](#2-modelagem-do-firestore)
3. [Estrutura do Frontend](#3-estrutura-do-frontend)
4. [Gerenciamento de Estado](#4-gerenciamento-de-estado)
5. [Estratégia Offline](#5-estratégia-offline)
6. [Sistema de Notificações (FCM)](#6-sistema-de-notificações-fcm)
7. [Fluxos do Sistema](#7-fluxos-do-sistema)
8. [Regras de Segurança do Firestore](#8-regras-de-segurança-do-firestore)
9. [Deploy — Passo a Passo](#9-deploy--passo-a-passo)
10. [Trechos de Código](#10-trechos-de-código)
11. [Cronograma de 24h](#11-cronograma-de-24h)
12. [Riscos e Trade-offs Assumidos](#12-riscos-e-trade-offs-assumidos)

---

## 1. Arquitetura

### 1.1 Visão geral

```
┌─────────────────────────────────────────────────────────────┐
│                         DISPOSITIVO                          │
│  ┌───────────────────────────────────────────────────────┐  │
│  │            Next.js App (CSR only, "use client")         │  │
│  │  ┌───────────┐  ┌───────────┐  ┌──────────────────┐     │  │
│  │  │ Páginas /  │  │  Contexto  │  │  Service Worker   │     │  │
│  │  │ Componentes│  │  Auth/App  │  │  (cache + PWA)    │     │  │
│  │  └─────┬──────┘  └─────┬──────┘  └─────────┬─────────┘     │  │
│  │        │               │                   │             │  │
│  │        └───────────────┴───────────────────┘             │  │
│  │                        │  Firebase SDK (client)           │  │
│  └────────────────────────┼──────────────────────────────────┘  │
└───────────────────────────┼──────────────────────────────────────┘
                             │  HTTPS
                             ▼
        ┌───────────────────────────────────────────┐
        │                 FIREBASE                    │
        │  ┌───────────┐ ┌────────────┐ ┌───────────┐ │
        │  │   Auth     │ │  Firestore │ │    FCM    │ │
        │  │ (email/pw) │ │ (offline   │ │ (push)    │ │
        │  │            │ │ persist.)  │ │           │ │
        │  └───────────┘ └────────────┘ └───────────┘ │
        │  ┌───────────────────────────────────────┐   │
        │  │             Firebase Hosting            │   │
        │  └───────────────────────────────────────┘   │
        └───────────────────────────────────────────┘
```

### 1.2 Princípios de arquitetura

- **Sem servidor intermediário**: todo acesso a dados é feito diretamente pelo Firebase SDK no navegador.
- **Sem SSR/API Routes**: Next.js atua apenas como App Shell + roteador de páginas client-side. Todas as páginas usam `"use client"`.
- **Autorização por papel (role)** feita via campo `role` no documento do usuário (`admin` ou `parent`) e validada pelas *Security Rules* do Firestore — não há lógica de backend própria.
- **Notificações de "início do período de matrícula"**: como não há backend, esse gatilho não pode ser um cron job de servidor. A abordagem MVP é: a coordenação cria um documento `enrollmentPeriods` com `startDate`; o client, ao abrir o app, verifica se a data já chegou e dispara uma notificação local (via `Notification` API) ou а coordenação envia manualmente uma notificação broadcast pelo Firebase Console/Cloud Messaging ao abrir o período. (Ver seção 6.3 para detalhes e limitação assumida.)

---

## 2. Modelagem do Firestore

Estrutura desnormalizada, otimizada para leitura direta por tela (evita joins).

### `users/{uid}`
```json
{
  "uid": "auth-uid",
  "name": "Maria Silva",
  "email": "maria@example.com",
  "role": "parent",            // "parent" | "admin"
  "fcmTokens": ["token1", "token2"],
  "createdAt": "timestamp"
}
```

### `classes/{classId}`
```json
{
  "courseName": "Ensino Fundamental",
  "grade": "5º Ano",
  "year": 2027,
  "capacity": 30,
  "occupied": 27,               // contador desnormalizado, só lido pela coordenação
  "active": true,
  "createdAt": "timestamp"
}
```
> `occupied` é incrementado/decrementado no client ao aprovar/rejeitar/cancelar uma reserva (transação simples do Firestore). Não é exposto na UI do responsável.

### `reservations/{reservationId}`
```json
{
  "parentId": "auth-uid",
  "parentName": "Maria Silva",      // desnormalizado p/ tela da coordenação
  "classId": "classId",
  "courseName": "Ensino Fundamental", // desnormalizado p/ tela do responsável
  "grade": "5º Ano",
  "status": "PENDING",              // "PENDING" | "APPROVED" | "REJECTED"
  "overCapacity": false,
  "rejectionReason": null,
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

### `notifications/{notificationId}`
```json
{
  "userId": "auth-uid",
  "title": "Solicitação aprovada",
  "body": "Sua reserva para o 5º Ano foi aprovada.",
  "type": "APPROVED",           // "APPROVED" | "REJECTED" | "PERIOD_START"
  "reservationId": "reservationId",
  "read": false,
  "createdAt": "timestamp"
}
```

### `enrollmentPeriods/{periodId}` (auxiliar, para o gatilho de notificação)
```json
{
  "year": 2027,
  "startDate": "timestamp",
  "endDate": "timestamp",
  "announced": false
}
```

---

## 3. Estrutura do Frontend

```
src/
├── app/
│   ├── layout.tsx                 # "use client" root shell + registro do SW
│   ├── page.tsx                   # redireciona conforme auth/role
│   ├── login/
│   │   └── page.tsx
│   ├── responsavel/
│   │   ├── layout.tsx             # guarda de rota: role === "parent"
│   │   ├── page.tsx               # lista de reservas do responsável
│   │   ├── nova-reserva/
│   │   │   └── page.tsx           # formulário curso + série
│   │   └── notificacoes/
│   │       └── page.tsx
│   └── coordenacao/
│       ├── layout.tsx             # guarda de rota: role === "admin"
│       ├── page.tsx               # dashboard: solicitações pendentes
│       ├── turmas/
│       │   └── page.tsx           # CRUD de turmas + capacidade/ocupação
│       └── solicitacoes/
│           └── [id]/page.tsx      # aprovar/rejeitar com justificativa
├── components/
│   ├── ReservationCard.tsx
│   ├── ClassForm.tsx
│   ├── StatusBadge.tsx
│   ├── OfflineBanner.tsx
│   └── ProtectedRoute.tsx
├── context/
│   ├── AuthContext.tsx            # user, role, loading
│   └── ConnectivityContext.tsx    # online/offline state
├── lib/
│   ├── firebase.ts                # init do app + auth + firestore + messaging
│   ├── reservations.ts            # funções de CRUD (createReservation, etc.)
│   ├── classes.ts
│   └── notifications.ts
├── public/
│   ├── manifest.json
│   ├── sw.js
│   └── icons/
└── next.config.js
```

Guarda de rota simples (client-side): cada `layout.tsx` de seção verifica `user` e `role` do `AuthContext`; se não bater, redireciona com `useRouter().replace(...)`.

---

## 4. Gerenciamento de Estado

Para um MVP de 24h, **React Context + hooks nativos** é suficiente — não há necessidade de Redux/Zustand.

- `AuthContext`: expõe `{ user, role, loading }`, populado via `onAuthStateChanged` + leitura do documento `users/{uid}`.
- `ConnectivityContext`: escuta `window.addEventListener('online'/'offline')` para exibir um banner de "modo offline" e explicar que ações serão sincronizadas depois.
- Dados de listas (reservas, turmas) são obtidos com `onSnapshot` (listener em tempo real do Firestore), que já entrega dados do cache local quando offline — dispensando estado global adicional de "dados".

---

## 5. Estratégia Offline

### 5.1 Persistência do Firestore

Ativar a persistência offline do SDK do Firestore assim que o app inicializa (uma única chamada). Isso faz o SDK:
- Manter uma cópia local (IndexedDB) das últimas queries/documents lidos.
- Responder leituras (`onSnapshot`/`getDocs`) imediatamente a partir do cache quando não há rede.
- Permitir **escritas offline**: `addDoc`/`updateDoc` chamados sem conexão são enfileirados automaticamente pelo próprio SDK e sincronizados quando a conexão retorna — **sem necessidade de fila manual**.

### 5.2 Criação de reserva offline

O fluxo de criação de reserva (`addDoc` em `reservations`) funciona igual online ou offline: o SDK grava no cache local imediatamente, a UI já mostra a reserva com status `PENDING` (otimista), e o `onSnapshot` do dono do documento recebe a confirmação/alterações quando a sincronização ocorrer. Não é necessário implementar fila própria — isso é delegado ao SDK, conforme restrição do projeto de evitar lógica de sincronização manual.

### 5.3 Limitações assumidas (MVP)

- Se dois responsáveis criarem reservas offline para a última vaga de uma turma, ambas serão aceitas localmente e sincronizadas como `PENDING`; o `overCapacity` só é calculado quando a coordenação abrir a solicitação (client, no momento da aprovação, verifica `occupied >= capacity`). Isso é aceitável dado que a restrição do projeto permite consistência eventual.
- Login inicial (`signInWithEmailAndPassword`) **requer rede** na primeira vez; sessões já autenticadas persistem localmente e funcionam offline.

### 5.4 Cache de assets (Service Worker)

Cache-first simples para assets estáticos (JS/CSS/ícones/manifest) e network-first com fallback de cache para navegação de páginas — ver código na seção 10.4.

---

## 6. Sistema de Notificações (FCM)

### 6.1 Fluxo técnico
1. No login, o client solicita permissão de notificação (`Notification.requestPermission`).
2. Se concedida, obtém o token FCM (`getToken`) e grava em `users/{uid}.fcmTokens` (array, para suportar múltiplos dispositivos).
3. Envio de notificações **não tem backend** para disparar automaticamente — no MVP, o envio é feito de duas formas:
   - **Aprovação/rejeição**: o client da coordenação, ao atualizar o status da reserva, grava um documento em `notifications/{id}` (para exibir na tela "Notificações" do responsável via `onSnapshot`) — isso cobre a notificação *in-app*. O envio de push real (FCM) sem servidor exige ou (a) o **Firebase Console** para envio manual, ou (b) uma **Cloud Function** — que está fora do escopo desta stack. **Decisão de MVP**: usar apenas notificação in-app (documento em `notifications`) como fonte de verdade, com push via FCM tratado como *enhancement* futuro que exigiria uma function server-side (documentado como débito técnico, não implementado agora).
4. **Início do período de matrícula**: a coordenação marca `enrollmentPeriods.announced = true` manualmente ao abrir o período; todos os responsáveis com `onSnapshot` nesse documento recebem a atualização em tempo real e o client gera uma notificação in-app local.

### 6.2 Justificativa da simplificação
Push notification "real" (que acorda o app fechado) depende de um dispatcher server-side (Cloud Function ou Admin SDK). Como o projeto proíbe explicitamente backend customizado, o MVP implementa apenas o **transporte do token** (pronto para uso futuro) e a **notificação in-app via Firestore**, que já resolve o requisito funcional dentro do prazo de 24h.

### 6.3 Débito técnico documentado
Para push real (app fechado/minimizado), será necessária futuramente uma Cloud Function `onWrite` em `reservations` e `enrollmentPeriods` que chama a Admin SDK do FCM — fora do escopo deste MVP.

---

## 7. Fluxos do Sistema

### 7.1 Autenticação
```
Usuário abre app → Firebase Auth (persistência local)
  → se não logado: tela de login (email/senha)
  → se logado: lê users/{uid} → obtém role
      → role = parent → redireciona /responsavel
      → role = admin  → redireciona /coordenacao
```
Cadastro de novos responsáveis: formulário simples de `createUserWithEmailAndPassword` + criação do doc `users/{uid}` com `role: "parent"`. Contas `admin` são criadas manualmente (Firebase Console ou seed script) — não há autoatribuição de admin.

### 7.2 Criação de reserva (online e offline)
```
Responsável seleciona curso + série (lista vem de classes ativas)
  → addDoc em reservations { status: "PENDING", ... }
     (funciona igual online/offline — SDK enfileira automaticamente)
  → UI mostra reserva imediatamente (otimista)
  → onSnapshot atualiza status quando processado pela coordenação
```

### 7.3 Aprovação/rejeição pela coordenação
```
Coordenação abre solicitação PENDING
  → decide Aprovar ou Rejeitar
     → Aprovar:
         - transação: occupied += 1 na turma
         - se occupied > capacity → grava overCapacity: true
         - updateDoc reservation.status = "APPROVED"
         - addDoc notifications { type: "APPROVED", userId: parentId }
     → Rejeitar:
         - exige campo "justificativa" (obrigatório, não pode ser vazio)
         - updateDoc reservation.status = "REJECTED", rejectionReason
         - addDoc notifications { type: "REJECTED", userId: parentId }
```

### 7.4 Disparo de notificações
Coberto na seção 6 — via documento `notifications` + `onSnapshot` no client do responsável (badge/lista).

### 7.5 Sincronização offline
Delegada inteiramente ao SDK do Firestore (persistência offline habilitada) — sem lógica manual, conforme seção 5.

---

## 8. Regras de Segurança do Firestore

Regras básicas, suficientes para o MVP (sem validações sofisticadas):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isSignedIn() {
      return request.auth != null;
    }

    function isAdmin() {
      return isSignedIn() &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == "admin";
    }

    match /users/{userId} {
      allow read: if isSignedIn() && (request.auth.uid == userId || isAdmin());
      allow create: if isSignedIn() && request.auth.uid == userId;
      allow update: if isSignedIn() && request.auth.uid == userId; // usuário só edita o próprio perfil
    }

    match /classes/{classId} {
      allow read: if isSignedIn();       // responsável lê classes, mas a UI oculta "occupied"/"capacity"
      allow write: if isAdmin();
    }

    match /reservations/{reservationId} {
      allow create: if isSignedIn() &&
                      request.resource.data.parentId == request.auth.uid &&
                      request.resource.data.status == "PENDING";
      allow read: if isSignedIn() &&
                    (resource.data.parentId == request.auth.uid || isAdmin());
      allow update: if isAdmin(); // só coordenação aprova/rejeita
    }

    match /notifications/{notificationId} {
      allow read: if isSignedIn() && resource.data.userId == request.auth.uid;
      allow create: if isAdmin();
      allow update: if isSignedIn() && resource.data.userId == request.auth.uid; // marcar como lida
    }

    match /enrollmentPeriods/{periodId} {
      allow read: if isSignedIn();
      allow write: if isAdmin();
    }
  }
}
```

> **Observação de segurança**: ocultar `capacity`/`occupied` "apenas na UI" não é seguro de verdade — qualquer responsável logado tecnicamente consegue ler o documento via console do navegador, já que a regra acima permite `read` geral em `classes`. Para o MVP isso é aceito como trade-off (dado explícito de "segurança básica"), mas fica documentado como risco (seção 12). Uma correção futura seria separar `classes` (público) de um subcampo/coleção `classesCapacity` só legível por admin.

---

## 9. Deploy — Passo a Passo

1. **Criar projeto no Firebase Console** → ativar Authentication (método Email/Senha), Firestore (modo produção), Cloud Messaging.
2. **Instalar Firebase CLI**: `npm install -g firebase-tools` → `firebase login`.
3. **Inicializar Hosting**: `firebase init hosting` (apontar `public directory` para a pasta de build estático do Next.js, ex.: `out`).
4. **Configurar Next.js para export estático** (já que não há SSR/API routes): `next.config.js` com `output: 'export'`.
5. **Build**: `npm run build` → gera pasta `out/`.
6. **Deploy das regras do Firestore**: `firebase deploy --only firestore:rules`.
7. **Deploy do Hosting**: `firebase deploy --only hosting`.
8. **Registrar o Service Worker**: garantir que `sw.js` e `manifest.json` estejam na pasta `public/` do Next.js para irem junto no `out/`.
9. **Testar instalação PWA**: abrir a URL de produção no Chrome mobile/desktop e verificar prompt de "Instalar app".
10. **Criar usuário admin inicial**: manualmente pelo Firebase Console (Authentication) + criar doc correspondente em `users/{uid}` com `role: "admin"` (via console do Firestore ou script único).

---

## 10. Trechos de Código

### 10.1 Inicialização do Firebase (`src/lib/firebase.ts`)
```ts
"use client";
import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";
import { getMessaging, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Firestore com persistência offline habilitada (multi-tab)
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});

export async function getMessagingIfSupported() {
  if (typeof window === "undefined") return null;
  const supported = await isSupported();
  return supported ? getMessaging(app) : null;
}
```

### 10.2 Autenticação (`src/context/AuthContext.tsx`)
```tsx
"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

type Role = "parent" | "admin" | null;
const AuthContext = createContext<{ user: User | null; role: Role; loading: boolean }>({
  user: null,
  role: null,
  loading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const snap = await getDoc(doc(db, "users", firebaseUser.uid));
        setRole(snap.exists() ? (snap.data().role as Role) : null);
      } else {
        setRole(null);
      }
      setLoading(false);
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, role, loading }}>{children}</AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
```

### 10.3 CRUD no Firestore — criação de reserva (`src/lib/reservations.ts`)
```ts
"use client";
import { addDoc, collection, serverTimestamp, updateDoc, doc, runTransaction } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function createReservation({
  parentId,
  parentName,
  classId,
  courseName,
  grade,
}: {
  parentId: string;
  parentName: string;
  classId: string;
  courseName: string;
  grade: string;
}) {
  // Funciona online ou offline: o SDK enfileira a escrita automaticamente.
  return addDoc(collection(db, "reservations"), {
    parentId,
    parentName,
    classId,
    courseName,
    grade,
    status: "PENDING",
    overCapacity: false,
    rejectionReason: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function approveReservation(reservationId: string, classId: string) {
  const classRef = doc(db, "classes", classId);
  const reservationRef = doc(db, "reservations", reservationId);

  await runTransaction(db, async (tx) => {
    const classSnap = await tx.get(classRef);
    const { capacity, occupied } = classSnap.data() as { capacity: number; occupied: number };
    const newOccupied = occupied + 1;

    tx.update(classRef, { occupied: newOccupied });
    tx.update(reservationRef, {
      status: "APPROVED",
      overCapacity: newOccupied > capacity,
      updatedAt: serverTimestamp(),
    });
  });
}

export async function rejectReservation(reservationId: string, reason: string) {
  if (!reason.trim()) throw new Error("Justificativa é obrigatória.");
  await updateDoc(doc(db, "reservations", reservationId), {
    status: "REJECTED",
    rejectionReason: reason.trim(),
    updatedAt: serverTimestamp(),
  });
}
```

### 10.4 Service Worker (`public/sw.js`)
```js
const CACHE_NAME = "matriculas-cache-v1";
const APP_SHELL = ["/", "/manifest.json", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Estratégia simples: network-first com fallback para cache (navegação),
// cache-first para assets estáticos.
self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("/"))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      return (
        cached ||
        fetch(request).then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
      );
    })
  );
});
```

### 10.5 Manifest (`public/manifest.json`)
```json
{
  "name": "Reserva de Matrículas",
  "short_name": "Matrículas",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#1d4ed8",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

### 10.6 Registro do SW e permissão de notificações (`src/app/layout.tsx`)
```tsx
"use client";
import { useEffect } from "react";
import { AuthProvider } from "@/context/AuthContext";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(console.error);
    }
  }, []);

  return (
    <html lang="pt-BR">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#1d4ed8" />
      </head>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
```

### 10.7 Token FCM e notificações push (`src/lib/notifications.ts`)
```ts
"use client";
import { getToken, onMessage } from "firebase/messaging";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getMessagingIfSupported } from "@/lib/firebase";

export async function registerPushToken(uid: string) {
  const messaging = await getMessagingIfSupported();
  if (!messaging) return null;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return null;

  const token = await getToken(messaging, {
    vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
  });

  if (token) {
    await updateDoc(doc(db, "users", uid), { fcmTokens: arrayUnion(token) });
  }
  return token;
}

export async function listenForegroundMessages(callback: (payload: any) => void) {
  const messaging = await getMessagingIfSupported();
  if (!messaging) return;
  onMessage(messaging, callback);
}
```

---

## 11. Cronograma de 24h

| Bloco | Horas | Entregável |
|---|---|---|
| 1. Setup do projeto | 0h–2h | Repositório Next.js, Firebase config, deploy inicial vazio |
| 2. Autenticação | 2h–5h | Login, cadastro de responsável, `AuthContext`, guarda de rotas |
| 3. Modelagem + regras Firestore | 5h–7h | Coleções criadas, `firestore.rules` publicadas |
| 4. Fluxo do responsável | 7h–11h | Nova reserva, lista de reservas, status |
| 5. Fluxo da coordenação | 11h–15h | Dashboard de pendentes, aprovar/rejeitar, gestão de turmas |
| 6. Notificações in-app + token FCM | 15h–18h | Tela de notificações, registro de token |
| 7. PWA (manifest + SW) | 18h–20h | Instalável, cache básico funcionando |
| 8. Teste offline + ajustes | 20h–22h | Validar criação de reserva offline e sincronização |
| 9. Deploy final + QA | 22h–24h | Deploy em produção, checklist de aceitação |

---

## 12. Riscos e Trade-offs Assumidos

- **Capacidade/ocupação de turma não é verdadeiramente privada** — só está oculta na UI, não protegida por regra granular (ver seção 8). Aceito como trade-off do MVP.
- **Push notification real (app fechado)** não é implementado — apenas notificação in-app e transporte de token pronto para uso futuro (ver seção 6.3).
- **Notificação de "início do período de matrícula"** depende de ação manual da coordenação para marcar `announced: true`; não há disparo automático baseado em data sem backend.
- **Condição de corrida em vagas** (duas aprovações simultâneas) é mitigada com transação do Firestore no momento da aprovação, mas reservas `PENDING` podem ultrapassar a capacidade "aparente" até serem processadas — aceito como consistência eventual.
- **`next.config.js` com `output: 'export'`** implica que rotas dinâmicas (`/coordenacao/solicitacoes/[id]`) precisam ser tratadas como client-side routing puro (sem geração estática por parâmetro) — resolvido lendo o `id` via `useSearchParams`/hash de rota no client, evitando qualquer geração de página no servidor.
