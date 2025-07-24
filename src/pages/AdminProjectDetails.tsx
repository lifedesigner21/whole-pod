import { useParams, useNavigate } from "react-router-dom";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useEffect, useRef, useState } from "react";
import MilestoneCards from "@/components/MilestoneCards";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import CreateMilestoneDialog, {
  CreateMilestoneDialogRef,
} from "@/components/CreateMilestoneDialog";
import { useAuth } from "@/contexts/AuthContext";

const AdminProjectDetails = () => {
  const { projectId } = useParams();
  const { userRole } = useAuth();
  const navigate = useNavigate();

  const [project, setProject] = useState<any>(null);
  const [milestones, setMilestones] = useState([]);

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

  // Fetch project details
  useEffect(() => {
    const fetchProject = async () => {
      if (!projectId) return;
      try {
        const docRef = doc(db, "projects", projectId);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setProject({ id: snap.id, ...snap.data() });
        }
      } catch (err) {
        console.error("Error fetching project:", err);
      }
    };

    fetchProject();
  }, [projectId]);

  if (!project) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 space-y-4">
      {/* Back Button */}
      <Button variant="outline" onClick={() => navigate("/dashboard")}>
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Dashboard
      </Button>

      {/* Create Milestone Button */}
      {userRole !== "designer" && (
        <Button
          className="flex items-center"
          onClick={() => milestoneRef.current?.openDialog()}
        >
          + Add Milestone
        </Button>
      )}

      {/* Create/Edit Milestone Dialog */}
      <CreateMilestoneDialog
        ref={milestoneRef}
        projectId={project.id}
        projectName={project.name}
        clientId={project.clientId}
        clientName={project.clientName}
        onMilestoneCreated={fetchMilestones}
      />

      <h2 className="text-xl font-semibold">Project: {project.name}</h2>
      {/* <p className="text-sm text-gray-600">{project.brief}</p> */}

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
