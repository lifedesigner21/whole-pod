
import { useNavigate,useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import MilestoneCard from "@/components/MilestoneCard";
import Breadcrumb from "@/components/BreadCrumb";

const ProjectDetailPage = () => {
    const navigate = useNavigate();
    const { projectId } = useParams();

  const [project, setProject] = useState<any | null>(null);
  const [taskStats, setTaskStats] = useState({ total: 0, completed: 0 });
  const [error, setError] = useState<string | null>(null);


  useEffect(() => {
    const fetchProjectWithMilestones = async () => {
      if (!projectId || typeof projectId !== "string") return;

      try {
        const projectRef = doc(db, "projects", projectId);
        const projectSnap = await getDoc(projectRef);

        if (!projectSnap.exists()) {
          setError("Project not found.");
          return;
        }

        const projectData = { id: projectSnap.id, ...projectSnap.data() };

        const milestonesRef = collection(
          db,
          "projects",
          projectId,
          "milestones"
        );
        const milestonesSnap = await getDocs(milestonesRef);

        let totalTasks = 0;
        let completedTasks = 0;

        const milestonesWithTasks = await Promise.all(
          milestonesSnap.docs.map(async (milestoneDoc) => {
            const milestoneData = milestoneDoc.data();
            const tasksRef = collection(
              db,
              "projects",
              projectId,
              "milestones",
              milestoneDoc.id,
              "tasks"
            );
            const tasksSnap = await getDocs(tasksRef);

            const tasks = tasksSnap.docs.map((taskDoc) => taskDoc.data());

            totalTasks += tasks.length;
            completedTasks += tasks.filter(
              (t: any) => t.status === "Completed"
            ).length;

            return {
              id: milestoneDoc.id,
              ...milestoneData,
              tasks,
              tasksCompleted: tasks.filter((t: any) => t.status === "Completed")
                .length,
              totalTasks: tasks.length,
            };
          })
        );

        setTaskStats({ total: totalTasks, completed: completedTasks });
        setProject({ ...projectData, milestones: milestonesWithTasks });
      } catch (err) {
        console.error("Error fetching project or milestones:", err);
        setError("Failed to load project details.");
      }
    };

    fetchProjectWithMilestones();
  }, [projectId]);


  if (error) {
    return <div className="p-6 text-red-600">{error}</div>;
  }

  if (!project) {
    return <div className="p-6">Loading...</div>;
  }


  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <div className="flex flex-col gap-3 pb-6 border-b border-gray-200">
        <Button
          variant="outline"
          onClick={() => navigate(-1)}
          className="self-start w-fit text-gray-700"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <Breadcrumb
          paths={[
            { name: project.name, },
            { name: "Milestones" },
          ]}
        />
        <div className="mx-auto flex flex-col items-center">
          <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
          <p className="text-sm text-gray-500 mt-1 ">
            Detailed project breakdown and milestones
          </p>
        </div>
      </div>

      {/* Project Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-2xl font-bold text-blue-600">
              {project.progress}%
            </p>
            <p className="text-sm text-gray-600">Overall Progress</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-2xl font-bold text-green-600">
              {taskStats.completed}/{taskStats.total}
            </p>
            <p className="text-sm text-gray-600">Tasks Completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-2xl font-bold text-purple-600">
              ₹{project.paidAmount?.toLocaleString() || 0}
            </p>
            <p className="text-sm text-gray-600">Amount Paid</p>
          </CardContent>
        </Card>

        {/* <Card>
          <CardContent className="p-6 text-center">
            <p className="text-2xl font-bold text-orange-600">
              {project.revisionsUsed}/{project.maxRevisions}
            </p>
            <p className="text-sm text-gray-600">Revisions Used</p>
          </CardContent>
        </Card> */}
      </div>

      {/* Milestones */}
      <Card>
        <CardHeader>
          <CardTitle>Project Milestones</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {project.milestones?.map((milestone: any) => (
              <MilestoneCard
                key={milestone.id}
                projectId={projectId}
                milestone={milestone}
                isClient={true}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProjectDetailPage;
