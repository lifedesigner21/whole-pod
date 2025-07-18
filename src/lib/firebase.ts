
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';

// Production environment
// const firebaseConfig = {
//   apiKey: "AIzaSyD1scYOYocpRootizX0DQYrMEuYF_xjJuw",
//   authDomain: "designer-s-pod.firebaseapp.com",
//   projectId: "designer-s-pod",
//   storageBucket: "designer-s-pod.firebasestorage.app",
//   messagingSenderId: "473144105754",
//   appId: "1:473144105754:web:23b02ac3849adeeffe2aa3",
//   measurementId: "G-0WY0Z9JG3N"
// };

// test environment
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

export default app;
