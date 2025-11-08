
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from "firebase/auth";
import { getFirestore, doc, setDoc, collection, addDoc } from "firebase/firestore";
import type { InterviewSession } from "../types";

const firebaseConfig = {
  apiKey: "AIzaSyD_Qy6sXqx9ecYHe8u88WcZybrLlcK03VM",
  authDomain: "interviewauth-58115.firebaseapp.com",
  projectId: "interviewauth-58115",
  storageBucket: "interviewauth-58115.appspot.com",
  messagingSenderId: "580613695080",
  appId: "1:580613695080:web:28759594c3ae448eb07ddd",
  measurementId: "G-G1T96D9J04"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

const provider = new GoogleAuthProvider();

export const signInWithGoogle = async (): Promise<User> => {
  const result = await signInWithPopup(auth, provider);
  const user = result.user;
  const userRef = doc(db, "users", user.uid);
  await setDoc(userRef, {
    uid: user.uid,
    displayName: user.displayName,
    email: user.email,
    photoURL: user.photoURL,
    lastLogin: new Date(),
  }, { merge: true });
  return user;
};

export const logout = (): Promise<void> => {
  return signOut(auth);
};

export const onAuthChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

export const saveInterviewSession = async (session: InterviewSession): Promise<void> => {
    try {
        const userSessionsCollection = collection(db, `users/${session.userId}/sessions`);
        await addDoc(userSessionsCollection, session);
    } catch (error) {
        console.error("Error saving interview session: ", error);
        throw error;
    }
};
