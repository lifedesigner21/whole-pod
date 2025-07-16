import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import {
  collectionGroup,
  onSnapshot,
  updateDoc,
  doc,
} from "firebase/firestore";
import TodaysSummaryCard from "@/components/TodaysSummaryCard";
import FilteredTaskList from "@/components/FilteredTaskList"; // ✅ new import
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";

interface Subtask {
  name: string;
  brief: string;
  estimatedHours: number;
  startDate: string;
  endDate: string;
  designerId: string;
  designerName?: string;
  status?: string;
  isApproved?: boolean;
}

interface Task {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  estimatedHours: number;
  priority: string;
  status: string;
  assignedTo: string;
  assignedToName: string;
  projectId: string;
  milestoneId: string;
  createdAt: string;
  subtasks?: Subtask[];
  revisionCount?: number;
  isRevision?: boolean;
}

const MyWorkboard = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [openPopoverId, setOpenPopoverId] = useState<string | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    if (!user?.uid) return;

    const unsubscribe = onSnapshot(collectionGroup(db, "tasks"), (snapshot) => {
      const userTasks: Task[] = [];

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.assignedTo === user.uid) {
          const pathParts = docSnap.ref.path.split("/");
          const projectId = pathParts[1];
          const milestoneId = pathParts[3];

          userTasks.push({
            id: docSnap.id,
            ...data,
            projectId,
            milestoneId,
          } as Task);
        }
      });

      setTasks(userTasks);
    });

    return () => unsubscribe();
  }, [user]);

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const taskRef = doc(
      db,
      `projects/${task.projectId}/milestones/${task.milestoneId}/tasks/${taskId}`
    );
    await updateDoc(taskRef, { status: newStatus });

    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );
  };

  const today = format(new Date(), "yyyy-MM-dd");

  const completed = tasks.filter((task) => {
    if (!task.createdAt) return false;
    const createdDate = format(new Date(task.createdAt), "yyyy-MM-dd");
    return createdDate === today;
  }).length;

  const total = tasks.length;
  const pending = total - completed;
  const pendingFeedback = tasks.reduce((count, task) => {
    const subtasks = task.subtasks || [];
    return count + subtasks.filter((s) => s.isApproved === false).length;
  }, 0);
  const totalRevisions = tasks.filter(
    (task) => task.isRevision === true
  ).length;

  return (
    <div className="p-6 space-y-6">
      <Button variant="outline" onClick={() => navigate("/dashboard")}>
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Dashboard
      </Button>
      <h2 className="text-2xl font-bold">📋 My Workboard</h2>

      {/* <TodaysSummaryCard
        taskStats={{ total, completed, pending }}
        pendingFeedback={pendingFeedback}
        totalRevisions={totalRevisions}
      /> */}

      {/* ✅ Use FilteredTaskList instead of TaskList */}
      <FilteredTaskList
        tasks={tasks}
        openPopoverId={openPopoverId}
        setOpenPopoverId={setOpenPopoverId}
        onStatusChange={handleStatusChange}
      />
    </div>
  );
};

export default MyWorkboard;
