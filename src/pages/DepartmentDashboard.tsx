import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import ProjectCard from "@/components/ProjectCard";
import ProjectDetails from "@/components/ProjectDetails";
import PerformanceWidget from "@/components/PerformanceWidget";
import {
  Clock,
  CheckCircle,
  MessageSquare,
  Calendar,
  Star,
  TrendingUp,
} from "lucide-react";
import { mockTaskHistory, mockPerformanceData } from "@/data/mockData";
import {
  collection,
  collectionGroup,
  getDocs,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import TopPriorityTasks from "@/components/TopPriorityTasks";
import TodaysSummaryCard from "@/components/TodaysSummaryCard";
import { format, isToday } from "date-fns";
import { formatDate } from "@/lib/utils";
import LeaveRequestDialog from "@/components/LeaveRequestDialog";
import LeaveRequestList from "@/components/LeaveRequestList";

interface Task {
  id: string;
  title: string;
  description: string;
  assignedTo: string;
  createdAt: string;
  dueDate: string;
  estimatedHours: number;
  actualMinutes: number;
  priority: string;
  status: string;
  isDeleted?: boolean; // New field to mark deletion
}

const DepartmentDashboard = () => {
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [departmentProjects, setDepartmentProjects] = useState<any[]>([]);
  const [taskStats, setTaskStats] = useState({
    completed: 0,
    total: 0,
    pending: 0,
  });
  const [taskHistory, setTaskHistory] = useState<
    {
      date: string;
      totalTasks: number;
      tasksCompleted: number;
      closedAt: string;
    }[]
  >([]);
  const [revisionCount, setRevisionCount] = useState(0);
  const { user, userRole } = useAuth();

  const handleViewDetails = (projectId: string) => {
    setSelectedProject(projectId);
  };

  const handleBackToDashboard = () => {
    setSelectedProject(null);
  };

  useEffect(() => {
    const fetchRevisions = async () => {
      if (!user?.uid) return;

      const q = query(
        collectionGroup(db, "tasks"),
        where("assignedTo", "==", user.uid),
        where("isRevision", "==", true)
      );

      const snapshot = await getDocs(q);
      setRevisionCount(snapshot.size);
    };

    fetchRevisions();
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid || !userRole) return;
    
    // Dynamic field mapping based on user role
    const roleFieldMap: Record<string, string> = {
      designer: "designerId",
      developer: "developerId",
      legalteam: "legalId"
    };
    
    const fieldName = roleFieldMap[userRole];
    if (!fieldName) return;

    const q = query(
      collection(db, "projects"),
      where(fieldName, "==", user.uid)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const projects = snapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...(doc.data() as any),
        }))
        .filter((project) => project.isDeleted !== true);
      setDepartmentProjects(projects);
    });
    return () => unsubscribe();
  }, [user, userRole]);

  useEffect(() => {
    if (!user?.uid) return;

    const unsubscribe = onSnapshot(collectionGroup(db, "tasks"), (snapshot) => {
      const tasks: Task[] = snapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<Task, "id">),
        }))
        .filter((task) => task.assignedTo === user.uid);

      const today = format(new Date(), "yyyy-MM-dd");

      const newTasks = tasks.filter((task) => {
        if (!task.createdAt || task.isDeleted === true) return false;

        const createdDate = format(new Date(task.createdAt), "yyyy-MM-dd");
        const isCreatedToday = createdDate === today;
        const isNotCompleted = task.status.toLowerCase() !== "completed";

        return isCreatedToday && isNotCompleted;
      });

      const pending = tasks.filter(
        (t) => t.status.toLowerCase() !== "completed" && t.isDeleted !== true
      ).length;

      setTaskStats({
        completed: newTasks.length, // ✅ today's created tasks
        total: tasks.length,
        pending,
      });
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user?.uid) return;

    const unsubscribe = onSnapshot(collectionGroup(db, "tasks"), (snapshot) => {
      const allTasks = snapshot.docs
        .map((doc) => ({ id: doc.id, ...(doc.data() as any) }))
        .filter(
          (task) => task.assignedTo === user.uid && task.isDeleted !== true
        );

      const history: Record<
        string,
        {
          totalTasks: number;
          completedTasks: number;
          lastClosedAt: string;
        }
      > = {};

      allTasks.forEach((task) => {
        const dateKey = new Date(task.createdAt).toISOString().split("T")[0];

        if (!history[dateKey]) {
          history[dateKey] = {
            totalTasks: 0,
            completedTasks: 0,
            lastClosedAt: task.createdAt,
          };
        }

        history[dateKey].totalTasks += 1;

        if (task.status === "Completed") {
          history[dateKey].completedTasks += 1;

          // Update lastClosedAt if more recent
          if (
            new Date(task.createdAt) > new Date(history[dateKey].lastClosedAt)
          ) {
            history[dateKey].lastClosedAt = task.createdAt;
          }
        }
      });

      const formatted = Object.entries(history).map(([date, data]) => ({
        date,
        totalTasks: data.totalTasks,
        tasksCompleted: data.completedTasks,
        closedAt: new Date(data.lastClosedAt).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      }));

      setTaskHistory(formatted);
    });

    return () => unsubscribe();
  }, [user]);

  if (selectedProject) {
    const project = departmentProjects.find((p) => p.id === selectedProject);
    if (project) {
      return (
        <ProjectDetails project={project} onBack={handleBackToDashboard} />
      );
    }
  }

  // Dynamic dashboard title based on user role
  const getDashboardTitle = () => {
    switch (userRole) {
      case 'designer':
        return 'Designer Dashboard';
      case 'developer':
        return 'Developer Dashboard';
      case 'legalteam':
        return 'Legal Team Dashboard';
      default:
        return 'Department Dashboard';
    }
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {getDashboardTitle()}
          </h1>
          <p className="text-gray-600 mt-1">
            Welcome back! Here's your workspace overview
          </p>
        </div>
      </div>

      {/* Today's Summary */}
      <TodaysSummaryCard
        taskStats={taskStats}
        pendingFeedback={3} // Example static data, replace with actual logic
        totalRevisions={revisionCount}
      />

      {/* Priority Tasks */}
      <TopPriorityTasks />

      {/* My Projects */}
      <Card>
        <CardHeader>
          <CardTitle>My Projects</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {departmentProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onViewDetails={handleViewDetails}
                showClientInfo={true}
                showDesignerInfo={false}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Daily Task History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Daily Task History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium text-gray-700">
                    Date
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">
                    Total Tasks
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">
                    Tasks Completed
                  </th>
                </tr>
              </thead>
              <tbody>
                {taskHistory.map((day, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-900">
                      {formatDate(day.date)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="font-medium">
                          {day.totalTasks} tasks
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-900">
                      {day.tasksCompleted}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <LeaveRequestList />

      {/* Performance Snapshot */}
      {/* <PerformanceWidget data={mockPerformanceData} /> */}

      {/* Quick Actions */}
      {/* <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button className="p-4 text-center border rounded-lg hover:bg-gray-50 transition-colors">
              <Clock className="w-6 h-6 mx-auto mb-2 text-blue-600" />
              <p className="text-sm font-medium">Log Hours</p>
            </button>
            <button className="p-4 text-center border rounded-lg hover:bg-gray-50 transition-colors">
              <CheckCircle className="w-6 h-6 mx-auto mb-2 text-green-600" />
              <p className="text-sm font-medium">Mark Complete</p>
            </button>
            <button className="p-4 text-center border rounded-lg hover:bg-gray-50 transition-colors">
              <MessageSquare className="w-6 h-6 mx-auto mb-2 text-orange-600" />
              <p className="text-sm font-medium">Send Update</p>
            </button>
            <button className="p-4 text-center border rounded-lg hover:bg-gray-50 transition-colors">
              <Star className="w-6 h-6 mx-auto mb-2 text-purple-600" />
              <p className="text-sm font-medium">View Feedback</p>
            </button>
          </div>
        </CardContent>
      </Card> */}
    </div>
  );
};

export default DepartmentDashboard;
