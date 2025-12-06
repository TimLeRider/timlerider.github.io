import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDCjYFxOAlhEhKDugxQMBKim1frjnO7LNA",
  authDomain: "cadeaux-noel.firebaseapp.com",
  projectId: "cadeaux-noel",
  storageBucket: "cadeaux-noel.firebasestorage.app",
  messagingSenderId: "75506013028",
  appId: "1:75506013028:web:4210b29cf207cec7386071"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);