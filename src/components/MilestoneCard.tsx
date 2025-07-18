import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  User,
  MessageSquare,
  FileText,
  ListChecks,
} from "lucide-react";
import { Milestone } from "@/data/mockData";
import { formatDate } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import ChatInput from "./ChatInput";
import { useChatMessages } from "@/hooks/useChatMessages";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

interface MilestoneCardProps {
  milestone: Milestone;
  projectId: string;
  isClient?: boolean;
}

const MilestoneCard: React.FC<MilestoneCardProps> = ({
  milestone,
  projectId,
  isClient = false,
}) => {
  const subtaskCount = milestone.tasks?.length ?? 0;
  const revisionsUsed = milestone.revisionsUsed ?? 0;
  const [openChat, setOpenChat] = useState(false);
  const [chatTarget, setChatTarget] = useState<"admin-client" | "admin-designer" | null>(null);

  const { user, userRole } = useAuth();
  const navigate = useNavigate();

  const messages = useChatMessages(projectId, milestone.id, undefined, chatTarget);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Completed":
        return "bg-green-100 text-green-800";
      case "In Progress":
        return "bg-blue-100 text-blue-800";
      case "Pending":
        return "bg-gray-100 text-gray-800";
      case "Revision Required":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case "Paid":
        return "bg-green-100 text-green-800";
      case "Pending":
        return "bg-yellow-100 text-yellow-800";
      case "Overdue":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleOpenChat = () => {
    if (userRole === "admin") {
      // Let admin choose chat target
      const choice = window.prompt("Type '1' for Client Chat or '2' for Designer Chat");
      if (choice === "1") {
        setChatTarget("admin-client");
        setOpenChat(true);
      } else if (choice === "2") {
        setChatTarget("admin-designer");
        setOpenChat(true);
      }
    } else if (userRole === "designer") {
      setChatTarget("admin-designer");
      setOpenChat(true);
    } else if (userRole === "client") {
      setChatTarget("admin-client");
      setOpenChat(true);
    }
  };

  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start">
            <CardTitle className="text-lg font-semibold">
              {milestone.name}
            </CardTitle>
            <div className="flex gap-2">
              <Badge className={getStatusColor(milestone.status)}>
                {milestone.status}
              </Badge>
              <Badge className={getPaymentStatusColor(milestone.paymentStatus)}>
                ₹{(milestone.amount ?? 0).toLocaleString()}
              </Badge>
            </div>
          </div>
          <p className="text-gray-600 text-sm mt-2">{milestone.description}</p>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>
                Start: {milestone.startDate ? formatDate(milestone.startDate) : "N/A"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>
                Due: {milestone.endDate ? formatDate(milestone.endDate) : "N/A"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4" />
              <span>{milestone.podDesigner}</span>
            </div>
            <div className="flex items-center gap-2">
              <ListChecks className="w-4 h-4" />
              <span>Tasks: {subtaskCount}</span>
            </div>
          </div>

          <div className="flex justify-between items-center text-sm text-gray-700 mt-2">
            <span>Revisions: {revisionsUsed}</span>
            {/* <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-1"
              onClick={handleOpenChat}
            >
              <MessageSquare className="w-4 h-4" />
              Chat
            </Button> */}
          </div>

          {subtaskCount > 0 ? (
            <Button
              variant="default"
              size="sm"
              onClick={() =>
                navigate(
                  `/client/project/${projectId}/milestone/${milestone.id}/tasks`
                )
              }
            >
              View Tasks
            </Button>
          ) : (
            <p className="text-sm text-red-500 italic">No tasks available</p>
          )}
        </CardContent>
      </Card>

      <Sheet open={openChat} onOpenChange={setOpenChat}>
        <SheetContent side="right" className="w-full max-w-md p-6">
          <SheetHeader>
            <SheetTitle>{milestone.name}</SheetTitle>
          </SheetHeader>
          <div className="mt-4 flex flex-col gap-4 h-full">
            <div className="flex-1 overflow-y-auto space-y-4 bg-gray-50 p-3 rounded">
              {messages.map((msg) => {
                const date = msg.timestamp?.toDate?.();
                const time = date
                  ? new Intl.DateTimeFormat("en-US", {
                      hour: "numeric",
                      minute: "numeric",
                      hour12: true,
                    }).format(date)
                  : "";

                const isOwnMessage = msg.sender === user?.displayName;

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      isOwnMessage ? "items-end" : "items-start"
                    }`}
                  >
                    <span className="text-xs text-gray-700 italic mb-1">
                      {msg.role.charAt(0).toUpperCase() + msg.role.slice(1)}
                    </span>
                    <div
                      className={`w-fit max-w-[80%] p-3 rounded-lg shadow-sm text-sm ${
                        isOwnMessage
                          ? "bg-blue-100 text-right ml-auto"
                          : "bg-white text-left"
                      }`}
                    >
                      <div className="font-semibold text-gray-800 text-sm mb-1">
                        {msg.sender}
                      </div>
                      <div className="text-black whitespace-pre-wrap">
                        {msg.content}
                      </div>
                      {time && (
                        <div className="text-[11px] text-gray-500 mt-2">
                          {time}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 👇 Updated ChatInput to accept chatTarget */}
            {chatTarget && (
              <ChatInput
                projectId={projectId}
                milestoneId={milestone.id}
                chatTarget={chatTarget}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default MilestoneCard;
