import { useParams, useNavigate } from "react-router-dom";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useEffect, useRef, useState } from "react";
import MilestoneCards from "@/components/MilestoneCards";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, CheckCircle, TimerIcon } from "lucide-react";
import CreateMilestoneDialog, {
  CreateMilestoneDialogRef,
} from "@/components/CreateMilestoneDialog";
import { useAuth } from "@/contexts/AuthContext";
import Breadcrumb from "@/components/BreadCrumb";

const AdminProjectDetails = () => {
  const { projectId } = useParams();
  const { userRole } = useAuth();
  const navigate = useNavigate();

  const [project, setProject] = useState<any>(null);
  const [milestones, setMilestones] = useState([]);
  const [taskStats, setTaskStats] = useState({ total: 0, completed: 0 });

  const milestoneRef = useRef<CreateMilestoneDialogRef>(null);

  // Fetch milestones
  const fetchMilestones = async () => {
    if (!projectId) return;
    try {
      const snapshot = await getDocs(
        collection(db, "projects", projectId, "milestones")
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

  // Fetch milestones on mount or when projectId changes
  useEffect(() => {
    fetchMilestones();
  }, [projectId]);

  // Fetch project details with task stats
  useEffect(() => {
    const fetchProjectWithStats = async () => {
      if (!projectId) return;
      try {
        const docRef = doc(db, "projects", projectId);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setProject({ id: snap.id, ...snap.data() });
        }

        // Calculate task statistics
        const milestonesRef = collection(db, "projects", projectId, "milestones");
        const milestonesSnap = await getDocs(milestonesRef);

        let totalTasks = 0;
        let completedTasks = 0;

        await Promise.all(
          milestonesSnap.docs.map(async (milestoneDoc) => {
            const tasksRef = collection(
              db,
              "projects",
              projectId,
              "milestones",
              milestoneDoc.id,
              "tasks"
            );
            const tasksSnap = await getDocs(tasksRef);

            const tasks = tasksSnap.docs
              .map((taskDoc) => taskDoc.data())
              .filter((task) => !task.isDeleted);

            totalTasks += tasks.length;
            completedTasks += tasks.filter((task) => task.status === "Completed").length;
          })
        );

        setTaskStats({ total: totalTasks, completed: completedTasks });
      } catch (err) {
        console.error("Error fetching project:", err);
      }
    };

    fetchProjectWithStats();
  }, [projectId]);

  if (!project) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center mb-6">
        {/* Back Button */}
        {/* <Button variant="outline" onClick={() => navigate("/dashboard")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button> */}
        {/* Create Milestone Button */}
        {userRole !== "designer" && (
          <Button
            className="flex items-center"
            onClick={() => milestoneRef.current?.openDialog()}
          >
            + Add Milestone
          </Button>
        )}
      </div>

      <Breadcrumb
        paths={[
          { name: "Projects", to: "/dashboard" },
          { name: project.name, to: `/project/${project.id}` },
        ]}
      />

      {/* Create/Edit Milestone Dialog */}
      <CreateMilestoneDialog
        ref={milestoneRef}
        projectId={project.id}
        projectName={project.name}
        clientId={project.clientId}
        clientName={project.clientName}
        onMilestoneCreated={fetchMilestones}
      />

      {/* Project Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Project Overview</CardTitle>
        </CardHeader>
        <CardContent>
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
                    {taskStats.completed}/{taskStats.total}
                  </p>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{width: `${taskStats.total > 0 ? (taskStats.completed / taskStats.total) * 100 : 0}%`}}
                    ></div>
                  </div>

                  <div className="flex items-center gap-2 mt-6">
                    <TimerIcon className="w-5 h-5 text-red-600" />
                    <span className="text-sm font-medium">Due Date</span>
                  </div>
                  <p className="text-2xl font-bold">
                    {project.endDate ? new Date(project.endDate?.seconds * 1000).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Project Info */}
            <Card className="md:col-span-3 h-full">
              <CardContent className="p-4 h-full">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-2">
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
                    <p className="text-sm text-gray-500">Progress</p>
                    <p className="text-sm font-medium text-gray-900">
                      {project.progress}%
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Start Date</p>
                    <p className="text-sm font-medium text-gray-900">
                      {project.startDate ? new Date(project.startDate?.seconds * 1000).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">End Date</p>
                    <p className="text-sm font-medium text-gray-900">
                      {project.endDate ? new Date(project.endDate?.seconds * 1000).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Designer</p>
                    <p className="text-sm font-medium text-gray-900">
                      {project.designer}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Service Type</p>
                    <p className="text-sm font-medium text-gray-900">
                      {project.serviceType || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Amount Paid</p>
                    <p className="text-sm font-medium text-gray-900">
                      ₹{project.paidAmount?.toLocaleString() || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Milestone Cards */}
      <MilestoneCards
        project={{
          milestones: milestones.filter((milestone) => !milestone.isDeleted),
          name: project.name,
        }}
        projectId={project.id}
        projectName={project.name}
        milestoneDialogRef={milestoneRef}
        onMilestoneCreated={fetchMilestones}
      />
    </div>
  );
};

export default AdminProjectDetails;
