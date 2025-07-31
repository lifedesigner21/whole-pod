import { useState, useEffect } from "react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/firebase";
import {
  doc,
  updateDoc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  addDoc,
  Timestamp,
} from "firebase/firestore";

interface CreateSubtaskDialogProps {
  projectId: string;
  milestoneId: string;
  taskId: string;
}

interface DepartmentUser {
  id: string;
  name: string;
  role: string;
}

const statusOptions = ["To Do", "In Progress", "In Review", "Completed"];

const CreateSubtaskDialog: React.FC<CreateSubtaskDialogProps> = ({
  projectId,
  milestoneId,
  taskId,
}) => {
  const [open, setOpen] = useState(false);
  const [departmentUsers, setDepartmentUsers] = useState<DepartmentUser[]>([]);
  const [form, setForm] = useState({
    name: "",
    brief: "",
    designerId: "",
    estimatedHours: "",
    startDate: "",
    endDate: "",
    status: "To Do",
  });

  useEffect(() => {
    const fetchDepartmentUsers = async () => {
      try {
        const [designerSnap, developerSnap, legalSnap] = await Promise.all([
          getDocs(
            query(collection(db, "users"), where("role", "==", "designer"))
          ),
          getDocs(
            query(collection(db, "users"), where("role", "==", "developer"))
          ),
          getDocs(
            query(collection(db, "users"), where("role", "==", "legalteam"))
          ),
        ]);

        const allUsers = [
          ...designerSnap.docs,
          ...developerSnap.docs,
          ...legalSnap.docs,
        ].map((doc) => ({
          id: doc.id,
          name: doc.data().name || "Unnamed",
          role: doc.data().role || "unknown",
        }));

        setDepartmentUsers(allUsers);
      } catch (err) {
        console.error("Error fetching department users:", err);
      }
    };

    fetchDepartmentUsers();
  }, []);

  const handleSubmit = async () => {
    const selectedUser = departmentUsers.find((d) => d.id === form.designerId);

    const subtask = {
      ...form,
      estimatedHours: Number(form.estimatedHours),
      isApproved: false,
      designerName: selectedUser?.name || "",
    };

    const taskRef = doc(
      db,
      `projects/${projectId}/milestones/${milestoneId}/tasks/${taskId}`
    );
    const taskSnap = await getDoc(taskRef);

    if (taskSnap.exists()) {
      const taskData = taskSnap.data();
      const existingSubtasks = taskData.subtasks || [];
      await updateDoc(taskRef, {
        subtasks: [...existingSubtasks, subtask],
      });
    }

    // 🔔 Send notifications
    const notifications = [
      {
        userId: form.designerId,
        message: `You have been assigned a new subtask: ${form.name}.`,
      },
    ];

    for (const notif of notifications) {
      await addDoc(collection(db, `users/${notif.userId}/notifications`), {
        message: notif.message,
        type: "subtask",
        read: false,
        createdAt: Timestamp.now(),
      });
    }

    const adminSnap = await getDocs(
      query(collection(db, "users"), where("role", "==", "admin"))
    );
    for (const docSnap of adminSnap.docs) {
      await addDoc(collection(db, `users/${docSnap.id}/notifications`), {
        message: `You have created a new subtask: ${form.name}.`,
        type: "subtask",
        read: false,
        createdAt: Timestamp.now(),
      });
    }

    // ✅ Reset form and close
    setOpen(false);
    setForm({
      name: "",
      brief: "",
      designerId: "",
      estimatedHours: "",
      startDate: "",
      endDate: "",
      status: "To Do",
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          + Create Subtask
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create Subtask</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Name</label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Estimated Hours</label>
            <Input
              type="number"
              value={form.estimatedHours}
              onChange={(e) =>
                setForm({ ...form, estimatedHours: e.target.value })
              }
            />
          </div>
          <div className="space-y-1 md:col-span-2">
            <label className="text-sm font-medium">Brief</label>
            <Textarea
              value={form.brief}
              onChange={(e) => setForm({ ...form, brief: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Assign To</label>
            <Select
              value={form.designerId}
              onValueChange={(val) => setForm({ ...form, designerId: val })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Team Member" />
              </SelectTrigger>
              <SelectContent className="z-50 max-h-[200px] overflow-y-auto">
                {departmentUsers.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name} ({d.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Start Date</label>
            <Input
              type="date"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">End Date</label>
            <Input
              type="date"
              value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Status</label>
            <Select
              value={form.status}
              onValueChange={(val) => setForm({ ...form, status: val })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Status" />
              </SelectTrigger>
              <SelectContent className="z-50">
                {statusOptions.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Add Subtask</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateSubtaskDialog;
