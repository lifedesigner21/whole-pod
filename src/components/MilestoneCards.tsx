import React, { useState, useEffect, useRef, MutableRefObject } from "react";
import {
  Calendar,
  User,
  IndianRupee,
  FileText,
  MessageSquare,
  Pencil,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatDate } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  addDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import ChatInput from "./ChatInput";
import CreateMilestoneDialog, {
  CreateMilestoneDialogRef,
} from "./CreateMilestoneDialog";

interface Subtask {
  title: string;
  done: boolean;
}

interface Task {
  title: string;
  assignedTo: string;
  status: string;
  subtasks: Subtask[];
}

interface Milestone {
  id: string;
  name: string;
  description: string;
  podDesigner: string;
  client: string;
  startDate: string;
  endDate: string;
  status: string;
  amount: number;
  tasks: Task[];
  progress: number;
  projectName?: string;
}

interface MilestoneCardsProps {
  projectId: string;
  project: {
    milestones: Milestone[];
    name?: string;
  };
  projectName?: string;
  milestoneDialogRef: MutableRefObject<CreateMilestoneDialogRef | null>; // ✅ Add this line
  onMilestoneCreated: () => void;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "Completed":
      return "bg-green-100 text-green-800";
    case "Pending":
      return "bg-yellow-100 text-yellow-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const MilestoneCards: React.FC<MilestoneCardsProps> = ({
  project,
  projectId,
  projectName,
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(
    null
  );
  const [invoiceUrl, setInvoiceUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openChatId, setOpenChatId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<Record<string, any[]>>({});

  const navigate = useNavigate();
  const { user, userRole } = useAuth();

  const milestoneDialogRef = useRef<CreateMilestoneDialogRef>(null);

  const handleAddInvoice = (milestone: Milestone) => {
    setSelectedMilestone(milestone);
    setIsDialogOpen(true);
    setInvoiceUrl("");
  };

  const handleEditMilestone = (milestone: Milestone) => {
    milestoneDialogRef.current?.openDialog(milestone);
  };

  const handleSubmitInvoice = async () => {
    if (!selectedMilestone || !invoiceUrl.trim()) return;
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, "invoiceUrls"), {
        url: invoiceUrl.trim(),
        milestoneId: selectedMilestone.id,
        milestoneName: selectedMilestone.name,
        amount: selectedMilestone.amount,
        projectId,
        projectName: selectedMilestone.projectName || "Unknown Project",
        createdAt: new Date().toISOString(),
      });
      setIsDialogOpen(false);
      setInvoiceUrl("");
      setSelectedMilestone(null);
    } catch (error) {
      console.error("Error saving invoice URL:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (!openChatId) return;

    const chatQuery = query(
      collection(db, `projects/${projectId}/milestones/${openChatId}/messages`),
      orderBy("timestamp", "asc")
    );

    const unsubscribe = onSnapshot(chatQuery, (snapshot) => {
      setChatMessages((prev) => ({
        ...prev,
        [openChatId]: snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })),
      }));
    });

    return () => unsubscribe();
  }, [openChatId, projectId]);

  if (!project?.milestones?.length) {
    return <p className="text-gray-500 mt-4">No milestones added yet.</p>;
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {project.milestones.map((milestone) => {
          const isChatOpen = openChatId === milestone.id;
          const messages = chatMessages[milestone.id] || [];
          const status = milestone.progress === 100 ? "Completed" : "Pending";

          return (
            <Card key={milestone.id} className="hover:shadow-md transition">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900 flex justify-between items-center">
                  {milestone.name}
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${getStatusColor(
                        status
                      )}`}
                    >
                      {status}
                    </span>

                    {userRole !== "designer" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditMilestone(milestone)}
                      >
                        <Pencil className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    )}
                  </div>
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-2 text-sm text-gray-700">
                <p>{milestone.description}</p>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Client: {milestone.client}
                </div>
                {userRole !== "designer" && (
                  <div className="flex items-center gap-2">
                    <IndianRupee className="w-4 h-4" />
                    Amount: ₹{milestone.amount}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Pod Designer: {milestone.podDesigner}
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Start: {formatDate(milestone.startDate)}
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  End: {formatDate(milestone.endDate)}
                </div>

                <div className="mt-2">
                  <span className="text-xs text-gray-600">Progress</span>
                  <Progress
                    value={milestone.progress || 0}
                    className="h-2 mt-1"
                  />
                </div>

                <div className="flex gap-2 mt-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() =>
                      navigate(
                        `/project/${projectId}/milestone/${milestone.id}`
                      )
                    }
                  >
                    View Progress
                  </Button>

                  {/* <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setOpenChatId(milestone.id)}
                  >
                    <MessageSquare className="w-4 h-4" />
                  </Button> */}

                  {userRole !== "designer" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddInvoice(milestone)}
                    >
                      <FileText className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
              {/* 
              <Sheet open={isChatOpen} onOpenChange={() => setOpenChatId(null)}>
                <SheetContent side="right" className="w-full max-w-md p-6">
                  <SheetHeader>
                    <SheetTitle>Milestone Chat</SheetTitle>
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
                            <span className="text-xs text-gray-500 italic mb-1">
                              {msg.role}
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

                    <ChatInput
                      projectId={projectId}
                      milestoneId={milestone.id}
                    />
                  </div>
                </SheetContent>
              </Sheet> */}
            </Card>
          );
        })}
      </div>

      {/* Invoice Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Invoice Link</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Label htmlFor="milestone-name">Milestone</Label>
            <Input
              id="milestone-name"
              value={selectedMilestone?.name || ""}
              disabled
              className="bg-gray-50"
            />
            <Label htmlFor="invoice-url">Invoice URL</Label>
            <Input
              id="invoice-url"
              type="url"
              placeholder="https://example.com/invoice"
              value={invoiceUrl}
              onChange={(e) => setInvoiceUrl(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmitInvoice}
                disabled={!invoiceUrl.trim() || isSubmitting}
              >
                {isSubmitting ? "Saving..." : "Save Invoice"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reusable Milestone Dialog for Edit/Create */}
      <CreateMilestoneDialog
        ref={milestoneDialogRef}
        projectId={projectId}
        projectName={projectName || project.name || ""}
        onMilestoneCreated={() => {}}
      />
    </>
  );
};

export default MilestoneCards;
