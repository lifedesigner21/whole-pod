import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Calendar, CheckCircle, Clock, MessageSquare } from "lucide-react";

interface TaskStats {
  total: number;
  completed: number;
  pending: number;
}

interface TodaysSummaryCardProps {
  taskStats: TaskStats;
  pendingFeedback: number;
  totalRevisions?: number;
}

const TodaysSummaryCard: React.FC<TodaysSummaryCardProps> = ({
  taskStats,
  pendingFeedback,
  totalRevisions,
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Today's Summary
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Completed / Total Tasks */}
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {taskStats.completed}
            </p>
            <p className="text-sm text-gray-600">Today's New Task</p>
          </div>

          {/* Pending Tasks */}
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Clock className="w-8 h-8 text-yellow-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {taskStats.pending}
            </p>
            <p className="text-sm text-gray-600">Pending Tasks</p>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <CheckCircle className="w-8 h-8 text-yellow-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{totalRevisions}</p>
            <p className="text-sm text-gray-600">Revision</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TodaysSummaryCard;
