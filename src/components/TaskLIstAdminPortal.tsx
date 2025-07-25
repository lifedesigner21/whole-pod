import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Calendar,
  Clock,
  User,
  ChevronDown,
  Check,
  MessageSquare,
  Trash,
  Edit,
  Pencil,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "./ui/sheet";
import { useChatMessages } from "@/hooks/useChatMessages";
import ChatInput from "./ChatInput";
import {
  doc,
  updateDoc,
  getDocs,
  collection,
  deleteDoc,
  getDoc,
  setDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { MoreVertical } from "lucide-react";

interface Task {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  estimatedHours: number;
  priority: string;
  status: string;
  assignedToName: string;
  createdAt: string;
  projectId: string;
  milestoneId: string;
  actualMinutes?: number;
  onHoldReason?: string;
  isRevision?: boolean;
  revisionReasons?: string[];
  estimatedMinutes?: number;
  completedProof?: string;
  projectName?: string;
  milestoneName?: string;
  isApproved?: boolean;
  assignedTo?: string;
  isDeleted?: boolean;
}

interface TaskListProps {
  tasks: Task[];
  openPopoverId: string | null;
  setOpenPopoverId: (id: string | null) => void;
  onStatusChange: (taskId: string, newStatus: string) => void;
  onTaskUpdate: (task: Task) => void;
  onEditTask: (task: Task) => void;
  projectId: string;
  milestoneId: string;
}

const statusOptions = [
  "To Do",
  "In Progress",
  "Info Required",
  "In Review",
  "Completed",
];

const TaskList: React.FC<TaskListProps> = ({
  tasks,
  openPopoverId,
  setOpenPopoverId,
  onStatusChange,
  onTaskUpdate,
  onEditTask,
  projectId,
  milestoneId,
}) => {
  const { userRole, user } = useAuth();
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [openChat, setOpenChat] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [chatTarget, setChatTarget] = useState<
    "admin-client" | "admin-designer" | null
  >(null);
  const messages = useChatMessages(
    projectId!,
    milestoneId!,
    selectedTask?.id,
    chatTarget
  );

  const [timers, setTimers] = useState<Record<string, number>>({});
  const [runningTimers, setRunningTimers] = useState<Record<string, boolean>>(
    {}
  );
  const [showHoldDialogFor, setShowHoldDialogFor] = useState<string | null>(
    null
  );
  const [holdReason, setHoldReason] = useState<string>("");
  const [showCompleteDialogFor, setShowCompleteDialogFor] = useState<
    string | null
  >(null);
  const [proofUrl, setProofUrl] = useState<string>("");

  const [showRevisionDialog, setShowRevisionDialog] = useState(false);
  const [revisionReason, setRevisionReason] = useState("");
  const [editMsgId, setEditMsgId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [clientUid, setClientUid] = useState<string | null>(null);
  const [designerUid, setDesignerUid] = useState<string | null>(null);
  const endOfMessagesRef = useRef<HTMLDivElement | null>(null);
  const [milestoneNames, setMilestoneNames] = useState<Record<string, string>>(
    {}
  );

  useEffect(() => {
    const visibleTasks = tasks.filter((task) => task.isDeleted !== true);
    const assigned =
      userRole === "designer"
        ? visibleTasks.filter(
            (task) => task.assignedToName === user?.displayName
          )
        : visibleTasks;
    setFilteredTasks(assigned);
  }, [tasks, userRole, user]);

  useEffect(() => {
    // console.log("🔄 INIT: Initializing timers from tasks");
    const initialTimers: Record<string, number> = {};
    tasks.forEach((task) => {
      if (task.actualMinutes && task.actualMinutes > 0) {
        initialTimers[task.id] = task.actualMinutes * 60;
        // console.log(
        //   `🔄 INIT: Task ${task.id} (${task.title}) has ${
        //     task.actualMinutes
        //   } minutes (${task.actualMinutes * 60} seconds)`
        // );
      }
    });
    // console.log("🔄 INIT: Initial timers:", initialTimers);
    setTimers(initialTimers);
  }, [tasks]);

  useEffect(() => {
    // console.log("🔄 TIMER: Timer effect running");
    const interval = setInterval(() => {
      setTimers((prev) => {
        const updated = { ...prev };
        let hasRunningTimer = false;

        for (const taskId in runningTimers) {
          if (runningTimers[taskId]) {
            updated[taskId] = (updated[taskId] || 0) + 1;
            hasRunningTimer = true;

            if (updated[taskId] % 10 === 0) {
              console.log(
                `⏱️ TIMER: Task ${taskId} running for ${Math.floor(
                  updated[taskId] / 60
                )}:${String(updated[taskId] % 60).padStart(2, "0")}`
              );
            }
          }
        }

        return updated;
      });
    }, 1000);

    return () => {
      console.log("🔄 TIMER: Timer cleanup");
      clearInterval(interval);
    };
  }, [runningTimers]);

  useEffect(() => {
    const fetchUids = async () => {
      if (!selectedTask?.projectId) return;

      const projectRef = doc(db, "projects", selectedTask.projectId);
      const projectSnap = await getDoc(projectRef);

      if (projectSnap.exists()) {
        const projectData = projectSnap.data();
        setClientUid(projectData.clientId || null);
        setDesignerUid(projectData.designerId || null);
      }
    };

    fetchUids();
  }, [selectedTask]);

  useEffect(() => {
    if (openChat && endOfMessagesRef.current) {
      endOfMessagesRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, openChat]);

  useEffect(() => {
    if (openChat) {
      setTimeout(() => {
        endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [openChat]);

  const handleDeleteTask = async (
    taskId: string,
    projectId: string,
    milestoneId: string
  ) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this task?"
    );
    if (!confirmDelete) return;
    try {
      const taskRef = doc(
        db,
        "projects",
        projectId,
        "milestones",
        milestoneId,
        "tasks",
        taskId
      );
      await updateDoc(taskRef, { isDeleted: true });
      console.log("Task deleted successfully");
      
      // Update local state immediately to reflect the change
      const updatedTask = tasks.find(t => t.id === taskId);
      if (updatedTask) {
        onTaskUpdate({ ...updatedTask, isDeleted: true });
      }
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  };

  useEffect(() => {
    const fetchMilestoneNames = async () => {
      const tasksWithoutMilestoneNames = tasks.filter(
        (task) => task.milestoneId && !task.milestoneName
      );

      if (tasksWithoutMilestoneNames.length === 0) return;

      const names: Record<string, string> = {};

      // Get unique milestone IDs
      const milestoneIds = [
        ...new Set(tasksWithoutMilestoneNames.map((task) => task.milestoneId)),
      ];

      await Promise.all(
        milestoneIds.map(async (milestoneId) => {
          try {
            const milestoneRef = doc(
              db,
              `projects/${projectId}/milestones/${milestoneId}`
            );
            const milestoneSnap = await getDoc(milestoneRef);
            if (milestoneSnap.exists()) {
              names[milestoneId] =
                milestoneSnap.data().name || `Milestone ${milestoneId}`;
            }
          } catch (error) {
            console.error("Error fetching milestone name:", error);
            names[milestoneId] = `Milestone ${milestoneId}`;
          }
        })
      );

      setMilestoneNames((prev) => ({ ...prev, ...names }));
    };

    fetchMilestoneNames();
  }, [tasks, projectId]);


  // ✅ FIXED: Remove the local task editing logic and dialog
  // Just call the parent's onEditTask function
  const handleEditTask = (task: Task) => {
    onEditTask(task); // This will be handled by the parent component
  };

  const handleStart = (taskId: string) => {
    setRunningTimers((prev) => ({ ...prev, [taskId]: true }));
  };

  const handleHold = (taskId: string) => {
    setShowHoldDialogFor(taskId);
  };

  const confirmHold = async () => {
    // console.log("🔄 HOLD: Starting confirmHold process");
    // console.log("🔄 HOLD: showHoldDialogFor:", showHoldDialogFor);
    // console.log("🔄 HOLD: holdReason:", holdReason);

    if (!showHoldDialogFor || !holdReason.trim()) {
      console.log(
        "❌ HOLD: Missing required data - showHoldDialogFor or holdReason"
      );
      return;
    }

    setRunningTimers((prev) => ({ ...prev, [showHoldDialogFor]: false }));
    // console.log("🔄 HOLD: Timer stopped for task:", showHoldDialogFor);

    const task = tasks.find((t) => t.id === showHoldDialogFor);
    if (!task) {
      console.log("❌ HOLD: Task not found with ID:", showHoldDialogFor);
      return;
    }

    // console.log("🔄 HOLD: Found task:", task.title);

    const totalSeconds = timers[showHoldDialogFor] || 0;
    const totalMinutes = Math.floor(totalSeconds / 60);

    // console.log("🔄 HOLD: Time calculation:");
    // console.log("  - Total seconds:", totalSeconds);
    // console.log("  - Total minutes:", totalMinutes);
    // console.log("  - Previous actualMinutes:", task.actualMinutes || 0);

    const taskRef = doc(
      db,
      `projects/${task.projectId}/milestones/${task.milestoneId}/tasks/${task.id}`
    );

    const updateData = {
      onHoldReason: holdReason.trim(),
      actualMinutes: totalMinutes,
    };

    // console.log("🔄 HOLD: Updating database with:", updateData);

    try {
      await updateDoc(taskRef, updateData);
      console.log("✅ HOLD: Database updated successfully");
      
      // Update local state
      onTaskUpdate({ ...task, ...updateData });
    } catch (error) {
      console.error("❌ HOLD: Database update failed:", error);
    }

    setHoldReason("");
    setShowHoldDialogFor(null);
    console.log("🔄 HOLD: Process completed, dialog closed");
  };

  const handleComplete = (taskId: string) => {
    setShowCompleteDialogFor(taskId);
  };

  const confirmComplete = async () => {
    console.log("🎯 COMPLETE: Starting confirmComplete process");

    if (!showCompleteDialogFor || !proofUrl.trim()) {
      console.log(
        "❌ COMPLETE: Missing required data - showCompleteDialogFor or proofUrl"
      );
      return;
    }

    setRunningTimers((prev) => ({ ...prev, [showCompleteDialogFor]: false }));

    const task = tasks.find((t) => t.id === showCompleteDialogFor);
    if (!task) {
      console.log(
        "❌ COMPLETE: Task not found with ID:",
        showCompleteDialogFor
      );
      return;
    }

    const totalSeconds = timers[showCompleteDialogFor] || 0;
    const totalMinutes = Math.floor(totalSeconds / 60);

    const taskRef = doc(
      db,
      `projects/${task.projectId}/milestones/${task.milestoneId}/tasks/${task.id}`
    );

    const updateData = {
      actualMinutes: totalMinutes,
      status: "Completed",
      completedProof: proofUrl.trim(),
    };

    try {
      await updateDoc(taskRef, updateData);
      console.log("✅ COMPLETE: Task updated successfully");

      // Update milestone progress
      const tasksSnapshot = await getDocs(
        collection(
          db,
          `projects/${task.projectId}/milestones/${task.milestoneId}/tasks`
        )
      );

      const visibleTasks = tasksSnapshot.docs.filter(
        (doc) => doc.data().isDeleted !== true
      );

      const totalTasks = visibleTasks.length;
      const completedTasks = visibleTasks.filter(
        (doc) => doc.data().status === "Completed"
      ).length;

      const progress =
        totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      const milestoneRef = doc(
        db,
        `projects/${task.projectId}/milestones/${task.milestoneId}`
      );

      await updateDoc(milestoneRef, { progress });
      console.log("✅ COMPLETE: Milestone progress updated successfully");
      
      // Update local state
      onTaskUpdate({ ...task, ...updateData });
    } catch (error) {
      console.error("❌ COMPLETE: Task update failed:", error);
    }

    setProofUrl("");
    setShowCompleteDialogFor(null);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "High":
        return "bg-red-100 text-red-800";
      case "Medium":
        return "bg-yellow-100 text-yellow-800";
      case "Low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatMinutes = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
      2,
      "0"
    )} min`;
  };

  const handleOpenChat = (task: Task) => {
    setSelectedTask(task);
    if (userRole === "client") setChatTarget("admin-client");
    else if (userRole === "designer") setChatTarget("admin-designer");
    else setChatTarget("admin-client");
    setOpenChat(true);
  };

  const grouped = {
    pending: filteredTasks.filter(
      (t) => t.status !== "Completed" && t.status !== "In Progress"
    ),
    inProgress: filteredTasks.filter((t) => t.status === "In Progress"),
    completed: filteredTasks.filter((t) => t.status === "Completed"),
  };

  const handleEdit = (msg: any) => {
    setEditMsgId(msg.id);
    setEditContent(msg.content);
  };

  const handleSaveEdit = async () => {
    if (!projectId || !milestoneId || !selectedTask || !editMsgId) return;

    await updateDoc(
      doc(
        db,
        `projects/${projectId}/milestones/${milestoneId}/tasks/${selectedTask.id}/messages/${editMsgId}`
      ),
      { content: editContent }
    );

    setEditMsgId(null);
    setEditContent("");
  };

  const handleCancelEdit = () => {
    setEditMsgId(null);
    setEditContent("");
  };

  const handleDelete = async (id: string) => {
    if (!projectId || !milestoneId || !selectedTask) return;

    await deleteDoc(
      doc(
        db,
        `projects/${projectId}/milestones/${milestoneId}/tasks/${selectedTask.id}/messages/${id}`
      )
    );
  };

  const renderSection = (title: string, taskList: Task[]) => {
    if (taskList.length === 0) return null;

    return (
      <div className="mb-6">
        <h2 className="text-lg font-bold mb-2">{title}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {taskList.map((task) => (
            <Card key={task.id}>
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  {task.title}
                  <span
                    className={`text-xs rounded-full px-2 py-1 bg-gray-100 text-gray-700 ${getPriorityColor(
                      task.priority
                    )}`}
                  >
                    {task.priority}
                  </span>
                </CardTitle>
                {userRole === "admin" && (
                  <div className="flex items-center justify-end gap-2">
                    <Pencil
                      className="w-4 h-4 text-yellow-600 cursor-pointer hover:text-yellow-800"
                      onClick={() => handleEditTask(task)}
                    />
                    <Trash
                      className="w-4 h-4 text-red-600 cursor-pointer hover:text-red-800"
                      onClick={() =>
                        handleDeleteTask(
                          task.id,
                          task.projectId,
                          task.milestoneId
                        )
                      }
                    />
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-gray-700">
                <p>Description: {task.description}</p>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <span>Assigned to: {task.assignedToName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>Due: {task.dueDate}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>Est: {task.estimatedMinutes} mins</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>Time Taken: {task.actualMinutes} Mins</span>
                </div>
                {task.isRevision && task.revisionReasons?.length > 0 && (
                  <div className="text-sm text-red-600 mt-2">
                    <span className="font-semibold">Revision Requested:</span>{" "}
                    {task.revisionReasons[task.revisionReasons.length - 1]}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="font-medium">Status:</span>
                  {task.status !== "completed" ? (
                    <Popover
                      open={openPopoverId === task.id}
                      onOpenChange={(open) =>
                        setOpenPopoverId(open ? task.id : null)
                      }
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-1"
                        >
                          {task.status}
                          <ChevronDown className="w-4 h-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="p-2 w-[150px]">
                        {statusOptions.map((status) => (
                          <Button
                            key={status}
                            variant={
                              status === task.status ? "default" : "ghost"
                            }
                            className="w-full justify-start text-left"
                            onClick={() => {
                              onStatusChange(task.id, status);
                              setOpenPopoverId(null);
                            }}
                          >
                            {status}
                          </Button>
                        ))}
                      </PopoverContent>
                    </Popover>
                  ) : (
                    <span className="text-green-600 font-medium">
                      {task.status}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={
                      runningTimers[task.id]
                        ? "text-red-500 font-medium"
                        : "text-green-600 font-medium"
                    }
                  >
                    {formatMinutes(
                      timers[task.id] || (task.actualMinutes || 0) * 60
                    )}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 mt-2">
                  {task.status !== "Completed" && userRole !== "admin" && (
                    <>
                      {!runningTimers[task.id] ? (
                        <Button onClick={() => handleStart(task.id)} size="sm">
                          Start
                        </Button>
                      ) : (
                        <>
                          <Button
                            onClick={() => handleHold(task.id)}
                            variant="secondary"
                            size="sm"
                          >
                            Hold
                          </Button>
                          <Button
                            onClick={() => handleComplete(task.id)}
                            variant="default"
                            size="sm"
                          >
                            Completed
                          </Button>
                        </>
                      )}
                    </>
                  )}

                  {userRole === "admin" && (
                    <>
                      <Button
                        size="sm"
                        onClick={async () => {
                          const taskRef = doc(
                            db,
                            `projects/${task.projectId}/milestones/${task.milestoneId}/tasks/${task.id}`
                          );

                          try {
                            const updateData = {
                              isApproved: true,
                              isRevision: false,
                              status: "Completed",
                            };
                            
                            await updateDoc(taskRef, updateData);

                            // Update milestone progress
                            const tasksSnapshot = await getDocs(
                              collection(
                                db,
                                `projects/${task.projectId}/milestones/${task.milestoneId}/tasks`
                              )
                            );
                            const visibleTasks = tasksSnapshot.docs.filter(
                              (doc) => doc.data().isDeleted !== true
                            );
                            const totalTasks = visibleTasks.length;
                            const completedTasks = visibleTasks.filter(
                              (doc) => doc.data().status === "Completed"
                            ).length;

                            const progress =
                              totalTasks > 0
                                ? Math.round(
                                    (completedTasks / totalTasks) * 100
                                  )
                                : 0;

                            const milestoneRef = doc(
                              db,
                              `projects/${task.projectId}/milestones/${task.milestoneId}`
                            );
                            await updateDoc(milestoneRef, { progress });

                            // Send notification
                            const notificationRef = doc(
                              collection(
                                db,
                                `users/${task.assignedTo}/notifications`
                              )
                            );
                            await setDoc(notificationRef, {
                              message: `Your task "${
                                task.title
                              }" is approved by ${
                                user.displayName || "Admin"
                              }.`,
                              type: "task",
                              read: false,
                              createdAt: new Date(),
                            });
                            
                            // Update local state
                            onTaskUpdate({ ...task, ...updateData });
                          } catch (err) {
                            console.error(
                              "❌ APPROVED: Failed to update or notify",
                              err
                            );
                          }
                        }}
                        variant="outline"
                        className="border border-green-500 text-green-500 hover:text-green-600"
                        disabled={task.isApproved}
                      >
                        {task.isApproved ? "Approved" : "Approve"}
                      </Button>

                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={async () => {
                          try {
                            setSelectedTask(task);
                            setShowRevisionDialog(true);

                            const notificationRef = doc(
                              collection(
                                db,
                                `users/${task.assignedTo}/notifications`
                              )
                            );
                            await setDoc(notificationRef, {
                              message: `Your task "${
                                task.title
                              }" has received a revision request from ${
                                user.displayName || "Admin"
                              }.`,
                              type: "task",
                              read: false,
                              createdAt: new Date(),
                            });
                          } catch (err) {
                            console.error(
                              "❌ REVISION: Failed to send notification",
                              err
                            );
                          }
                        }}
                      >
                        Request Revision
                      </Button>
                    </>
                  )}
                </div>

                {task.completedProof && (
                  <div className="flex items-center gap-2 text-xs text-green-700">
                    <Check className="w-4 h-4" />
                    <a
                      href={
                        task.completedProof.startsWith("http://") ||
                        task.completedProof.startsWith("https://")
                          ? task.completedProof
                          : `https://${task.completedProof}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      View Proof
                    </a>
                  </div>
                )}

                <button
                  onClick={() => handleOpenChat(task)}
                  className="mt-3 inline-flex items-center gap-2 bg-black text-white px-3 py-1 rounded hover:bg-gray-800"
                >
                  <MessageSquare className="w-4 h-4" />
                  Chat
                </button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {renderSection("🟡 Pending Tasks", grouped.pending)}
      {renderSection("🟠 In Progress Tasks", grouped.inProgress)}
      {renderSection("✅ Completed Tasks", grouped.completed)}

      <Sheet open={openChat} onOpenChange={setOpenChat}>
        <SheetContent side="right" className="w-full max-w-md p-6">
          <SheetHeader>
            <SheetTitle>{selectedTask?.title || "Task Chat"}</SheetTitle>
          </SheetHeader>

          {selectedTask && (
            <div className="mt-4 flex flex-col gap-4 h-full">
              {userRole === "admin" && (
                <div className="flex gap-2">
                  <Button
                    variant={
                      chatTarget === "admin-client" ? "default" : "outline"
                    }
                    onClick={() => setChatTarget("admin-client")}
                  >
                    Client Chat
                  </Button>
                  <Button
                    variant={
                      chatTarget === "admin-designer" ? "default" : "outline"
                    }
                    onClick={() => setChatTarget("admin-designer")}
                  >
                    Designer Chat
                  </Button>
                </div>
              )}

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
                        <span className="text-xs italic text-gray-700 mb-1">
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
                        className={`w-fit max-w-[90%] p-3 rounded-lg shadow-sm text-sm ${
                          isOwnMessage
                            ? "bg-blue-100 text-left ml-auto"
                            : "bg-white text-left"
                        }`}
                      >
                        <div className="font-semibold text-gray-800 mb-1">
                          {msg.sender}
                        </div>

                        {editMsgId === msg.id ? (
                          <>
                            <textarea
                              className="w-full p-2 border rounded text-sm"
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                            />
                            <div className="flex justify-end gap-2 text-xs text-blue-600 mt-2">
                              <button onClick={handleSaveEdit}>Save</button>
                              <button onClick={handleCancelEdit}>Cancel</button>
                            </div>
                          </>
                        ) : (
                          <div className="whitespace-pre-wrap text-black">
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

              {chatTarget && (
                <ChatInput
                  projectId={projectId!}
                  milestoneId={milestoneId!}
                  taskId={selectedTask.id}
                  chatTarget={chatTarget}
                  clientUid={clientUid}
                  designerUid={designerUid}
                  taskName={selectedTask.title}
                  milestoneName={
                    selectedTask.milestoneName ||
                    milestoneNames[selectedTask.milestoneId] ||
                    `Milestone ${selectedTask.milestoneId}`
                  }
                />
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Hold Dialog */}
      <Dialog
        open={!!showHoldDialogFor}
        onOpenChange={() => {
          setShowHoldDialogFor(null);
          setHoldReason("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enter Hold Reason</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Why are you holding this task?"
            value={holdReason}
            onChange={(e) => setHoldReason(e.target.value)}
          />
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setShowHoldDialogFor(null)}
            >
              Cancel
            </Button>
            <Button onClick={confirmHold} disabled={!holdReason.trim()}>
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Complete Dialog */}
      <Dialog
        open={!!showCompleteDialogFor}
        onOpenChange={() => {
          setShowCompleteDialogFor(null);
          setProofUrl("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Work Proof</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Enter proof URL (e.g., screenshot, document link, etc.)"
            value={proofUrl}
            onChange={(e) => setProofUrl(e.target.value)}
          />
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setShowCompleteDialogFor(null)}
            >
              Cancel
            </Button>
            <Button onClick={confirmComplete} disabled={!proofUrl.trim()}>
              Complete Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revision Dialog */}
      <Dialog open={showRevisionDialog} onOpenChange={setShowRevisionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enter Revision Reason</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Why is this task sent for revision?"
            value={revisionReason}
            onChange={(e) => setRevisionReason(e.target.value)}
          />
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setShowRevisionDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!revisionReason.trim() || !selectedTask) return;

                const taskRef = doc(
                  db,
                  `projects/${selectedTask.projectId}/milestones/${selectedTask.milestoneId}/tasks/${selectedTask.id}`
                );

                try {
                  const updateData = {
                    isRevision: true,
                    isApproved: false,
                    status: "In Revision",
                    revisionReasons: [
                      ...(selectedTask.revisionReasons || []),
                      revisionReason.trim(),
                    ],
                  };

                  await updateDoc(taskRef, updateData);
                  console.log("✅ REVISION: Task updated", revisionReason);

                  // Update local state
                  onTaskUpdate({ ...selectedTask, ...updateData });
                } catch (err) {
                  console.error("❌ REVISION: Failed to update", err);
                }

                setRevisionReason("");
                setShowRevisionDialog(false);
              }}
              disabled={!revisionReason.trim()}
            >
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TaskList;