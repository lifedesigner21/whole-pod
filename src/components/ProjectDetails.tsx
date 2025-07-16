import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  MessageSquare,
  FileText,
  TimerIcon,
} from "lucide-react";
import { Project } from "@/data/mockData";
import KanbanTasks from "./KanbanTasks";
import CreateTaskDialog from "./CreateTaskDialogue";
import {
  collection,
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { formatDate } from "@/lib/utils";
import MilestoneCards from "./MilestoneCards";

interface Task {
  id: string;
  title: string;
  description: string;
  status: "To Do" | "In Progress" | "Review" | "Completed";
  priority: "Low" | "Medium" | "High";
  dueDate: string;
  estimatedHours: number;
  actualHours: number;
  assignedTo: string;
}

interface ProjectDetailsProps {
  project: Project;
  onBack: () => void;
}

const ProjectDetails: React.FC<ProjectDetailsProps> = ({ project, onBack }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [clientEmail, setClientEmail] = useState<string>("");
  const [milestones, setMilestones] = useState([]);

  useEffect(() => {
    const q = query(
      collectionGroup(db, "tasks"),
      where("projectId", "==", project.id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedTasks = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Task[];

      setTasks(fetchedTasks);
    });

    return () => unsubscribe();
  }, [project.id]);

  useEffect(() => {
    const fetchClientEmail = async () => {
      if (!project.clientId) return;

      const userRef = doc(db, "users", project.clientId);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const userData = userSnap.data();
        setClientEmail(userData.email || "Not Available");
      } else {
        setClientEmail("Not Found");
      }
    };

    fetchClientEmail();
  }, [project.clientId]);

  useEffect(() => {
    const fetchMilestones = async () => {
      try {
        const snapshot = await getDocs(
          collection(db, "projects", project.id!, "milestones")
        );
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setMilestones(data);
      } catch (err) {
        console.error("Error fetching milestones:", err);
      }
    };

    if (project.id) fetchMilestones();
  }, [project.id]);

  const completedTasks = tasks.filter(
    (task) => task.status === "Completed"
  ).length;

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>

      {/* Project Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Task Progress */}
        <Card className="h-full">
          <CardContent className="p-4 h-full flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2 mt-6">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium">Tasks Progress</span>
              </div>
              <p className="text-2xl font-bold">
                {completedTasks}/{tasks.length}
              </p>
              <Progress
                value={(completedTasks / (tasks.length || 1)) * 100}
                className="h-2 mt-2"
              />

              <div className="flex items-center gap-2 mt-6">
                <TimerIcon className="w-5 h-5 text-red-600" />
                <span className="text-sm font-medium">Due Date</span>
              </div>
              <p className="text-2xl font-bold">
                {formatDate(project.endDate)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Project Info */}
        <Card className="md:col-span-2 h-full">
          <CardContent className="p-4 h-full">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
              <div>
                <p className="text-sm text-gray-500">Project Name</p>
                <p className="text-sm font-medium text-gray-900">
                  {project.name}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Client</p>
                <p className="text-sm font-medium text-gray-900">
                  {project.client}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Client Email</p>
                <p className="text-sm font-medium text-gray-900">
                  {clientEmail}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Start Date</p>
                <p className="text-sm font-medium text-gray-900">
                  {formatDate(project.startDate)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">End Date</p>
                <p className="text-sm font-medium text-gray-900">
                  {formatDate(project.endDate)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Designer</p>
                <p className="text-sm font-medium text-gray-900">
                  {project.designer}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Progress</p>
                <p className="text-sm font-medium text-gray-900">
                  {project.progress}%
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Service Type</p>
                <p className="text-sm font-medium text-gray-900">
                  {project.serviceType || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Figma Link</p>
                <a
                  className="text-blue-500 underline"
                  href={project.figmaUrl}
                  target="_blank"
                >
                  View
                </a>
              </div>
              <div>
                <p className="text-sm text-gray-500">Assets</p>
                <a
                  className="text-blue-500 underline"
                  href={project.assetsLink}
                  target="_blank"
                >
                  View
                </a>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <MilestoneCards
        project={{ milestones }}
        projectId={project.id}
        projectName={project.name}
      />
    </div>
  );
};

export default ProjectDetails;

{
  /* Tasks List */
}
{
  /* <Card>
        <CardHeader className="flex items-center justify-between"></CardHeader>
        <CardContent>
          <KanbanTasks projectId={project.id} />
        </CardContent>
      </Card> */
}

{
  /* Quick Actions */
}
{
  /* <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button variant="outline" className="p-4 h-auto flex-col">
              <FileText className="w-6 h-6 mb-2 text-blue-600" />
              <span className="text-sm font-medium">Project Files</span>
            </Button>
            <Button variant="outline" className="p-4 h-auto flex-col">
              <MessageSquare className="w-6 h-6 mb-2 text-green-600" />
              <span className="text-sm font-medium">Client Messages</span>
            </Button>
            <Button variant="outline" className="p-4 h-auto flex-col">
              <Clock className="w-6 h-6 mb-2 text-orange-600" />
              <span className="text-sm font-medium">Time Tracker</span>
            </Button>
            <Button variant="outline" className="p-4 h-auto flex-col">
              <AlertCircle className="w-6 h-6 mb-2 text-red-600" />
              <span className="text-sm font-medium">Report Issue</span>
            </Button>
          </div>
        </CardContent>
      </Card> */
}
