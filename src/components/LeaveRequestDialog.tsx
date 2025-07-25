import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  Timestamp,
} from "firebase/firestore";
import { Label } from "@/components/ui/label";
import { CalendarDays } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const LeaveRequestDialog = () => {
  const { user, userRole } = useAuth();

  const [open, setOpen] = useState(false);
  const [leaveTitle, setLeaveTitle] = useState("");
  const [leaveType, setLeaveType] = useState("medical");
  const [leaveFrom, setLeaveFrom] = useState("");
  const [leaveTo, setLeaveTo] = useState("");
  const [reason, setReason] = useState("");
  const [proofUrl, setProofUrl] = useState("");

  const [errors, setErrors] = useState({
    leaveTitle: "",
    leaveFrom: "",
    leaveTo: "",
    reason: "",
    proofUrl: "",
  });

  const handleRequestLeave = async () => {
    const urlRegex =
      /^(https?:\/\/)([\w\-]+\.)+[\w\-]{2,}(\/[\w\-._~:/?#[\]@!$&'()*+,;=]*)?$/;
    if (!urlRegex.test(proofUrl.trim())) {
      toast({
        title: "Missing required fields",
        description: "Please provide proper url before submitting.",
        variant: "destructive",
      });
      return;
    }
    const newErrors = {
      leaveTitle: leaveTitle ? "" : "Title is required",
      leaveFrom: leaveFrom ? "" : "Start date is required",
      leaveTo: leaveTo ? "" : "End date is required",
      reason: reason ? "" : "Reason is required",
      proofUrl:
        leaveType === "medical" && !proofUrl ? "Proof URL is required" : "",
    };

    setErrors(newErrors);

    const hasErrors = Object.values(newErrors).some((msg) => msg !== "");
    if (hasErrors) return;

    if (!user?.uid) return;

    const payload = {
      title: leaveTitle,
      leaveType,
      leaveFrom,
      leaveTo,
      reason,
      proofUrl: leaveType === "medical" ? proofUrl : null,
      status: "Pending",
      createdAt: new Date(),
      userId: user.uid,
      requestedBy: user.displayName || user.email || "Unknown",
      role: userRole,
    };

    try {
      await addDoc(collection(db, `users/${user.uid}/leaveRequests`), payload);

      const adminSnap = await getDocs(
        query(collection(db, "users"), where("role", "==", "admin"))
      );

      for (const admin of adminSnap.docs) {
        await addDoc(collection(db, `users/${admin.id}/notifications`), {
          message: `Leave request from ${payload.requestedBy}`,
          type: "leave-request",
          read: false,
          createdAt: Timestamp.now(),
        });
      }

      // Reset form
      setOpen(false);
      setLeaveTitle("");
      setLeaveType("medical");
      setLeaveFrom("");
      setLeaveTo("");
      setReason("");
      setProofUrl("");
      setErrors({
        leaveTitle: "",
        leaveFrom: "",
        leaveTo: "",
        reason: "",
        proofUrl: "",
      });
    } catch (err) {
      console.error("Error submitting leave request:", err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-1 sm:gap-2 text-sm sm:text-base px-3 sm:px-4 py-2">
          <span>Request Leave</span>
          <CalendarDays className="w-4 h-4 sm:w-5 sm:h-5" />
        </Button>
      </DialogTrigger>

      <DialogContent className="w-[calc(100vw-2rem)] max-w-md mx-auto max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="space-y-2 pb-4">
          <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <CalendarDays className="w-5 h-5 text-blue-600" />
            Request Leave
          </DialogTitle>
          <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
            Apply 1 week before. Proof is mandatory for medical leave approval.
          </p>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-5">
          {/* Title Field */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">
              Title <span className="text-red-500">*</span>
            </Label>
            <Input
              value={leaveTitle}
              onChange={(e) => setLeaveTitle(e.target.value)}
              placeholder="Leave for medical reason"
              className="text-sm h-10 sm:h-11"
            />
            {errors.leaveTitle && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                {errors.leaveTitle}
              </p>
            )}
          </div>

          {/* Leave Type Field */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">
              Leave Type
            </Label>
            <select
              value={leaveType}
              onChange={(e) => setLeaveType(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 sm:py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="medical">Medical Leave</option>
              <option value="casual">Casual Leave</option>
              <option value="full-day">Full Day Leave</option>
              <option value="half-day">Half Day Leave</option>
              <option value="wfh">Work From Home</option>
            </select>
          </div>

          {/* Date Range Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                From Date <span className="text-red-500">*</span>
              </Label>
              <Input
                type="date"
                value={leaveFrom}
                onChange={(e) => setLeaveFrom(e.target.value)}
                className="text-sm h-10 sm:h-11"
              />
              {errors.leaveFrom && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                  {errors.leaveFrom}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                To Date <span className="text-red-500">*</span>
              </Label>
              <Input
                type="date"
                value={leaveTo}
                onChange={(e) => setLeaveTo(e.target.value)}
                className="text-sm h-10 sm:h-11"
              />
              {errors.leaveTo && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                  {errors.leaveTo}
                </p>
              )}
            </div>
          </div>

          {/* Reason Field */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">
              Reason <span className="text-red-500">*</span>
            </Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Describe your reason for leave..."
              className="text-sm min-h-[80px] sm:min-h-[100px] resize-none"
              rows={3}
            />
            {errors.reason && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                {errors.reason}
              </p>
            )}
          </div>

          {/* Conditional Proof URL Field */}
          {leaveType === "medical" && (
            <div className="space-y-2 p-3 sm:p-4 bg-blue-50 rounded-lg border border-blue-200">
              <Label className="text-sm font-medium text-gray-700">
                Medical Proof URL <span className="text-red-500">*</span>
              </Label>
              <Input
                type="url"
                value={proofUrl}
                onChange={(e) => setProofUrl(e.target.value)}
                placeholder="https://drive.google.com/your-medical-report"
                className="text-sm h-10 sm:h-11 bg-white"
              />
              <p className="text-xs text-blue-700">
                Upload your medical certificate or report to a cloud service and
                paste the sharing link here.
              </p>
              {errors.proofUrl && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                  {errors.proofUrl}
                </p>
              )}
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-2">
            <Button
              onClick={handleRequestLeave}
              className="w-full h-11 sm:h-12 text-sm sm:text-base font-medium bg-blue-600 hover:bg-blue-700 transition-colors duration-200"
            >
              Submit Leave Request
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LeaveRequestDialog;
