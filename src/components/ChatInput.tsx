"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/firebase";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  Timestamp,
  where,
} from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";

const ChatInput = ({
  projectId,
  milestoneId,
  taskId,
  chatTarget,
}: {
  projectId: string;
  milestoneId: string;
  taskId?: string;
  chatTarget: "admin-client" | "admin-designer";
}) => {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const { user, userRole } = useAuth();

  const handleSendMessage = async () => {
    if (!message.trim()) return;

    const path = `projects/${projectId}/milestones/${milestoneId}/tasks/${taskId}/messages`;

    await addDoc(collection(db, path), {
      content: message.trim(),
      timestamp: serverTimestamp(),
      role: userRole,
      sender: user?.displayName || "client",
      chatTarget,
    });

    setMessage("");
    textareaRef.current?.focus();
  };

  return (
    <div className="flex gap-2 mb-20">
      <textarea
        ref={textareaRef}
        placeholder="Type your message..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
          }
        }}
        className="flex-1 px-4 py-[8px] rounded-md border border-gray-300"
      />
      <Button onClick={handleSendMessage}>Send</Button>
    </div>
  );
};

export default ChatInput;

