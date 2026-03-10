import {
  createUserWithEmailAndPassword,
  deleteUser,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateEmail,
  updateProfile,
  type User,
} from "firebase/auth";
import { getClientAuth } from "./firebase";
import { createUserProfile, deleteUserProfile, isUsernameTaken } from "./firestore";

function deriveUsername(user: User) {
  const displayName = user.displayName?.trim();
  if (displayName) return displayName;
  const emailPrefix = user.email?.split("@")[0]?.trim();
  if (emailPrefix) return emailPrefix;
  return `user_${user.uid.slice(0, 6)}`;
}

async function ensureUserProfile(user: User) {
  await createUserProfile({
    uid: user.uid,
    username: deriveUsername(user),
    email: user.email ?? "",
  });
}

async function ensureUserProfileSafely(user: User) {
  try {
    await ensureUserProfile(user);
  } catch {
    // Swallow sync failures so auth state updates don't crash the app runtime.
  }
}

async function assertUsernameAvailable(username: string, excludeUid?: string) {
  const taken = await isUsernameTaken(username, excludeUid);
  if (taken) {
    throw new Error("app/username-already-in-use");
  }
}

function isStrongPassword(password: string) {
  if (password.length < 8) return false;
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  return hasNumber && hasSpecial;
}

export async function signUpWithEmail(input: { username: string; email: string; password: string }) {
  if (!isStrongPassword(input.password)) {
    throw new Error("app/weak-password-policy");
  }

  await assertUsernameAvailable(input.username);
  const credential = await createUserWithEmailAndPassword(getClientAuth(), input.email, input.password);
  await updateProfile(credential.user, { displayName: input.username.trim() });
  await ensureUserProfile(credential.user);
  return credential;
}

export async function loginWithEmail(email: string, password: string) {
  const credential = await signInWithEmailAndPassword(getClientAuth(), email, password);
  await ensureUserProfileSafely(credential.user);
  return credential;
}

export async function logout() {
  return signOut(getClientAuth());
}

export async function sendPasswordReset(email: string) {
  return sendPasswordResetEmail(getClientAuth(), email.trim());
}

export async function updateCurrentUserUsername(username: string) {
  const auth = getClientAuth();
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error("No authenticated user");
  }

  await updateCurrentUserProfile({
    username,
    email: currentUser.email ?? "",
  });
}

export async function updateCurrentUserProfile(input: { username: string; email: string }) {
  const auth = getClientAuth();
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error("No authenticated user");
  }

  const nextUsername = input.username.trim();
  const nextEmail = input.email.trim();

  await assertUsernameAvailable(nextUsername, currentUser.uid);

  if (nextEmail && currentUser.email?.toLowerCase() !== nextEmail.toLowerCase()) {
    await updateEmail(currentUser, nextEmail);
  }

  await updateProfile(currentUser, { displayName: nextUsername });
  await createUserProfile({
    uid: currentUser.uid,
    username: nextUsername,
    email: nextEmail || currentUser.email || "",
  });
}

export async function deleteCurrentUserAccount() {
  const auth = getClientAuth();
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error("No authenticated user");
  }

  await deleteUserProfile(currentUser.uid);
  await deleteUser(currentUser);
}

export function subscribeToAuthState(callback: (user: User | null) => void) {
  return onAuthStateChanged(getClientAuth(), (user) => {
    if (user) {
      void ensureUserProfileSafely(user);
    }
    callback(user);
  });
}
