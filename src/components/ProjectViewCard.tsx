import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, TimerIcon } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface ProjectOverviewCardProps {
  project: {
    name: string;
    client: string;
    designer: string;
    startDate: any;
    endDate: any;
    progress: number;
    serviceType?: string;
    figmaUrl?: string;
    assetsLink?: string;
  };
  clientEmail: string;
  completedTasks: number;
  tasks: { isDeleted?: boolean }[];
}

export const ProjectOverviewCard: React.FC<ProjectOverviewCardProps> = ({
  project,
  clientEmail,
  completedTasks,
  tasks,
}) => {
  const totalTasks = tasks.filter((task) => !task.isDeleted).length;
  const completionPercent = (completedTasks / (totalTasks || 1)) * 100;

  return (
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
              {completedTasks}/{totalTasks}
            </p>
            <Progress value={completionPercent} className="h-2 mt-2" />

            <div className="flex items-center gap-2 mt-6">
              <TimerIcon className="w-5 h-5 text-red-600" />
              <span className="text-sm font-medium">Due Date</span>
            </div>
            <p className="text-2xl font-bold">{formatDate(project.endDate)}</p>
          </div>
        </CardContent>
      </Card>

      {/* Project Info */}
      <Card className="md:col-span-2 h-full">
        <CardContent className="p-4 h-full">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
            <InfoItem label="Project Name" value={project.name} />
            <InfoItem label="Client" value={project.client} />
            {/* <InfoItem label="Client Email" value={clientEmail} /> */}
            <InfoItem
              label="Start Date"
              value={formatDate(project.startDate)}
            />
            <InfoItem label="End Date" value={formatDate(project.endDate)} />
            <InfoItem label="Designer" value={project.designer} />
            <InfoItem label="Progress" value={`${project.progress}%`} />
            <InfoItem
              label="Service Type"
              value={project.serviceType || "N/A"}
            />
            <InfoItem
              label="Figma Link"
              value={
                <a
                  href={project.figmaUrl}
                  className="text-blue-500 underline"
                  target="_blank"
                >
                  View
                </a>
              }
            />
            <InfoItem
              label="Assets"
              value={
                <a
                  href={project.assetsLink}
                  className="text-blue-500 underline"
                  target="_blank"
                >
                  View
                </a>
              }
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const InfoItem = ({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) => (
  <div>
    <p className="text-sm text-gray-500">{label}</p>
    <p className="text-sm font-medium text-gray-900">{value}</p>
  </div>
);
