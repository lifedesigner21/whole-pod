
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD1scYOYocpRootizX0DQYrMEuYF_xjJuw",
  authDomain: "designer-s-pod.firebaseapp.com",
  projectId: "designer-s-pod",
  storageBucket: "designer-s-pod.firebasestorage.app",
  messagingSenderId: "473144105754",
  appId: "1:473144105754:web:23b02ac3849adeeffe2aa3",
  measurementId: "G-0WY0Z9JG3N",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

export default app;
