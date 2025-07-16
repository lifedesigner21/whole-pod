
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Star, Clock, CheckCircle, RotateCcw } from 'lucide-react';

interface PerformanceWidgetProps {
  data: {
    clientRating: number;
    pmRating: number;
    onTimeDelivery: number;
    avgRevisions: number;
  };
}

const PerformanceWidget: React.FC<PerformanceWidgetProps> = ({ data }) => {
  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
            }`}
          />
        ))}
        <span className="ml-2 text-sm font-medium">{rating.toFixed(1)}</span>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Performance Snapshot</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Star className="w-4 h-4" />
              <span>Client Rating</span>
            </div>
            {renderStars(data.clientRating)}
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Star className="w-4 h-4" />
              <span>Project Manager Rating</span>
            </div>
            {renderStars(data.pmRating)}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <CheckCircle className="w-4 h-4" />
                <span>On-Time Delivery</span>
              </div>
              <span className="text-sm font-medium">{data.onTimeDelivery}%</span>
            </div>
            <Progress value={data.onTimeDelivery} className="h-2" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <RotateCcw className="w-4 h-4" />
                <span>Avg. Revisions per Task</span>
              </div>
              <span className="text-sm font-medium">{data.avgRevisions}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full" 
                style={{ width: `${Math.min(data.avgRevisions * 20, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PerformanceWidget;
