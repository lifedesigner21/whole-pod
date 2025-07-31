import React, { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, CheckCircle, TimerIcon } from "lucide-react";
import { Project } from "@/data/mockData";
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
import { CreateMilestoneDialogRef } from "./CreateMilestoneDialog";
import { useAuth } from "@/contexts/AuthContext";
import Breadcrumb from "./BreadCrumb";

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
  isDeleted?: boolean; // New field to mark deletion
}

interface ProjectDetailsProps {
  project: Project;
  onBack: () => void;
}

const ProjectDetails: React.FC<ProjectDetailsProps> = ({ project, onBack }) => {
  const { user, userRole } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [clientEmail, setClientEmail] = useState<string>("");
  const [milestones, setMilestones] = useState([]);
  const [userTasks, setUserTasks] = useState<Task[]>([]);

  const milestoneDialogRef = useRef<CreateMilestoneDialogRef | null>(null);

  const handleMilestoneCreated = async () => {
    if (!project.id) return;
    try {
      const snapshot = await getDocs(
        collection(db, "projects", project.id, "milestones")
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
      
      // Filter tasks for current user if they are a designer
      if (userRole === "designer" && user?.email) {
        const userSpecificTasks = fetchedTasks.filter(
          (task) => task.assignedTo === user.email && !task.isDeleted
        );
        setUserTasks(userSpecificTasks);
      } else {
        setUserTasks(fetchedTasks.filter((task) => !task.isDeleted));
      }
    });

    return () => unsubscribe();
  }, [project.id, userRole, user?.email]);

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

  const completedTasks = userTasks.filter(
    (task) => task.status === "Completed"
  ).length;

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      {/* <div className="flex items-center gap-4">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
      </div> */}

      <Breadcrumb
        paths={[
          { name: "Projects", to: "/dashboard" },
          {
            name: project.name || "Unnamed Project",
            to: `/project/${project.id}`,
          },
        ]}
      />

      {/* Project Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Task Progress */}
        <Card className="h-full">
          <CardContent className="p-4 h-full flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2 mt-6">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium">
                  {userRole === "designer" ? "My Tasks Progress" : "Tasks Progress"}
                </span>
              </div>
              <p className="text-2xl font-bold">
                {completedTasks}/{userTasks.length}
              </p>
              <Progress
                value={
                  (completedTasks / (userTasks.length || 1)) * 100
                }
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
        project={{ milestones: milestones.filter((m) => m.isDeleted !== true) }}
        projectId={project.id}
        projectName={project.name}
        milestoneDialogRef={milestoneDialogRef}
        onMilestoneCreated={handleMilestoneCreated}
      />
    </div>
  );
};

export default ProjectDetails;


