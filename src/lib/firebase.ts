import { initializeApp, getApps, getApp } from "firebase/app";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentSingleTabManager,
  doc as fireDoc,
  collection as fireCollection,
  query as fireQuery,
  where as fireWhere,
  onSnapshot as fireOnSnapshot,
  getDoc as fireGetDoc,
  setDoc as fireSetDoc,
  addDoc as fireAddDoc,
  updateDoc as fireUpdateDoc,
  runTransaction as fireRunTransaction,
  serverTimestamp as fireServerTimestamp,
} from "firebase/firestore";
import {
  getAuth,
  signInWithEmailAndPassword as fireSignIn,
  createUserWithEmailAndPassword as fireCreateUser,
  signOut as fireSignOut,
  onAuthStateChanged as fireOnAuthChange,
} from "firebase/auth";
import { getMessaging, isSupported } from "firebase/messaging";

// Detect if real Firebase should be used
const isRealFirebase =
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY !== "sua_api_key_aqui" &&
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY !== "";

// ==========================================
// REAL FIREBASE SYSTEM
// ==========================================
let realApp: any;
let realDb: any;
let realAuth: any;

if (isRealFirebase) {
  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
  realApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  realDb = initializeFirestore(realApp, {
    localCache: persistentLocalCache({
      tabManager: persistentSingleTabManager({}),
    }),
  });
  realAuth = getAuth(realApp);
}

// ==========================================
// SIMULATOR STATE & DATABASE (LOCAL STORAGE)
// ==========================================
const initSimulatorDb = () => {
  if (typeof window === "undefined") return;

  // Initial dummy classes
  if (!localStorage.getItem("mock_classes")) {
    const defaultClasses = [
      { id: "class-1", name: "1º Ano A - Ensino Fundamental", period: "Manhã", totalSpots: 30, occupiedSpots: 28, active: true },
      { id: "class-2", name: "2º Ano B - Ensino Fundamental", period: "Tarde", totalSpots: 25, occupiedSpots: 20, active: true },
      { id: "class-3", name: "3º Ano C - Ensino Fundamental", period: "Integral", totalSpots: 20, occupiedSpots: 20, active: true },
      { id: "class-4", name: "4º Ano A - Ensino Fundamental", period: "Manhã", totalSpots: 30, occupiedSpots: 15, active: false }
    ];
    localStorage.setItem("mock_classes", JSON.stringify(defaultClasses));
  }

  // Initial Coordinator account
  if (!localStorage.getItem("mock_users")) {
    const defaultUsers = [
      {
        uid: "admin-coord",
        name: "Coordenação Escolar",
        email: "coord@escola.com",
        role: "admin",
        createdAt: new Date().toISOString()
      }
    ];
    localStorage.setItem("mock_users", JSON.stringify(defaultUsers));
  }

  if (!localStorage.getItem("mock_reservations")) {
    localStorage.setItem("mock_reservations", JSON.stringify([]));
  }
  if (!localStorage.getItem("mock_notifications")) {
    localStorage.setItem("mock_notifications", JSON.stringify([]));
  }
  if (!localStorage.getItem("mock_settings")) {
    localStorage.setItem("mock_settings", JSON.stringify({
      startDate: new Date().toISOString().split("T")[0],
      endDate: new Date(Date.now() + 30*24*60*60*1000).toISOString().split("T")[0],
      announced: true
    }));
  }
};

initSimulatorDb();

// Active Listeners for simulations
const listeners: { [collection: string]: Function[] } = {
  classes: [],
  reservations: [],
  notifications: [],
  settings: []
};

const triggerListeners = (col: string) => {
  const data = getMockData(col);
  listeners[col]?.forEach((cb) => cb(data));
};

const getMockData = (col: string) => {
  if (typeof window === "undefined") return [];
  if (col === "settings") {
    return JSON.parse(localStorage.getItem("mock_settings") || "{}");
  }
  return JSON.parse(localStorage.getItem(`mock_${col}`) || "[]");
};

