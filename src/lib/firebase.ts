import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Validate Firebase config
if (!firebaseConfig.apiKey || firebaseConfig.apiKey === "your-api-key") {
  console.error(
    "❌ Firebase config is missing! Please update .env.local with your Firebase credentials."
  );
  console.log("Current config:", firebaseConfig);
}

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
