"use client";

import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";

interface ChatInputProps {
  projectId: string;
  milestoneId: string;
  taskId?: string;
  chatTarget: "admin-client" | "admin-designer";
  clientUid?: string | null;
  designerUid?: string | null;
}

const ChatInput = ({
  projectId,
  milestoneId,
  taskId,
  chatTarget,
  clientUid,
  designerUid,
}: ChatInputProps) => {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const { user, userRole } = useAuth();

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = textarea.scrollHeight + "px";
    }
  }, [message]);

const handleSendMessage = async () => {
  if (!message.trim()) return;

  if (!user) {
    console.warn("⚠️ No authenticated user found.");
    return;
  }

  const path = `projects/${projectId}/milestones/${milestoneId}/tasks/${taskId}/messages`;

  try {
    // 1. Send the message
    const msgRef = await addDoc(collection(db, path), {
      content: message.trim(),
      timestamp: serverTimestamp(),
      role: userRole,
      sender: user?.displayName || "User",
      chatTarget,
    });

    // 2. Resolve recipient UID
    let recipientUid: string | null = null;
    if (chatTarget === "admin-client") {
      recipientUid = clientUid;
    } else if (chatTarget === "admin-designer") {
      recipientUid = designerUid;
    }


    // 3. Send notification
    if (recipientUid) {
      const notifRef = await addDoc(
        collection(db, `users/${recipientUid}/notifications`),
        {
          message: `You got a new message from ${user.displayName || "Admin"}`,
          type: "chat",
          read: false,
          createdAt: serverTimestamp(),
        }
      );
    } else {
      console.warn("⚠️ No recipient UID found. Skipping notification.");
    }

    setMessage("");
    textareaRef.current?.focus();
  } catch (err) {
    console.error("❌ Error sending message or notification:", err);
  }
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
        rows={1}
        className="flex-1 px-4 py-2 rounded-md border border-gray-300 resize-none text-base leading-6 h-12"
      />
      <Button className="h-12 px-5" onClick={handleSendMessage}>
        Send
      </Button>
    </div>
  );
};

export default ChatInput;
