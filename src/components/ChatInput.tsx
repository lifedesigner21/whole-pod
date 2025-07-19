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

    // Create notification for message recipients
    const senderName = user?.displayName || "client";
    
    try {
      // Get project data to find user IDs for notifications
      const projectDoc = await getDoc(doc(db, "projects", projectId));
      const projectData = projectDoc.data();
      
      if (projectData) {
        const recipients: string[] = [];
        
        // Determine recipients based on chat target and sender role
        if (chatTarget === "admin-client") {
          if (userRole === "admin") {
            // Admin sending to client
            if (projectData.clientId) recipients.push(projectData.clientId);
          } else if (userRole === "client") {
            // Client sending to admin
            if (projectData.adminId) recipients.push(projectData.adminId);
          }
        } else if (chatTarget === "admin-designer") {
          if (userRole === "admin") {
            // Admin sending to designer - get task's assigned designer
            const taskDoc = await getDoc(doc(db, "projects", projectId, "milestones", milestoneId, "tasks", taskId!));
            const taskData = taskDoc.data();
            if (taskData?.designerId) recipients.push(taskData.designerId);
          } else if (userRole === "designer") {
            // Designer sending to admin
            if (projectData.adminId) recipients.push(projectData.adminId);
          }
        }
        
        // Create notifications for all recipients
        for (const recipientId of recipients) {
          await addDoc(collection(db, `users/${recipientId}/notifications`), {
            message: `You have received a new message from ${senderName}`,
            type: "chat_message",
            read: false,
            createdAt: serverTimestamp(),
            projectId,
            milestoneId,
            taskId,
            chatTarget
          });
        }
      }
    } catch (error) {
      console.error("Error creating notification:", error);
    }

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

