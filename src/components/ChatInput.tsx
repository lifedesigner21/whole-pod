"use client";

import { useRef, useState,useEffect } from "react";
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
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = textarea.scrollHeight + "px";
    }
  }, [message]);

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

    // Show notification for message sent
    const senderName = user?.displayName || "client";
    const recipientRole = chatTarget === "admin-client" 
      ? (userRole === "admin" ? "client" : "admin")
      : (userRole === "admin" ? "designer" : "admin");
    
    toast({
      title: "Message Sent",
      description: `You have sent a new message to the ${recipientRole}`,
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

