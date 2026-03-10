import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  deleteField,
  doc,
  documentId,
  type FirestoreError,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Timestamp,
} from "firebase/firestore";
import { getClientDb } from "./firebase";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { getClientStorage } from "./firebase";

export type RoomType = "chat" | "channel";
export type RoomPrivacy = "public" | "private";

export type Room = {
  id: string;
  name: string;
  type: RoomType;
  privacy: RoomPrivacy;
  ownerId: string;
  memberIds: string[];
  avatarUrl?: string;
  maxMembers?: number;
  blockedUserIds?: string[];
  inviteToken?: string;
  createdAt: Timestamp | null;
};

export type Post = {
  id: string;
  roomId: string;
  userId: string;
  title: string;
  text: string;
  jobUrl: string;
  createdAt: Timestamp | null;
};

export type UserProfile = {
  uid: string;
  username: string;
  usernameLower?: string;
  email: string;
  createdAt: Timestamp | null;
};

const DEFAULT_MAX_ROOM_MEMBERS = 500;

function createInviteToken() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().replace(/-/g, "");
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
}

function sortByCreatedAtDesc<T extends { createdAt: Timestamp | null }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const aMs = a.createdAt?.toMillis() ?? 0;
    const bMs = b.createdAt?.toMillis() ?? 0;
    return bMs - aMs;
  });
}

function roomCapacity(room: Partial<Room>) {
  return room.maxMembers ?? DEFAULT_MAX_ROOM_MEMBERS;
}

