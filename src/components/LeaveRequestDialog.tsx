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

const LeaveRequestDialog = () => {
  const { user, userRole } = useAuth();

  const [open, setOpen] = useState(false);
  const [leaveTitle, setLeaveTitle] = useState("");
  const [leaveType, setLeaveType] = useState("medical");
  const [leaveFrom, setLeaveFrom] = useState("");
  const [leaveTo, setLeaveTo] = useState("");
  const [reason, setReason] = useState("");
  const [proofUrl, setProofUrl] = useState("");

  const handleRequestLeave = async () => {
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
      // 1. Save leave request
      await addDoc(collection(db, `users/${user.uid}/leaveRequests`), payload);

      // 2. Notify admins
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

      // 3. Reset and close dialog
      setOpen(false);
      setLeaveTitle("");
      setLeaveType("medical");
      setLeaveFrom("");
      setLeaveTo("");
      setReason("");
      setProofUrl("");
    } catch (err) {
      console.error("Error submitting leave request:", err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="ml-4">
          Request Leave
          <CalendarDays />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Request Leave
          </DialogTitle>
          <span className="text-sm text-grey">
            Apply 1 week before, proof is mandatory for Leave approval
          </span>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label>Title</Label>
            <Input
              value={leaveTitle}
              onChange={(e) => setLeaveTitle(e.target.value)}
              placeholder="Leave for medical reason"
              required={true}
            />
          </div>

          <div>
            <Label>Leave Type</Label>
            <select
              value={leaveType}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setLeaveType(e.target.value)
              }
              className="w-full border rounded px-3 py-2 mt-1"
              required={true}
            >
              <option value="medical">Medical</option>
              <option value="casual">Casual</option>
              <option value="full-day">Full Day</option>
              <option value="half-day">Half Day</option>
              <option value="wfh">Work From Home</option>
            </select>
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <Label>From</Label>
              <Input
                type="date"
                value={leaveFrom}
                onChange={(e) => setLeaveFrom(e.target.value)}
                required={true}
              />
            </div>
            <div className="flex-1">
              <Label>To</Label>
              <Input
                type="date"
                value={leaveTo}
                onChange={(e) => setLeaveTo(e.target.value)}
                required={true}
              />
            </div>
          </div>

          <div>
            <Label>Reason</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Describe your reason for leave"
              required={true}
            />
          </div>

          {leaveType === "medical" && (
            <div>
              <Label>Proof (URL)</Label>
              <Input
                type="url"
                value={proofUrl}
                onChange={(e) => setProofUrl(e.target.value)}
                placeholder="e.g., https://drive.google.com/medical-report"
                required={leaveType === "medical"}
              />
            </div>
          )}

          <Button onClick={handleRequestLeave} className="w-full mt-2">
            Submit Leave Request
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LeaveRequestDialog;
