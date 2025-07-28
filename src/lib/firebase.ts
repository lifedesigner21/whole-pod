
import { initializeApp } from 'firebase/app';
import  {getAuth}  from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: "AIzaSyCZJ9PCzN1mD8lMiOg89506ILyzTFtAchQ",
  authDomain: "designerpod-development.firebaseapp.com",
  projectId: "designerpod-development",
  storageBucket: "designerpod-development.firebasestorage.app",
  messagingSenderId: "918453580875",
  appId: "1:918453580875:web:81c08a8432578bd02389ce",
  measurementId: "G-WQ3G86N1LF"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

export default app;
