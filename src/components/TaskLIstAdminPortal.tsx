import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  Calendar,
  Clock,
  User,
  ChevronDown,
  Check,
  MessageSquare,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "./ui/sheet";
import { useChatMessages } from "@/hooks/useChatMessages";
import ChatInput from "./ChatInput";

interface Task {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  estimatedMinutes: number;
  priority: string;
  status: string;
  assignedToName: string;
  completedProof?: string;
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
  const [chatTarget, setChatTarget] = useState<"admin-client" | "admin-designer" | null>(null);
  const messages = useChatMessages(projectId!, milestoneId!, selectedTask?.id, chatTarget);

  useEffect(() => {
    const assigned =
      userRole === "designer"
        ? tasks.filter((task) => task.assignedToName === user?.displayName)
        : tasks;
    setFilteredTasks(assigned);
  }, [tasks, userRole, user]);

  const handleOpenChat = (task: Task) => {
    setSelectedTask(task);
    // Choose default chat channel based on role
    if (userRole === "client") setChatTarget("admin-client");
    else if (userRole === "designer") setChatTarget("admin-designer");
    else setChatTarget(null);
    setOpenChat(true);
  };

  const grouped = {
    pending: filteredTasks.filter(
      (t) => t.status !== "Completed" && t.status !== "In Progress"
    ),
    inProgress: filteredTasks.filter((t) => t.status === "In Progress"),
    completed: filteredTasks.filter((t) => t.status === "Completed"),
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
                  <span className="text-xs rounded px-2 py-1 bg-gray-100 text-gray-700">
                    {task.priority}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-gray-700">
                <p>{task.description}</p>
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
                  <span className="font-medium">Status:</span>
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
                          variant={status === task.status ? "default" : "ghost"}
                          className="w-full justify-start text-left"
                          onClick={() => onStatusChange(task.id, status)}
                        >
                          {status}
                        </Button>
                      ))}
                    </PopoverContent>
                  </Popover>
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

        <Sheet open={openChat} onOpenChange={setOpenChat}>
          <SheetContent side="right" className="w-full max-w-md p-6">
            <SheetHeader>
              <SheetTitle>{selectedTask?.title || "Task Chat"}</SheetTitle>
            </SheetHeader>

            {selectedTask && (
              <div className="mt-4 flex flex-col gap-4 h-full">
                {(userRole === "admin") && (
                  <div className="flex gap-2">
                    <Button
                      variant={chatTarget === "admin-client" ? "default" : "outline"}
                      onClick={() => setChatTarget("admin-client")}
                    >
                      Client Chat
                    </Button>
                    <Button
                      variant={chatTarget === "admin-designer" ? "default" : "outline"}
                      onClick={() => setChatTarget("admin-designer")}
                    >
                      Designer Chat
                    </Button>
                  </div>
                )}

                <div className="flex-1 overflow-y-auto space-y-4 bg-gray-50 p-3 rounded">
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
                        <span className="text-xs italic text-gray-600 mb-1">
                          {msg.role}
                        </span>

                        <div
                          className={`w-fit max-w-[80%] p-3 rounded-lg shadow-sm text-sm ${
                            isOwnMessage
                              ? "bg-blue-100 text-right ml-auto"
                              : "bg-white text-left"
                          }`}
                        >
                          <div className="font-semibold text-gray-800 mb-1">
                            {msg.sender}
                          </div>
                          <div className="text-black whitespace-pre-wrap">
                            {msg.content}
                          </div>
                          {time && (
                            <div className="text-[11px] text-gray-500 mt-2">
                              {time}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {chatTarget && (
                  <ChatInput
                    projectId={projectId!}
                    milestoneId={milestoneId!}
                    taskId={selectedTask.id}
                    chatTarget={chatTarget}
                  />
                )}
              </div>
            )}
          </SheetContent>
        </Sheet>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {renderSection("🟡 Pending Tasks", grouped.pending)}
      {renderSection("🟠 In Progress Tasks", grouped.inProgress)}
      {renderSection("✅ Completed Tasks", grouped.completed)}
    </div>
  );
};

export default TaskList;
