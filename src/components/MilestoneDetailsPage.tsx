import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import CreateTaskDialog from "./CreateTaskDialogue";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  onSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import TaskList from "./TaskLIstAdminPortal";
import Breadcrumb from "./BreadCrumb";
import { useLocation } from "react-router-dom";

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
  isDeleted?: boolean;
}

const MilestoneDetailsPage = () => {
  const { projectId, milestoneId } = useParams();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [openPopoverId, setOpenPopoverId] = useState<string | null>(null);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null); 
  const location = useLocation();
  const { milestoneName, projectName } = location.state || {};

  useEffect(() => {
    if (!projectId || !milestoneId) return;

    const taskRef = collection(
      db,
      `projects/${projectId}/milestones/${milestoneId}/tasks`
    );

    const unsubscribe = onSnapshot(taskRef, (snapshot) => {
      const taskList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Task[];
      setTasks(taskList);
    });

    return () => unsubscribe();
  }, [projectId, milestoneId]);

  const updateStatus = async (taskId: string, newStatus: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const taskRef = doc(
      db,
      `projects/${task.projectId}/milestones/${task.milestoneId}/tasks/${taskId}`
    );

    const updateData: any = { status: newStatus };

    if (newStatus === "Completed") {
      updateData.isRevision = false;
    }

    try {
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
        totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      const milestoneRef = doc(
        db,
        `projects/${task.projectId}/milestones/${task.milestoneId}`
      );
      await updateDoc(milestoneRef, { progress });

      console.log(
        `✅ Milestone progress updated to ${progress}% (${completedTasks}/${totalTasks} tasks completed)`
      );

      // ✅ FIXED: Update local state immediately to prevent flickering
      setTasks((prevTasks) =>
        prevTasks.map((t) =>
          t.id === taskId ? { ...t, status: newStatus } : t
        )
      );
    } catch (error) {
      console.error("Error updating task status:", error);
    }
  };

  // ✅ FIXED: Simplified task update handler
  const handleTaskUpdate = (updatedTask: Task) => {
    console.log("🔄 Updating task in parent:", updatedTask.id, updatedTask.title);
    
    setTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === updatedTask.id ? { ...task, ...updatedTask } : task
      )
    );
  };

  // ✅ FIXED: Simplified edit task handler
  const handleEditTask = (task: Task) => {
    console.log("✏️ Opening edit dialog for task:", task.id, task.title);
    setTaskToEdit(task);
  };

  // ✅ FIXED: Handle task creation/update completion
  const handleTaskCreatedOrUpdated = () => {
    console.log("✅ Task operation completed, closing dialog");
    setTaskToEdit(null);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <Button
          variant="outline"
          onClick={() => navigate(`/dashboard`)}
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Go Back
        </Button>
        <CreateTaskDialog 
          projectId={projectId!} 
          milestoneId={milestoneId!}
          onTaskCreated={handleTaskCreatedOrUpdated}
        />
      </div>

      <h2 className="text-2xl font-semibold mb-4">Tasks in this Milestone</h2>
      <Breadcrumb
        paths={[
          { name: projectName || "Project" },
          { name: milestoneName || "Milestone" },
          {name:"Tasks"}
        ]}
      />

      {tasks.length === 0 ? (
        <p className="text-gray-500">No tasks available.</p>
      ) : (
        <TaskList
          tasks={tasks}
          openPopoverId={openPopoverId}
          setOpenPopoverId={setOpenPopoverId}
          onStatusChange={updateStatus}
          onTaskUpdate={handleTaskUpdate} // ✅ Pass the simplified handler
          onEditTask={handleEditTask} // ✅ Pass the edit handler
          projectId={projectId!}
          milestoneId={milestoneId!}
        />
      )}

      {/* ✅ FIXED: Single dialog instance for editing only */}
      {taskToEdit && (
        <CreateTaskDialog
          projectId={projectId!}
          milestoneId={milestoneId!}
          taskToEdit={taskToEdit}
          onTaskUpdated={handleTaskCreatedOrUpdated} // ✅ Close dialog after update
        />
      )}
    </div>
  );
};

export default MilestoneDetailsPage;