import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import CreateTaskDialog from "./CreateTaskDialogue";
import { collection, getDocs, doc, updateDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import TaskList from "./TaskLIstAdminPortal";

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
  isRevision?: boolean;
  revisionReasons?: string[];
  estimatedMinutes?: number;
  completedProof?: string;
}

const MilestoneDetailsPage = () => {
  const { projectId, milestoneId } = useParams();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [openPopoverId, setOpenPopoverId] = useState<string | null>(null);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null); // ✅ for editing

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

    return () => unsubscribe(); // clean up the listener
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

    await updateDoc(taskRef, updateData);

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

    console.log(
      `✅ Milestone progress updated to ${progress}% (${completedTasks}/${totalTasks} tasks completed)`
    );

    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );
  };

  const handleTaskUpdate = (updatedTask: Task) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === updatedTask.id ? { ...task, ...updatedTask } : task
      )
    );
    setTaskToEdit(null); // ✅ close edit dialog
  };

  const handleEditTask = (task: Task) => {
    setTaskToEdit(task); // ✅ open edit dialog with task data
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <Button
          variant="outline"
          onClick={() => navigate(`/project/${projectId}`)}
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Go Back
        </Button>
        <CreateTaskDialog
          projectId={projectId!}
          milestoneId={milestoneId!}
        />
      </div>

      <h2 className="text-2xl font-semibold mb-4">Tasks in this Milestone</h2>

      {tasks.length === 0 ? (
        <p className="text-gray-500">No tasks available.</p>
      ) : (
        <TaskList
          tasks={tasks}
          openPopoverId={openPopoverId}
          setOpenPopoverId={setOpenPopoverId}
          onStatusChange={updateStatus}
          onTaskUpdate={handleTaskUpdate}
          onEditTask={handleEditTask} // ✅ pass edit handler
          projectId={projectId!}
          milestoneId={milestoneId!}
        />
      )}

      {/* ✅ Hidden Dialog instance only for editing */}
      {taskToEdit && (
        <CreateTaskDialog
          projectId={projectId!}
          milestoneId={milestoneId!}
          taskToEdit={taskToEdit}
          onTaskUpdated={() => {
            setTaskToEdit(null);
          }}
        />
      )}
    </div>
  );
};

export default MilestoneDetailsPage;
