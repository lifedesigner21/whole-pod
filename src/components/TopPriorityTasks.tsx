import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import {
  collection,
  collectionGroup,
  doc,
  getDocs,
  onSnapshot,
  updateDoc,
} from "firebase/firestore";
import { formatDate } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";

interface Task {
  id: string;
  title: string;
  description: string;
  priority: "High" | "Medium" | "Low";
  status: string;
  dueDate: string;
  assignedTo: string;
  projectId: string;
  milestoneId: string;
  assignedToName: string;
  projectName?: string;
  milestoneName?: string;
}

const priorityOrder = {
  High: 1,
  Medium: 2,
  Low: 3,
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

const statusOptions = ["To Do", "In Progress", "In Review", "Completed"];

const TopPriorityTasks = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [openPopoverId, setOpenPopoverId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user?.uid) return;

    const unsubscribe = onSnapshot(
      collectionGroup(db, "tasks"),
      async (snapshot) => {
        const fetched = snapshot.docs
          .map((doc) => ({ id: doc.id, ...(doc.data() as Task) }))
          .filter(
            (task) =>
              task.assignedTo === user.uid && task.status !== "Completed"
          );

        // Sort by priority
        const sorted = fetched.sort(
          (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
        );

        // Fetch project and milestone names
        const tasksWithNames = await Promise.all(
          sorted.slice(0, 3).map(async (task) => {
            try {
              const projectSnap = await getDocs(collection(db, "projects"));
              const projectDoc = projectSnap.docs.find(
                (doc) => doc.id === task.projectId
              );

              const milestoneSnap = await getDocs(
                collection(db, `projects/${task.projectId}/milestones`)
              );
              const milestoneDoc = milestoneSnap.docs.find(
                (doc) => doc.id === task.milestoneId
              );

              return {
                ...task,
                projectName: projectDoc?.data()?.name || "Unknown Project",
                milestoneName:
                  milestoneDoc?.data()?.name || "Unknown Milestone",
              };
            } catch (err) {
              console.error("Error fetching names:", err);
              return {
                ...task,
                projectName: "Unknown",
                milestoneName: "Unknown",
              };
            }
          })
        );

        setTasks(tasksWithNames);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const onStatusChange = async (taskId: string, newStatus: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const taskRef = doc(
      db,
      `projects/${task.projectId}/milestones/${task.milestoneId}/tasks/${task.id}`
    );

    // Step 1: Update task status
    await updateDoc(taskRef, { status: newStatus });

    // Step 2: Optimistically update local state
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );

    // ✅ Step 3: Recalculate milestone progress always
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

    // Step 4: Update milestone progress
    const milestoneRef = doc(
      db,
      `projects/${task.projectId}/milestones/${task.milestoneId}`
    );
    await updateDoc(milestoneRef, { progress });

    console.log(
      `📊 Milestone progress updated: ${progress}% (${completedTasks}/${totalTasks} tasks completed)`
    );
  };

  if (tasks.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🔥 Top Priority Tasks
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="border p-4 rounded-lg bg-white shadow-sm cursor-pointer hover:bg-gray-50 transition"
              onClick={() => navigate("/my-workboard")}
            >
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold text-lg text-gray-900">
                  {task.title}
                </h3>

                <span
                  className={`text-xs px-2 py-1 rounded-full font-semibold ${getPriorityColor(
                    task.priority
                  )}`}
                >
                  {task.priority}
                </span>
              </div>
              <p className="text-sm text-gray-700 mb-2">
                Desc: {task.description}
              </p>
              <p className="text-sm text-gray-500">
                Project: <span className="font-medium">{task.projectName}</span>
              </p>
              <p className="text-sm text-gray-500">
                Milestone:{" "}
                <span className="font-medium">{task.milestoneName}</span>
              </p>
              <p className="text-sm text-gray-500">
                Designer: {task.assignedToName}
              </p>
              <p className="text-sm text-gray-500">
                Due: {formatDate(task.dueDate)}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="font-medium">Status: {task.status}</span>

                {/* <Popover
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
                        onClick={() => {onStatusChange(task.id, status); setOpenPopoverId(null);}}
                      >
                        {status}
                      </Button>
                    ))}
                  </PopoverContent>
                </Popover> */}
              </div>
            </div>
          ))}
        </div>

        <div className="text-right">
          <button
            className="text-sm text-white bg-black p-2 m-2 rounded-md font-medium"
            onClick={() => navigate("/my-workboard")}
          >
            My Workboard
          </button>
        </div>
      </CardContent>
    </Card>
  );
};

export default TopPriorityTasks;