const setMockData = (col: string, data: any) => {
  if (typeof window === "undefined") return;
  if (col === "settings") {
    localStorage.setItem("mock_settings", JSON.stringify(data));
  } else {
    localStorage.setItem(`mock_${col}`, JSON.stringify(data));
  }
  triggerListeners(col);
};

// Simulated Auth Session State
let currentMockUser: any = null;
if (typeof window !== "undefined") {
  const savedUser = localStorage.getItem("mock_session");
  if (savedUser) {
    currentMockUser = JSON.parse(savedUser);
  }
}

const authChangeListeners: Function[] = [];

// ==========================================
// EXPORTS & ADAPTERS
// ==========================================

export const db = isRealFirebase ? realDb : { isSimulator: true };
export const auth = isRealFirebase ? realAuth : { isSimulator: true };

export const getMessagingIfSupported = async () => {
  if (isRealFirebase && typeof window !== "undefined" && (await isSupported())) {
    return getMessaging(realApp);
  }
  return null;
};

// 1. Auth Methods
export async function signInWithEmailAndPassword(authInstance: any, email: string, pass: string) {
  if (isRealFirebase) return fireSignIn(authInstance, email, pass);

  const users = getMockData("users");
  const found = users.find((u: any) => u.email === email);
  if (!found) {
    throw { code: "auth/user-not-found", message: "Usuário não encontrado." };
  }
  // Simple simulator bypass
  currentMockUser = found;
  localStorage.setItem("mock_session", JSON.stringify(found));
  authChangeListeners.forEach((cb) => cb(found));
  return { user: found };
}

export async function createUserWithEmailAndPassword(authInstance: any, email: string, pass: string) {
  if (isRealFirebase) return fireCreateUser(authInstance, email, pass);

  const users = getMockData("users");
  const exists = users.find((u: any) => u.email === email);
  if (exists) {
    throw { code: "auth/email-already-in-use", message: "E-mail já está em uso." };
  }

  const newUser = {
    uid: "mock-user-" + Math.random().toString(36).substring(2, 9),
    email,
    name: email.split("@")[0], // placeholder name
    role: "parent",
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);
  setMockData("users", users);

  currentMockUser = newUser;
  localStorage.setItem("mock_session", JSON.stringify(newUser));
  authChangeListeners.forEach((cb) => cb(newUser));
  return { user: newUser };
}

export async function signOut(authInstance: any) {
  if (isRealFirebase) return fireSignOut(authInstance);

  currentMockUser = null;
  localStorage.removeItem("mock_session");
  authChangeListeners.forEach((cb) => cb(null));
}

export function onAuthStateChanged(authInstance: any, callback: Function) {
  if (isRealFirebase) return fireOnAuthChange(authInstance, (user) => callback(user));

  authChangeListeners.push(callback);
  // Send current state
  setTimeout(() => callback(currentMockUser), 50);
  return () => {
    const idx = authChangeListeners.indexOf(callback);
    if (idx !== -1) authChangeListeners.splice(idx, 1);
  };
}

// 2. Firestore Methods
export function doc(dbInstance: any, col: string, id?: string) {
  if (isRealFirebase) return fireDoc(dbInstance, col, id as string);
  return { col, id };
}

export function collection(dbInstance: any, col: string) {
  if (isRealFirebase) return fireCollection(dbInstance, col);
  return { col };
}

export function query(colRef: any, ...constraints: any[]) {
  if (isRealFirebase) return fireQuery(colRef, ...constraints);
  return { col: colRef.col, constraints };
}

export function where(field: string, op: any, val: any) {
  if (isRealFirebase) return fireWhere(field, op, val);
  return { field, op, val };
}

