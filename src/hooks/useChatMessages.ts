import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  DocumentData,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

interface ChatMessage {
  id: string;
  content: string;
  sender: string;
  role: string;
  timestamp: Timestamp; // You can change this to `Timestamp` if you import from Firebase
  chatTarget: "admin-client" | "admin-designer";
}

export function useChatMessages(
  projectId: string,
  milestoneId: string,
  taskId: string | undefined,
  chatTarget: "admin-client" | "admin-designer" | null
) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    if (!projectId || !milestoneId || !taskId || !chatTarget) return;

    const basePath = `projects/${projectId}/milestones/${milestoneId}/tasks/${taskId}/messages`;
    const q = query(collection(db, basePath), orderBy("timestamp", "asc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const filtered = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() } as ChatMessage))
        .filter((msg) => msg.chatTarget === chatTarget);

      setMessages(filtered);
    });

    return () => unsubscribe();
  }, [projectId, milestoneId, taskId, chatTarget]);

  return messages;
}
