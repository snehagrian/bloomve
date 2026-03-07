import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import { getClientAuth } from "./firebase";

export async function signUpWithEmail(email: string, password: string) {
  return createUserWithEmailAndPassword(getClientAuth(), email, password);
}

export async function loginWithEmail(email: string, password: string) {
  return signInWithEmailAndPassword(getClientAuth(), email, password);
}

export async function logout() {
  return signOut(getClientAuth());
}

export function subscribeToAuthState(callback: (user: User | null) => void) {
  return onAuthStateChanged(getClientAuth(), callback);
}