export function onSnapshot(queryRef: any, callback: Function) {
  if (isRealFirebase) return fireOnSnapshot(queryRef, (snap: any) => callback(snap));

  const col = queryRef.col;
  const constraints = queryRef.constraints || [];

  const update = () => {
    let list = getMockData(col);
    
    // Simple filter emulation for query constraints
    constraints.forEach((c: any) => {
      if (c.field && c.op === "==") {
        list = list.filter((item: any) => item[c.field] === c.val);
      }
    });

    const snapshot = {
      docs: list.map((item: any) => ({
        id: item.id || item.uid,
        data: () => item,
      })),
    };
    callback(snapshot);
  };

  listeners[col]?.push(update);
  setTimeout(update, 50);

  return () => {
    const idx = listeners[col]?.indexOf(update) || -1;
    if (idx !== -1) listeners[col].splice(idx, 1);
  };
}

export async function getDoc(docRef: any) {
  if (isRealFirebase) return fireGetDoc(docRef);

  const { col, id } = docRef;
  if (col === "settings" && id === "enrollmentPeriod") {
    const data = getMockData("settings");
    return {
      exists: () => true,
      data: () => ({
        startDate: { seconds: Math.floor(new Date(data.startDate).getTime() / 1000) },
        endDate: { seconds: Math.floor(new Date(data.endDate).getTime() / 1000) },
        announced: data.announced
      })
    };
  }

  const list = getMockData(col);
  const found = list.find((item: any) => (item.id === id || item.uid === id));
  return {
    exists: () => !!found,
    data: () => found,
  };
}

export async function setDoc(docRef: any, data: any) {
  if (isRealFirebase) return fireSetDoc(docRef, data);

  const { col, id } = docRef;
  if (col === "settings" && id === "enrollmentPeriod") {
    setMockData("settings", {
      startDate: data.startDate?.toISOString() || "",
      endDate: data.endDate?.toISOString() || "",
      announced: data.announced || false
    });
    return;
  }

  const list = getMockData(col);
  const idx = list.findIndex((item: any) => (item.id === id || item.uid === id));
  const cleanData = { ...data };
  if (cleanData.createdAt?.mockTimestamp) cleanData.createdAt = new Date().toISOString();
  if (cleanData.updatedAt?.mockTimestamp) cleanData.updatedAt = new Date().toISOString();

  if (idx !== -1) {
    list[idx] = { ...list[idx], ...cleanData };
  } else {
    list.push({ id, ...cleanData });
  }
  setMockData(col, list);
}

export async function addDoc(colRef: any, data: any) {
  if (isRealFirebase) return fireAddDoc(colRef, data);

  const col = colRef.col;
  const list = getMockData(col);
  const newId = col + "-" + Math.random().toString(36).substring(2, 9);
  
  const cleanData = { id: newId, ...data };
  if (cleanData.createdAt?.mockTimestamp) cleanData.createdAt = { seconds: Math.floor(Date.now() / 1000) };
  if (cleanData.updatedAt?.mockTimestamp) cleanData.updatedAt = { seconds: Math.floor(Date.now() / 1000) };

  list.push(cleanData);
  setMockData(col, list);
  return { id: newId };
}

export async function updateDoc(docRef: any, data: any) {
  if (isRealFirebase) return fireUpdateDoc(docRef, data);

  const { col, id } = docRef;
  const list = getMockData(col);
  const idx = list.findIndex((item: any) => (item.id === id || item.uid === id));
  if (idx !== -1) {
    const cleanData = { ...data };
    if (cleanData.updatedAt?.mockTimestamp) cleanData.updatedAt = { seconds: Math.floor(Date.now() / 1000) };
    list[idx] = { ...list[idx], ...cleanData };
    setMockData(col, list);
  }
}

export async function runTransaction(dbInstance: any, txCallback: any) {
  if (isRealFirebase) return fireRunTransaction(dbInstance, txCallback);

  const transaction = {
    get: async (docRef: any) => {
      return getDoc(docRef);
    },
    update: (docRef: any, data: any) => {
      updateDoc(docRef, data);
    },
    set: (docRef: any, data: any) => {
      setDoc(docRef, data);
    }
  };

  return txCallback(transaction);
}

export function serverTimestamp() {
  if (isRealFirebase) return fireServerTimestamp();
  return { mockTimestamp: true };
}
