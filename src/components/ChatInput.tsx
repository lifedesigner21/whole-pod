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

    console.log("🚀 CHAT: Starting message send process");
    console.log("📝 CHAT: Message content:", message.trim());
    console.log("👤 CHAT: Sender:", user?.displayName, "Role:", userRole);
    console.log("🎯 CHAT: Chat target:", chatTarget);

    const path = `projects/${projectId}/milestones/${milestoneId}/tasks/${taskId}/messages`;
    console.log("📍 CHAT: Database path:", path);

    await addDoc(collection(db, path), {
      content: message.trim(),
      timestamp: serverTimestamp(),
      role: userRole,
      sender: user?.displayName || "client",
      chatTarget,
    });

    console.log("✅ CHAT: Message saved to database");

    // Create notification for message recipients
    const senderName = user?.displayName || "client";
    console.log("🔔 CHAT: Starting notification creation for sender:", senderName);
    
    try {
      // Get project data to find user IDs for notifications
      console.log("📊 CHAT: Fetching project data for project:", projectId);
      const projectDoc = await getDoc(doc(db, "projects", projectId));
      const projectData = projectDoc.data();
      console.log("📊 CHAT: Project data:", projectData);
      
      if (projectData) {
        const recipients: string[] = [];
        console.log("🎯 CHAT: Determining recipients for chatTarget:", chatTarget, "userRole:", userRole);
        
        // Determine recipients based on chat target and sender role
        if (chatTarget === "admin-client") {
          if (userRole === "admin") {
            // Admin sending to client
            console.log("👤 CHAT: Admin sending to client, clientId:", projectData.clientId);
            if (projectData.clientId) recipients.push(projectData.clientId);
          } else if (userRole === "client") {
            // Client sending to admin
            console.log("👤 CHAT: Client sending to admin, adminId:", projectData.adminId);
            if (projectData.adminId) recipients.push(projectData.adminId);
          }
        } else if (chatTarget === "admin-designer") {
          if (userRole === "admin") {
            // Admin sending to designer - get task's assigned designer
            console.log("👤 CHAT: Admin sending to designer, fetching task data");
            const taskDoc = await getDoc(doc(db, "projects", projectId, "milestones", milestoneId, "tasks", taskId!));
            const taskData = taskDoc.data();
            console.log("📋 CHAT: Task data:", taskData);
            if (taskData?.designerId) {
              console.log("👤 CHAT: Found designerId:", taskData.designerId);
              recipients.push(taskData.designerId);
            }
          } else if (userRole === "designer") {
            // Designer sending to admin
            console.log("👤 CHAT: Designer sending to admin, adminId:", projectData.adminId);
            if (projectData.adminId) recipients.push(projectData.adminId);
          }
        }
        
        console.log("📨 CHAT: Final recipients list:", recipients);
        
        // Create notifications for all recipients
        for (const recipientId of recipients) {
          console.log("🔔 CHAT: Creating notification for recipient:", recipientId);
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
          console.log("✅ CHAT: Notification created successfully for:", recipientId);
        }
        
        console.log("🎉 CHAT: All notifications created successfully");
      } else {
        console.log("❌ CHAT: No project data found");
      }
    } catch (error) {
      console.error("❌ CHAT: Error creating notification:", error);
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