export async function createUserProfile(input: { uid: string; username: string; email: string }) {
  const db = getClientDb();
  const userRef = doc(db, "users", input.uid);
  const normalizedUsername = input.username.trim();

  await setDoc(
    userRef,
    {
      username: normalizedUsername,
      usernameLower: normalizedUsername.toLowerCase(),
      email: input.email.trim(),
      createdAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function deleteUserProfile(uid: string) {
  const db = getClientDb();
  await deleteDoc(doc(db, "users", uid));
}

export async function getUserProfilesByIds(userIds: string[]) {
  const db = getClientDb();
  const normalizedIds = Array.from(new Set(userIds.map((value) => value.trim()).filter(Boolean)));
  const profiles = new Map<string, UserProfile>();

  if (normalizedIds.length === 0) return profiles;

  const chunkSize = 10;
  for (let index = 0; index < normalizedIds.length; index += chunkSize) {
    const idChunk = normalizedIds.slice(index, index + chunkSize);
    const usersQuery = query(collection(db, "users"), where(documentId(), "in", idChunk));
    const snapshot = await getDocs(usersQuery);

    snapshot.docs.forEach((profileDoc) => {
      profiles.set(profileDoc.id, {
        uid: profileDoc.id,
        ...(profileDoc.data() as Omit<UserProfile, "uid">),
      });
    });
  }

  return profiles;
}

export async function isUsernameTaken(username: string, excludeUid?: string) {
  const db = getClientDb();
  const normalizedUsername = username.trim().toLowerCase();
  if (!normalizedUsername) return false;

  const usersQuery = query(collection(db, "users"), where("usernameLower", "==", normalizedUsername));
  const snapshot = await getDocs(usersQuery);
  if (snapshot.empty) return false;

  return snapshot.docs.some((profileDoc) => profileDoc.id !== excludeUid);
}

export async function findUserIdByUsername(username: string) {
  const db = getClientDb();
  const normalizedUsername = username.trim().toLowerCase();
  if (!normalizedUsername) return null;

  const usersQuery = query(collection(db, "users"), where("usernameLower", "==", normalizedUsername));
  const snapshot = await getDocs(usersQuery);
  if (snapshot.empty) return null;

  return snapshot.docs[0].id;
}

export async function createRoom(input: {
  name: string;
  type: RoomType;
  privacy: RoomPrivacy;
  ownerId: string;
  friendIds?: string[];
}) {
  const db = getClientDb();
  const normalizedFriendIds = Array.from(new Set((input.friendIds ?? []).map((value) => value.trim()).filter(Boolean))).filter(
    (friendId) => friendId !== input.ownerId
  );
  const inviteToken = createInviteToken();

  const roomRef = await addDoc(collection(db, "rooms"), {
    name: input.name,
    type: input.type,
    privacy: input.privacy,
    ownerId: input.ownerId,
    memberIds: [input.ownerId, ...normalizedFriendIds],
    inviteToken,
    createdAt: serverTimestamp(),
  });

  return { roomId: roomRef.id, inviteToken };
}

export function subscribeRoomsForUser(userId: string, callback: (rooms: Room[]) => void, onError?: (error: FirestoreError) => void) {
  const db = getClientDb();
  const roomsRef = collection(db, "rooms");
  const joinedRoomsQuery = query(roomsRef, where("memberIds", "array-contains", userId));
  const ownedRoomsQuery = query(roomsRef, where("ownerId", "==", userId));

  let joinedRooms: Room[] = [];
  let ownedRooms: Room[] = [];

  const emitMerged = () => {
    const merged = new Map<string, Room>();
    [...joinedRooms, ...ownedRooms].forEach((room) => merged.set(room.id, room));
    callback(sortByCreatedAtDesc(Array.from(merged.values())));
  };

  const unsubscribeJoined = onSnapshot(
    joinedRoomsQuery,
    (snapshot) => {
      joinedRooms = snapshot.docs.map((roomDoc) => ({
        id: roomDoc.id,
        ...(roomDoc.data() as Omit<Room, "id">),
      }));
      emitMerged();
    },
    (error) => {
      onError?.(error);
    }
  );

  const unsubscribeOwned = onSnapshot(
    ownedRoomsQuery,
    (snapshot) => {
      ownedRooms = snapshot.docs.map((roomDoc) => ({
        id: roomDoc.id,
        ...(roomDoc.data() as Omit<Room, "id">),
      }));
      emitMerged();
    },
    (error) => {
      onError?.(error);
    }
  );

  return () => {
    unsubscribeJoined();
    unsubscribeOwned();
  };
}

export function subscribeOwnedRooms(
  userId: string,
  callback: (rooms: Room[]) => void,
  onError?: (error: FirestoreError) => void
) {
  const db = getClientDb();
  const roomsRef = collection(db, "rooms");
  const ownedRoomsQuery = query(roomsRef, where("ownerId", "==", userId));

  return onSnapshot(
    ownedRoomsQuery,
    (snapshot) => {
      const ownedRooms = snapshot.docs.map((roomDoc) => ({
        id: roomDoc.id,
        ...(roomDoc.data() as Omit<Room, "id">),
      }));

      callback(sortByCreatedAtDesc(ownedRooms));
    },
    (error) => {
      callback([]);
      onError?.(error);
    }
  );
}

export function subscribePublicChannelSuggestions(
  userId: string,
  callback: (rooms: Room[]) => void,
  onError?: (error: FirestoreError) => void
) {
  const db = getClientDb();
  const roomsRef = collection(db, "rooms");
  const suggestionsQuery = query(roomsRef, where("privacy", "==", "public"), where("type", "==", "channel"));

  return onSnapshot(
    suggestionsQuery,
    (snapshot) => {
      const suggestions = snapshot.docs
        .map((roomDoc) => ({
          id: roomDoc.id,
          ...(roomDoc.data() as Omit<Room, "id">),
        }))
        .filter((room) => room.ownerId !== userId && !room.memberIds?.includes(userId));

      callback(sortByCreatedAtDesc(suggestions));
    },
    (error) => {
      onError?.(error);
    }
  );
}

export async function joinPublicChannel(roomId: string, userId: string) {
  const db = getClientDb();
  const roomRef = doc(db, "rooms", roomId);

  await runTransaction(db, async (transaction) => {
    const roomSnapshot = await transaction.get(roomRef);
    if (!roomSnapshot.exists()) {
      throw new Error("room-not-found");
    }

    const roomData = roomSnapshot.data() as Omit<Room, "id">;
    const memberIds = roomData.memberIds ?? [roomData.ownerId];

    if (!memberIds.includes(userId) && memberIds.length >= roomCapacity(roomData)) {
      throw new Error("room-members-limit-reached");
    }

    transaction.update(roomRef, {
      memberIds: arrayUnion(userId),
    });
  });
}

export async function joinRoomWithInvite(roomId: string, userId: string, inviteToken: string) {
  const db = getClientDb();
  const roomRef = doc(db, "rooms", roomId);

  await runTransaction(db, async (transaction) => {
    const roomSnapshot = await transaction.get(roomRef);
    if (!roomSnapshot.exists()) {
      throw new Error("room-not-found");
    }

    const roomData = roomSnapshot.data() as Omit<Room, "id">;
    const memberIds = roomData.memberIds ?? [roomData.ownerId];

    if (roomData.inviteToken !== inviteToken) {
      throw new Error("invalid-invite-token");
    }

    if (!memberIds.includes(userId) && memberIds.length >= roomCapacity(roomData)) {
      throw new Error("room-members-limit-reached");
    }

    transaction.update(roomRef, {
      memberIds: arrayUnion(userId),
      inviteToken,
    });
  });
}

export async function updateRoomSettings(input: { roomId: string; privacy: RoomPrivacy; maxMembers?: number; avatarUrl?: string }) {
  const db = getClientDb();
  const roomRef = doc(db, "rooms", input.roomId);

  const normalizedMaxMembers =
    typeof input.maxMembers === "number" && Number.isFinite(input.maxMembers)
      ? Math.max(1, Math.min(DEFAULT_MAX_ROOM_MEMBERS, Math.floor(input.maxMembers)))
      : undefined;

  await updateDoc(roomRef, {
    privacy: input.privacy,
    maxMembers: normalizedMaxMembers ?? deleteField(),
    avatarUrl: input.avatarUrl?.trim() ? input.avatarUrl.trim() : deleteField(),
  });
}

export async function uploadRoomAvatar(roomId: string, file: File) {
  const storage = getClientStorage();
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const fileRef = ref(storage, `room-avatars/${roomId}/${Date.now()}-${sanitizedName}`);
  await uploadBytes(fileRef, file);
  return getDownloadURL(fileRef);
}

export async function renameRoom(roomId: string, name: string) {
  const db = getClientDb();
  await updateDoc(doc(db, "rooms", roomId), {
    name: name.trim(),
  });
}

export async function addRoomParticipant(roomId: string, userId: string) {
  const db = getClientDb();
  const roomRef = doc(db, "rooms", roomId);
  const normalizedUserId = userId.trim();

  await runTransaction(db, async (transaction) => {
    const roomSnapshot = await transaction.get(roomRef);
    if (!roomSnapshot.exists()) {
      throw new Error("room-not-found");
    }

    const roomData = roomSnapshot.data() as Omit<Room, "id">;
    const memberIds = roomData.memberIds ?? [roomData.ownerId];

    if (!memberIds.includes(normalizedUserId) && memberIds.length >= roomCapacity(roomData)) {
      throw new Error("room-members-limit-reached");
    }

    transaction.update(roomRef, {
      memberIds: arrayUnion(normalizedUserId),
      blockedUserIds: arrayRemove(normalizedUserId),
    });
  });
}

export async function removeRoomParticipant(roomId: string, userId: string) {
  const db = getClientDb();
  await updateDoc(doc(db, "rooms", roomId), {
    memberIds: arrayRemove(userId),
  });
}

export async function blockRoomParticipant(roomId: string, userId: string) {
  const db = getClientDb();
  await updateDoc(doc(db, "rooms", roomId), {
    memberIds: arrayRemove(userId),
    blockedUserIds: arrayUnion(userId),
  });
}

export async function unblockRoomParticipant(roomId: string, userId: string) {
  const db = getClientDb();
  await updateDoc(doc(db, "rooms", roomId), {
    blockedUserIds: arrayRemove(userId),
  });
}

export async function deleteRoom(roomId: string) {
  const db = getClientDb();
  await deleteDoc(doc(db, "rooms", roomId));
}

export function subscribeToRoom(
  roomId: string,
  callback: (room: Room | null) => void,
  onError?: (error: FirestoreError) => void
) {
  const db = getClientDb();
  const roomRef = doc(db, "rooms", roomId);

  return onSnapshot(
    roomRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        callback(null);
        return;
      }

      callback({
        id: snapshot.id,
        ...(snapshot.data() as Omit<Room, "id">),
      });
    },
    (error) => {
      onError?.(error);
    }
  );
}

export function subscribeToRoomPosts(
  roomId: string,
  callback: (posts: Post[]) => void,
  onError?: (error: FirestoreError) => void
) {
  const db = getClientDb();
  const postsRef = collection(db, "rooms", roomId, "posts");
  const postsQuery = query(postsRef, orderBy("createdAt", "desc"));

  return onSnapshot(
    postsQuery,
    (snapshot) => {
      const posts = snapshot.docs.map((postDoc) => ({
        id: postDoc.id,
        ...(postDoc.data() as Omit<Post, "id">),
      }));
      callback(posts);
    },
    (error) => {
      onError?.(error);
    }
  );
}

export async function addRoomPost(input: {
  roomId: string;
  userId: string;
  title?: string;
  text?: string;
  jobUrl: string;
}) {
  const db = getClientDb();
  await addDoc(collection(db, "rooms", input.roomId, "posts"), {
    roomId: input.roomId,
    userId: input.userId,
    title: input.title?.trim() || "Shared job link",
    text: input.text?.trim() || "",
    jobUrl: input.jobUrl,
    createdAt: serverTimestamp(),
  });
}
