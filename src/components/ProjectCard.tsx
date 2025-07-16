import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Calendar, User, MessageSquare, IndianRupee, Trash2 } from "lucide-react";
import { Project } from "@/data/mockData";
import { formatDate } from "@/lib/utils";
import { doc, getDocs, updateDoc, collection } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface ProjectCardProps {
  project: Project;
  onViewDetails: (projectId: string) => void;
  showClientInfo?: boolean;
  showDesignerInfo?: boolean;
  onDelete?: (projectId: string) => void;
}

const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  onViewDetails,
  showClientInfo = true,
  showDesignerInfo = true,
  onDelete,
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "bg-green-100 text-green-800 hover:bg-green-200";
      case "On Hold":
        return "bg-red-100 text-red-800 hover:bg-red-200";
      case "Completed":
        return "bg-blue-100 text-blue-800 hover:bg-blue-200";
      case "At Risk":
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-200";
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-200";
    }
  };
  console.log(showDesignerInfo, "showDesignerInfo");

  // 🟢 Embedded logic to update project progress from milestones
  const handleViewDetailsAndUpdateProgress = async () => {
    try {
      const milestonesSnapshot = await getDocs(
        collection(db, `projects/${project.id}/milestones`)
      );

      const totalMilestones = milestonesSnapshot.size;
      if (totalMilestones === 0) return onViewDetails(project.id);

      const totalProgress = milestonesSnapshot.docs.reduce((sum, doc) => {
        const data = doc.data();
        return sum + (data.progress || 0);
      }, 0);

      const averageProgress = Math.round(totalProgress / totalMilestones);

      // ✅ Update project progress in Firestore
      const projectRef = doc(db, `projects/${project.id}`);
      await updateDoc(projectRef, { progress: averageProgress });

      console.log(`✅ Updated project progress to ${averageProgress}%`);
    } catch (error) {
      console.error("❌ Error updating project progress:", error);
    }

    // 🔁 Navigate to project details
    onViewDetails(project.id);
  };

  return (
    <Card className="hover:shadow-lg transition-shadow duration-200">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg font-semibold text-gray-900">
            {project.name}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge className={getStatusColor(project.status)}>
              {project.status}
            </Badge>
            {onDelete && (
              <button
                onClick={() => onDelete(project.id)}
                className="text-muted-foreground hover:text-destructive transition-colors"
                aria-label="Delete project"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Progress</span>
            <span className="font-medium">{project.progress}%</span>
          </div>
          <Progress value={project.progress} className="h-2" />
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <div className="flex justify-between text-gray-600 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>Start: {formatDate(project.startDate)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>End: {formatDate(project.endDate)}</span>
              </div>
            </div>
            {showClientInfo && (
              <div className="flex items-center gap-2 text-gray-600">
                <User className="w-4 h-4" />
                <span>Client: {project.client}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-gray-600">
              <User className="w-4 h-4" />
              <span>POC: {project.designer}</span>
            </div>
          </div>

          <div className="space-y-2">
            {/* <div className="text-gray-600">
              <div className="flex items-center gap-2">
                <IndianRupee className="w-4 h-4" />
                <span>Total Amount: ₹{project.totalAmount.toLocaleString()}</span>
              </div>
            </div> */}
            {project.pendingFeedback.length > 0 && (
              <div className="flex items-center gap-2 text-orange-600">
                <MessageSquare className="w-4 h-4" />
                <span>{project.pendingFeedback.length} pending</span>
              </div>
            )}
          </div>
        </div>

        <div className="pt-2">
          <Button
            onClick={handleViewDetailsAndUpdateProgress}
            className="w-full"
            variant="outline"
          >
            View Detailed Progress
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProjectCard;
