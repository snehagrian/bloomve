import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
  type Timestamp,
} from "firebase/firestore";
import { getClientDb } from "./firebase";

export type RoomType = "chat" | "channel";
export type RoomPrivacy = "public" | "private";

export type Room = {
  id: string;
  name: string;
  type: RoomType;
  privacy: RoomPrivacy;
  ownerId: string;
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

export async function createRoom(input: {
  name: string;
  type: RoomType;
  privacy: RoomPrivacy;
  ownerId: string;
}) {
  const db = getClientDb();
  await addDoc(collection(db, "rooms"), {
    name: input.name,
    type: input.type,
    privacy: input.privacy,
    ownerId: input.ownerId,
    createdAt: serverTimestamp(),
  });
}

function sortByCreatedAtDesc<T extends { createdAt: Timestamp | null }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const aMs = a.createdAt?.toMillis() ?? 0;
    const bMs = b.createdAt?.toMillis() ?? 0;
    return bMs - aMs;
  });
}

export function subscribeRoomsForUser(
  userId: string,
  callback: (rooms: Room[]) => void
) {
  const db = getClientDb();
  const roomsRef = collection(db, "rooms");
  const publicRoomsQuery = query(
    roomsRef,
    where("privacy", "==", "public"),
    orderBy("createdAt", "desc")
  );
  const ownedRoomsQuery = query(
    roomsRef,
    where("ownerId", "==", userId),
    orderBy("createdAt", "desc")
  );

  let publicRooms: Room[] = [];
  let ownedRooms: Room[] = [];

  const emitMerged = () => {
    const map = new Map<string, Room>();
    [...publicRooms, ...ownedRooms].forEach((room) => {
      map.set(room.id, room);
    });
    callback(sortByCreatedAtDesc(Array.from(map.values())));
  };

  const unsubscribePublic = onSnapshot(publicRoomsQuery, (snapshot) => {
    publicRooms = snapshot.docs.map((roomDoc) => ({
      id: roomDoc.id,
      ...(roomDoc.data() as Omit<Room, "id">),
    }));
    emitMerged();
  });

  const unsubscribeOwned = onSnapshot(ownedRoomsQuery, (snapshot) => {
    ownedRooms = snapshot.docs.map((roomDoc) => ({
      id: roomDoc.id,
      ...(roomDoc.data() as Omit<Room, "id">),
    }));
    emitMerged();
  });

  return () => {
    unsubscribePublic();
    unsubscribeOwned();
  };
}

export function subscribeToRoom(roomId: string, callback: (room: Room | null) => void) {
  const db = getClientDb();
  const roomRef = doc(db, "rooms", roomId);
  return onSnapshot(roomRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback(null);
      return;
    }

    callback({
      id: snapshot.id,
      ...(snapshot.data() as Omit<Room, "id">),
    });
  });
}

export function subscribeToRoomPosts(roomId: string, callback: (posts: Post[]) => void) {
  const db = getClientDb();
  const postsRef = collection(db, "rooms", roomId, "posts");
  const postsQuery = query(postsRef, orderBy("createdAt", "desc"));

  return onSnapshot(postsQuery, (snapshot) => {
    const posts = snapshot.docs.map((postDoc) => ({
      id: postDoc.id,
      ...(postDoc.data() as Omit<Post, "id">),
    }));
    callback(posts);
  });
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
