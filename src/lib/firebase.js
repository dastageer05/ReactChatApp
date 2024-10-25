import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getMessaging, getToken, onMessage  } from "firebase/messaging";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_API_KEY,
  authDomain: "realreactchat-6ca7b.firebaseapp.com",
  projectId: "realreactchat-6ca7b",
  storageBucket: "realreactchat-6ca7b.appspot.com",
  messagingSenderId: "863949813400",
  appId: "1:863949813400:web:f3b624c2bcf6a7038382ed",
};

const app = initializeApp(firebaseConfig);
// export const messaging = getMessaging(app);
export const auth = getAuth();
export const db = getFirestore();
export const storage = getStorage();

