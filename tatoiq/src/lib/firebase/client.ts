'use client';

import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCpwjCTMa0pAmqd-Og8zEc39Xt1ul54Fg0",
  authDomain: "web-app---tato.firebaseapp.com",
  projectId: "web-app---tato",
  storageBucket: "web-app---tato.firebasestorage.app",
  messagingSenderId: "589249296846",
  appId: "1:589249296846:web:daf8d4bc21264b323e539f",
  measurementId: "G-YXXM0YHZCY",
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const db = getFirestore(app);
export { app };
