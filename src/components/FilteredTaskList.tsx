import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock, User, ChevronDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import CreateSubtaskDialog from "./CreateSubTasiDialog";
import { collection, doc, getDocs, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { formatDate } from "@/lib/utils";

interface Subtask {
  name: string;
  brief: string;
  estimatedHours: number;
  startDate: string;
  endDate: string;
  designerId: string;
  status?: string;
  designerName?: string;
}

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
  subtasks?: Subtask[];
  isRevision?: boolean;
  revisionReasons?: string[];
  estimatedMinutes?: number;
}

interface FilteredTaskListProps {
  tasks: Task[];
  openPopoverId: string | null;
  setOpenPopoverId: (id: string | null) => void;
  onStatusChange: (taskId: string, newStatus: string) => void;
}

const statusOptions = ["To Do", "In Progress", "Info Required", "In Review", "Completed"];

const FilteredTaskList: React.FC<FilteredTaskListProps> = ({
  tasks,
  openPopoverId,
  setOpenPopoverId,
  onStatusChange,
}) => {
  const { userRole, user } = useAuth();
  const [timers, setTimers] = useState<Record<string, number>>({});
  const [runningTimers, setRunningTimers] = useState<Record<string, boolean>>(
    {}
  );
  const [showHoldDialogFor, setShowHoldDialogFor] = useState<string | null>(
    null
  );
  const [holdReason, setHoldReason] = useState<string>("");
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>(
    {}
  );

  const today = format(new Date(), "yyyy-MM-dd");

  // Filter tasks by status and type
  const completedTasks = tasks.filter((task) => task.status === "Completed");

  const revisionTasks = tasks.filter(
    (task) => task.isRevision && task.status !== "Completed"
  );

  const newTasks = tasks.filter((task) => {
    if (!task.createdAt || task.isRevision || task.status === "Completed") return false;
    const createdDate = format(new Date(task.createdAt), "yyyy-MM-dd");
    return createdDate === today;
  });

  const pendingTasks = tasks.filter((task) => {
    if (!task.createdAt || task.isRevision || task.status === "Completed") return false;
    const createdDate = format(new Date(task.createdAt), "yyyy-MM-dd");
    return createdDate < today;
  });

  useEffect(() => {
    const initialTimers: Record<string, number> = {};
    tasks.forEach((task) => {
      if (task.actualMinutes && task.actualMinutes > 0) {
        initialTimers[task.id] = task.actualMinutes * 60;
      }
    });
    setTimers(initialTimers);
  }, [tasks]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimers((prev) => {
        const updated = { ...prev };
        for (const taskId in runningTimers) {
          if (runningTimers[taskId]) {
            updated[taskId] = (updated[taskId] || 0) + 1;
          }
        }
        return updated;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [runningTimers]);

  const handleStart = (taskId: string) => {
    setRunningTimers((prev) => ({ ...prev, [taskId]: true }));
  };

  const handleHold = (taskId: string) => {
    setShowHoldDialogFor(taskId);
  };

  const confirmHold = async () => {
    if (!showHoldDialogFor || !holdReason.trim()) return;
    setRunningTimers((prev) => ({ ...prev, [showHoldDialogFor]: false }));
    const task = tasks.find((t) => t.id === showHoldDialogFor);
    if (!task) return;
    const taskRef = doc(
      db,
      `projects/${task.projectId}/milestones/${task.milestoneId}/tasks/${task.id}`
    );
    await updateDoc(taskRef, { onHoldReason: holdReason.trim() });
    setHoldReason("");
    setShowHoldDialogFor(null);
  };

  const handleComplete = async (task: Task) => {
    setRunningTimers((prev) => ({ ...prev, [task.id]: false }));
    const totalSeconds = timers[task.id] || 0;
    const totalMinutes = Math.floor(totalSeconds / 60);

    const taskRef = doc(
      db,
      `projects/${task.projectId}/milestones/${task.milestoneId}/tasks/${task.id}`
    );

    await updateDoc(taskRef, {
      actualMinutes: totalMinutes,
      status: "Completed",
    });

    const tasksSnapshot = await getDocs(
      collection(
        db,
        `projects/${task.projectId}/milestones/${task.milestoneId}/tasks`
      )
    );

    const totalTasks = tasksSnapshot.size;
    const completedTasks = tasksSnapshot.docs.filter(
      (doc) => doc.data().status === "Completed"
    ).length;

    const progress =
      totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const milestoneRef = doc(
      db,
      `projects/${task.projectId}/milestones/${task.milestoneId}`
    );
    await updateDoc(milestoneRef, { progress });
  };

  const updateSubtaskStatus = async (
    task: Task,
    subtaskIndex: number,
    newStatus: string
  ) => {
    const taskRef = doc(
      db,
      `projects/${task.projectId}/milestones/${task.milestoneId}/tasks/${task.id}`
    );
    const updatedSubtasks = [...(task.subtasks || [])];
    updatedSubtasks[subtaskIndex] = {
      ...updatedSubtasks[subtaskIndex],
      status: newStatus,
    };
    await updateDoc(taskRef, { subtasks: updatedSubtasks });
  };

  const formatMinutes = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
      2,
      "0"
    )} min`;
  };

  const renderTasks = (taskList: Task[], title: string, isCompleted: boolean = false) => (
    <>
      <h3 className="text-xl font-semibold mb-4">{title}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {taskList.map((task) => (
          <Card key={task.id} className="hover:shadow-md transition">
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                {task.title}
                <span className="text-xs rounded px-2 py-1 bg-gray-100 text-gray-700">
                  {task.priority}
                </span>
              </CardTitle>
            </CardHeader>

            <CardContent>
              <div className="flex justify-between">
                <div className="space-y-2 text-sm text-gray-700">
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
                    <span>Estimated: {task.estimatedMinutes} Mins</span>
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
                            variant={
                              status === task.status ? "default" : "ghost"
                            }
                            className="w-full justify-start text-left"
                            onClick={() => onStatusChange(task.id, status)}
                          >
                            {status}
                          </Button>
                        ))}
                      </PopoverContent>
                    </Popover>
                  </div>
                  {task.isRevision && (
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4" />
                      <span className="font-bold">
                        Revision Requested:{" "}
                        {task.revisionReasons && task.revisionReasons.length > 0
                          ? task.revisionReasons[
                              task.revisionReasons.length - 1
                            ]
                          : "No reason provided"}
                      </span>
                    </div>
                  )}
                  {userRole !== "designer" && !isCompleted && (
                    <CreateSubtaskDialog
                      projectId={task.projectId}
                      milestoneId={task.milestoneId}
                      taskId={task.id}
                    />
                  )}
                  {task.subtasks && task.subtasks.length > 0 && (
                    <div className="mt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs underline text-blue-600 px-0"
                        onClick={() =>
                          setExpandedTasks((prev) => ({
                            ...prev,
                            [task.id]: !prev[task.id],
                          }))
                        }
                      >
                        {expandedTasks[task.id]
                          ? "Hide Subtasks"
                          : "Show Subtasks"}
                      </Button>
                      {expandedTasks[task.id] && (
                        <div className="mt-2 space-y-2">
                          {task.subtasks.map((subtask, index) =>
                            subtask.designerId === user?.uid ? (
                              <div
                                key={index}
                                className="border p-3 rounded-md bg-gray-50 space-y-1"
                              >
                                <div className="flex justify-between items-center">
                                  <div className="font-semibold">
                                    {subtask.name}
                                  </div>
                                  {!isCompleted && (
                                    <Popover>
                                      <PopoverTrigger asChild>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="text-xs px-2 h-6"
                                        >
                                          {subtask.status || "To Do"}{" "}
                                          <ChevronDown className="w-3 h-3 ml-1" />
                                        </Button>
                                      </PopoverTrigger>
                                      <PopoverContent className="p-2 w-[140px]">
                                        {statusOptions.map((status) => (
                                          <Button
                                            key={status}
                                            variant={
                                              status === subtask.status
                                                ? "default"
                                                : "ghost"
                                            }
                                            className="w-full justify-start text-left text-xs"
                                            onClick={() =>
                                              updateSubtaskStatus(
                                                task,
                                                index,
                                                status
                                              )
                                            }
                                          >
                                            {status}
                                          </Button>
                                        ))}
                                      </PopoverContent>
                                    </Popover>
                                  )}
                                  {isCompleted && (
                                    <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
                                      {subtask.status || "Completed"}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-600">
                                  {subtask.brief}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {formatDate(subtask.startDate)} -
                                  {formatDate(subtask.endDate)} | Est:{" "}
                                  {subtask.estimatedHours} Mins | Designer:{" "}
                                  {subtask.designerName}
                                </p>
                              </div>
                            ) : null
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2 ml-4">
                  <div
                    className={
                      runningTimers[task.id]
                        ? "text-red-500 font-medium"
                        : "text-green-600 font-medium"
                    }
                  >
                    {formatMinutes(
                      timers[task.id] || (task.actualMinutes || 0) * 60
                    )}
                  </div>
                  {!isCompleted && (
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
                            onClick={() => handleComplete(task)}
                            variant="default"
                            size="sm"
                          >
                            Completed
                          </Button>
                        </>
                      )}
                    </>
                  )}
                  {isCompleted && (
                    <div className="text-xs text-gray-600 font-medium">
                      ✓ Completed
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );

  return (
    <>
      {newTasks.length > 0 && renderTasks(newTasks, "🆕 New Tasks")}
      {pendingTasks.length > 0 && renderTasks(pendingTasks, "⏳ Pending Tasks")}
      {revisionTasks.length > 0 &&
        renderTasks(revisionTasks, "🛠️ Revision Tasks")}
      {completedTasks.length > 0 &&
        renderTasks(completedTasks, "✅ Completed Tasks", true)}

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
    </>
  );
};

export default FilteredTaskList;