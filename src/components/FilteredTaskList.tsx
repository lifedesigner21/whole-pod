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
import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
} from "firebase/firestore";
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
  completedProof?: string;
  startedAt?: string;
  isDeleted?: boolean; // New field to mark deletion
}

interface FilteredTaskListProps {
  tasks: Task[];
  openPopoverId: string | null;
  setOpenPopoverId: (id: string | null) => void;
  onStatusChange: (taskId: string, newStatus: string) => void;
}

const statusOptions = [
  "To Do",
  "In Progress",
  "Info Required",
  "In Review",
  "Completed",
];

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
  const [showCompleteDialogFor, setShowCompleteDialogFor] = useState<
    string | null
  >(null);
  const [proofUrl, setProofUrl] = useState<string>("");
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>(
    {}
  );
  const [projectNames, setProjectNames] = useState<Record<string, string>>({});
  const [milestoneNames, setMilestoneNames] = useState<Record<string, string>>(
    {}
  );

  const today = format(new Date(), "yyyy-MM-dd");

  // Filter tasks by status and type
  const completedTasks = tasks.filter(
    (task) => task.status === "Completed" && task.isDeleted !== true
  );

  const revisionTasks = tasks.filter(
    (task) =>
      task.isRevision && task.status !== "Completed" && task.isDeleted !== true
  );

  const newTasks = tasks.filter((task) => {
    if (
      !task.createdAt ||
      task.isRevision ||
      task.status === "Completed" ||
      task.isDeleted === true
    )
      return false;
    const createdDate = format(new Date(task.createdAt), "yyyy-MM-dd");
    return createdDate === today;
  });

  const pendingTasks = tasks.filter((task) => {
    if (
      !task.createdAt ||
      task.isRevision ||
      task.status === "Completed" ||
      task.isDeleted === true
    )
      return false;
    const createdDate = format(new Date(task.createdAt), "yyyy-MM-dd");
    return createdDate < today;
  });

  useEffect(() => {
    const initialTimers: Record<string, number> = {};

    tasks.forEach((task) => {
      let totalSeconds = (task.actualMinutes || 0) * 60;

      if (task.startedAt && !task.onHoldReason && task.status !== "Completed") {
        const startedAt = new Date(task.startedAt).getTime();
        const now = Date.now();
        const diffSeconds = Math.floor((now - startedAt) / 1000);
        totalSeconds += diffSeconds;

        // Also mark this task as running
        setRunningTimers((prev) => ({ ...prev, [task.id]: true }));
      }

      initialTimers[task.id] = totalSeconds;
    });

    setTimers(initialTimers);
  }, [tasks]);

  useEffect(() => {
    const fetchNames = async () => {
      const uniqueProjectIds = Array.from(
        new Set(tasks.map((task) => task.projectId))
      );
      const tempProjectNames: Record<string, string> = {};
      const tempMilestoneNames: Record<string, string> = {};

      for (const projectId of uniqueProjectIds) {
        const projectRef = doc(db, "projects", projectId);
        const projectSnap = await getDoc(projectRef);
        if (projectSnap.exists()) {
          tempProjectNames[projectId] =
            projectSnap.data().name || "Unnamed Project";

          const milestoneIds = Array.from(
            new Set(
              tasks
                .filter((t) => t.projectId === projectId)
                .map((t) => t.milestoneId)
            )
          );

          for (const milestoneId of milestoneIds) {
            const milestoneRef = doc(
              db,
              `projects/${projectId}/milestones`,
              milestoneId
            );
            const milestoneSnap = await getDoc(milestoneRef);
            if (milestoneSnap.exists()) {
              tempMilestoneNames[milestoneId] =
                milestoneSnap.data().name || "Unnamed Milestone";
            }
          }
        }
      }

      setProjectNames(tempProjectNames);
      setMilestoneNames(tempMilestoneNames);
    };

    fetchNames();
  }, [tasks]);

  useEffect(() => {
    console.log("🔄 TIMER: Timer effect running");
    const interval = setInterval(() => {
      setTimers((prev) => {
        const updated = { ...prev };
        let hasRunningTimer = false;

        for (const taskId in runningTimers) {
          if (runningTimers[taskId]) {
            updated[taskId] = (updated[taskId] || 0) + 1;
            hasRunningTimer = true;

            // Log every 10 seconds to avoid spam
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

  const handleStart = async (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const taskRef = doc(
      db,
      `projects/${task.projectId}/milestones/${task.milestoneId}/tasks/${task.id}`
    );

    try {
      await updateDoc(taskRef, {
        startedAt: new Date().toISOString(),
      });
      setRunningTimers((prev) => ({ ...prev, [taskId]: true }));
    } catch (err) {
      console.error("❌ Failed to start timer:", err);
    }
  };

  const handleHold = (taskId: string) => {
    setShowHoldDialogFor(taskId);
  };

  const confirmHold = async () => {
    console.log("🔄 HOLD: Starting confirmHold process");
    console.log("🔄 HOLD: showHoldDialogFor:", showHoldDialogFor);
    console.log("🔄 HOLD: holdReason:", holdReason);

    if (!showHoldDialogFor || !holdReason.trim()) {
      console.log(
        "❌ HOLD: Missing required data - showHoldDialogFor or holdReason"
      );
      return;
    }

    setRunningTimers((prev) => ({ ...prev, [showHoldDialogFor]: false }));
    console.log("🔄 HOLD: Timer stopped for task:", showHoldDialogFor);

    const task = tasks.find((t) => t.id === showHoldDialogFor);
    if (!task) {
      console.log("❌ HOLD: Task not found with ID:", showHoldDialogFor);
      return;
    }

    console.log("🔄 HOLD: Found task:", task.title);

    const totalSeconds = timers[showHoldDialogFor] || 0;
    const totalMinutes = Math.floor(totalSeconds / 60);

    console.log("🔄 HOLD: Time calculation:");
    console.log("  - Total seconds:", totalSeconds);
    console.log("  - Total minutes:", totalMinutes);
    console.log("  - Previous actualMinutes:", task.actualMinutes || 0);

    const taskRef = doc(
      db,
      `projects/${task.projectId}/milestones/${task.milestoneId}/tasks/${task.id}`
    );

    const updateData = {
      onHoldReason: holdReason.trim(),
      actualMinutes: totalMinutes,
      startedAt: null,
    };

    console.log("🔄 HOLD: Updating database with:", updateData);
    console.log(
      "🔄 HOLD: Database path:",
      `projects/${task.projectId}/milestones/${task.milestoneId}/tasks/${task.id}`
    );

    try {
      await updateDoc(taskRef, updateData);
      console.log("✅ HOLD: Database updated successfully");
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
    console.log("🎯 COMPLETE: showCompleteDialogFor:", showCompleteDialogFor);
    console.log("🎯 COMPLETE: proofUrl:", proofUrl);

    if (!showCompleteDialogFor || !proofUrl.trim()) {
      console.log(
        "❌ COMPLETE: Missing required data - showCompleteDialogFor or proofUrl"
      );
      return;
    }

    setRunningTimers((prev) => ({ ...prev, [showCompleteDialogFor]: false }));
    console.log("🎯 COMPLETE: Timer stopped for task:", showCompleteDialogFor);

    const task = tasks.find((t) => t.id === showCompleteDialogFor);
    if (!task) {
      console.log(
        "❌ COMPLETE: Task not found with ID:",
        showCompleteDialogFor
      );
      return;
    }

    console.log("🎯 COMPLETE: Found task:", task.title);

    const totalSeconds = timers[showCompleteDialogFor] || 0;
    const totalMinutes = Math.floor(totalSeconds / 60);

    console.log("🎯 COMPLETE: Time calculation:");
    console.log("  - Total seconds:", totalSeconds);
    console.log("  - Total minutes:", totalMinutes);
    console.log("  - Previous actualMinutes:", task.actualMinutes || 0);

    const taskRef = doc(
      db,
      `projects/${task.projectId}/milestones/${task.milestoneId}/tasks/${task.id}`
    );

    const updateData = {
      actualMinutes: totalMinutes,
      status: "Completed",
      completedProof: proofUrl.trim(),
      startedAt: null,
    };

    console.log("🎯 COMPLETE: Updating task with:", updateData);
    console.log(
      "🎯 COMPLETE: Database path:",
      `projects/${task.projectId}/milestones/${task.milestoneId}/tasks/${task.id}`
    );

    try {
      await updateDoc(taskRef, updateData);
      console.log("✅ COMPLETE: Task updated successfully");
    } catch (error) {
      console.error("❌ COMPLETE: Task update failed:", error);
    }

    console.log(
      "🎯 COMPLETE: Fetching tasks for milestone progress calculation..."
    );

    try {
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

      console.log("🎯 COMPLETE: Progress calculation:");
      console.log("  - Total tasks:", totalTasks);
      console.log("  - Completed tasks:", completedTasks);

      const progress =
        totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      console.log("  - Calculated progress:", progress + "%");

      const milestoneRef = doc(
        db,
        `projects/${task.projectId}/milestones/${task.milestoneId}`
      );

      console.log("🎯 COMPLETE: Updating milestone progress...");
      console.log(
        "🎯 COMPLETE: Milestone path:",
        `projects/${task.projectId}/milestones/${task.milestoneId}`
      );

      await updateDoc(milestoneRef, { progress });
      console.log("✅ COMPLETE: Milestone progress updated successfully");
    } catch (error) {
      console.error("❌ COMPLETE: Milestone update failed:", error);
    }

    setProofUrl("");
    setShowCompleteDialogFor(null);
    console.log("🎯 COMPLETE: Process completed, dialog closed");
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

  const renderTasks = (
    taskList: Task[],
    title: string,
    isCompleted: boolean = false
  ) => (
    <>
      <h3 className="text-xl font-semibold mb-4">{title}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {taskList.map((task) => (
          <Card key={task.id} className="hover:shadow-md transition">
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
            </CardHeader>

            <CardContent>
              <div className="flex justify-between">
                <div className="space-y-2 text-sm text-gray-700">
                  <p>Description: {task.description}</p>
                  <p>
                    <strong>Project:</strong>{" "}
                    {projectNames[task.projectId] || "Loading..."}
                  </p>
                  <p>
                    <strong>Milestone:</strong>{" "}
                    {milestoneNames[task.milestoneId] || "Loading..."}
                  </p>
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
                    <Clock className="w-4 h-4" />
                    <span>Time Taken: {task.actualMinutes} Mins</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Status:</span>{" "}
                    {!isCompleted ? (
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
                  {/* {userRole !== "designer" && !isCompleted && (
                    <CreateSubtaskDialog
                      projectId={task.projectId}
                      milestoneId={task.milestoneId}
                      taskId={task.id}
                    />
                  )} */}
                  {/* {task.subtasks && task.subtasks.length > 0 && (
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
                  )} */}
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

                  {/* Debug info - remove in production
                  {process.env.NODE_ENV === 'development' && (
                    <div className="text-xs text-gray-400 text-right">
                      <div>Timer: {timers[task.id] || 0}s</div>
                      <div>DB: {task.actualMinutes || 0}min</div>
                      <div>Running: {runningTimers[task.id] ? 'Yes' : 'No'}</div>
                      {task.onHoldReason && <div>Hold: {task.onHoldReason.substring(0, 20)}...</div>}
                      {task.completedProof && <div>Proof: Yes</div>}
                    </div>
                  )} */}

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
    </>
  );
};

export default FilteredTaskList;
