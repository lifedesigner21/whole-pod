import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
} from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  MessageSquare,
  ListChecks,
  User,
  MoreVertical,
  ArrowLeft,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import ChatInput from "@/components/ChatInput";
import { useChatMessages } from "@/hooks/useChatMessages";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import Breadcrumb from "../BreadCrumb";

interface Task {
  id: string;
  name: string;
  status: string;
  assignedToName: string;
  title: string;
  description: string;
  priority: "Low" | "Medium" | "High";
  isDeleted?: boolean;
}

const TasksPage: React.FC = () => {
  const { projectId, milestoneId } = useParams();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [openChat, setOpenChat] = useState(false);
  const [chatTarget, setChatTarget] = useState<
    "admin-client" | "admin-designer" | null
  >(null);
  const { user, userRole } = useAuth();
  const messages = useChatMessages(
    projectId!,
    milestoneId!,
    selectedTask?.id,
    chatTarget
  );
  const [editMsgId, setEditMsgId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [clientUid, setClientUid] = useState<string | null>(null);
  const [designerUid, setDesignerUid] = useState<string | null>(null);
  const navigate = useNavigate();
  const endOfMessagesRef = useRef<HTMLDivElement | null>(null);
  const [projectName, setProjectName] = useState<string | null>(null);
  const [milestoneName, setMilestoneName] = useState<string | null>(null);
  const [adminUid, setAdminUid] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!projectId || !milestoneId) return;

      // Fetch Project
      const projectRef = doc(db, "projects", projectId);
      const projectSnap = await getDoc(projectRef);
      if (projectSnap.exists()) {
        const projectData = projectSnap.data();
        setProjectName(projectData.name);
        setClientUid(projectData.clientId || null);
        setDesignerUid(projectData.designerId || null);
        setAdminUid(projectData.projectCreatedBy || null);
      }

      // Fetch Milestone
      const milestoneRef = doc(
        db,
        "projects",
        projectId,
        "milestones",
        milestoneId
      );
      const milestoneSnap = await getDoc(milestoneRef);
      if (milestoneSnap.exists()) {
        const milestoneData = milestoneSnap.data();
        setMilestoneName(milestoneData.name);
      }

      // Fetch Tasks
      const tasksRef = collection(
        db,
        "projects",
        projectId,
        "milestones",
        milestoneId,
        "tasks"
      );
      const snapshot = await getDocs(tasksRef);
      const taskList: Task[] = snapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...(doc.data() as Task),
        }))
        .filter((task) => !task.isDeleted);

      setTasks(taskList);
    };

    fetchData();
  }, [projectId, milestoneId]);

  const handleOpenChat = (
    task: Task,
    target: "admin-client" | "admin-designer"
  ) => {
    setSelectedTask(task);
    setChatTarget(target);
    setOpenChat(true);
  };

  const handleEdit = (msg: any) => {
    setEditMsgId(msg.id);
    setEditContent(msg.content);
  };

  const handleSaveEdit = async () => {
    if (!projectId || !milestoneId || !selectedTask || !editMsgId) return;

    const msgRef = doc(
      db,
      "projects",
      projectId,
      "milestones",
      milestoneId,
      "tasks",
      selectedTask.id,
      "messages",
      editMsgId
    );

    await updateDoc(msgRef, { content: editContent });
    setEditMsgId(null);
    setEditContent("");
  };

  const handleCancelEdit = () => {
    setEditMsgId(null);
    setEditContent("");
  };

  const handleDelete = async (id: string) => {
    if (!projectId || !milestoneId || !selectedTask) return;

    const msgRef = doc(
      db,
      "projects",
      projectId,
      "milestones",
      milestoneId,
      "tasks",
      selectedTask.id,
      "messages",
      id
    );

    await deleteDoc(msgRef);
  };

  useEffect(() => {
    if (openChat && endOfMessagesRef.current) {
      endOfMessagesRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, openChat]);
  useEffect(() => {
    if (openChat) {
      // Wait for the DOM to finish rendering messages
      setTimeout(() => {
        endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100); // slight delay ensures scroll happens after messages are in DOM
    }
  }, [openChat]);

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <Button
        variant="outline"
        onClick={() => navigate(-1)}
        className="self-start w-fit text-gray-700"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </Button>
      <Breadcrumb
        paths={[
          { name: projectName },
          { name: milestoneName || "Milestone" },
          { name: "Tasks" },
        ]}
      />

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
        <p className="text-gray-600 mt-1">All tasks in this milestone</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {tasks.length === 0 ? (
          <div className="text-center text-gray-500 text-sm col-span-full mt-4">
            No tasks found in this milestone.
            <br />
            <span className="text-blue-600 underline cursor-pointer">
              Do you want to add the tasks?
            </span>
          </div>
        ) : (
          tasks.map((task) => (
            <Card key={task.id} className="hover:shadow transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-2xl">{task.title}</CardTitle>
                  <span
                    className={`ml-4 px-2 py-1 text-xs font-semibold rounded-full ${
                      task.priority === "High"
                        ? "bg-red-100 text-red-800"
                        : task.priority === "Medium"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-green-100 text-green-800"
                    }`}
                  >
                    {task.priority}
                  </span>
                </div>
                <p className="text-md text-gray-500 mt-1">{task.description}</p>
              </CardHeader>

              <CardContent className="space-y-3 text-sm text-gray-700">
                <div className="flex items-center gap-2">
                  <ListChecks className="w-4 h-4" />
                  <span>Status: {task.status}</span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <span>Designer: {task.assignedToName}</span>
                </div>
                <div className="flex gap-2">
                  {(userRole === "admin" || userRole === "client") && (
                    <button
                      onClick={() => handleOpenChat(task, "admin-client")}
                      className="mt-3 inline-flex items-center gap-2 bg-black text-white px-3 py-1 rounded hover:bg-gray-800"
                    >
                      <MessageSquare className="w-4 h-4" /> Admin Chat
                    </button>
                  )}
                  {(userRole === "admin" || userRole === "designer") && (
                    <button
                      onClick={() => handleOpenChat(task, "admin-designer")}
                      className="mt-3 inline-flex items-center gap-2 bg-gray-800 text-white px-3 py-1 rounded hover:bg-gray-900"
                    >
                      <MessageSquare className="w-4 h-4" /> Designer Chat
                    </button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Sheet open={openChat} onOpenChange={setOpenChat}>
        <SheetContent side="right" className="w-full max-w-md p-6">
          <SheetHeader>
            <SheetTitle>{selectedTask?.title || "Task Chat"}</SheetTitle>
          </SheetHeader>

          {selectedTask && chatTarget && (
            <div className="mt-4 flex flex-col gap-4 h-full">
              <div className="flex-1 overflow-y-auto space-y-4 bg-gray-50 p-3 rounded scrollbar-hide">
                {messages.map((msg) => {
                  const date = msg.timestamp?.toDate?.();
                  const time = date
                    ? new Intl.DateTimeFormat("en-US", {
                        hour: "numeric",
                        minute: "numeric",
                        hour12: true,
                      }).format(date)
                    : "";

                  const isOwnMessage = msg.sender === user?.displayName;

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${
                        isOwnMessage ? "items-end" : "items-start"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-700 italic mb-1">
                          {msg.role.charAt(0).toUpperCase() + msg.role.slice(1)}
                        </span>

                        {isOwnMessage && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="text-gray-500 hover:text-gray-700">
                                <MoreVertical className="w-4 h-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEdit(msg)}>
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDelete(msg.id)}
                                className="text-red-600"
                              >
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>

                      <div
                        className={` w-fit max-w-[90%] p-3 rounded-lg shadow-sm text-sm ${
                          isOwnMessage
                            ? "bg-blue-100 text-left ml-auto pr-[10%]"
                            : "bg-white text-left pr-[10%]"
                        }`}
                      >
                        <div className="font-medium text-gray-800 mb-1 text-xs">
                          {msg.sender}
                        </div>

                        {editMsgId === msg.id ? (
                          <div className="space-y-2">
                            <textarea
                              className="w-full p-2 border rounded text-sm"
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                            />
                            <div className="flex justify-end space-x-2 text-xs text-blue-600">
                              <button onClick={handleSaveEdit}>Save</button>
                              <button onClick={handleCancelEdit}>Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <div className="text-black whitespace-pre-wrap font-bold text-md">
                            {msg.content}
                          </div>
                        )}

                        {time && (
                          <div className="text-[11px] text-gray-500 mt-2">
                            {time}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div ref={endOfMessagesRef} />
              </div>

              {selectedTask &&
              chatTarget &&
              ((chatTarget === "admin-client" && !clientUid) ||
                (chatTarget === "admin-designer" && !designerUid)) ? (
                <div className="text-center text-sm text-gray-500">
                  Loading chat...
                </div>
              ) : (
                <ChatInput
                  projectId={projectId!}
                  milestoneId={milestoneId!}
                  taskId={selectedTask.id}
                  chatTarget={chatTarget}
                  adminUid={adminUid}
                  clientUid={clientUid}
                  designerUid={designerUid}
                />
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default TasksPage;
