import { useState, useEffect } from "react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
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
import {
  addDoc,
  collection,
  getDocs,
  query,
  where,
  Timestamp,
  updateDoc,
  doc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

interface CreateTaskDialogProps {
  projectId: string;
  milestoneId: string;
  onTaskCreated?: () => void;
  onTaskUpdated?: () => void;
  taskToEdit?: any; // Pass the task object for editing
  projectName?: string;
  milestoneName?: string;
}

interface DepartmentUser {
  id: string;
  name: string;
  role: string;
}

const CreateTaskDialog: React.FC<CreateTaskDialogProps> = ({
  projectId,
  milestoneId,
  onTaskCreated,
  onTaskUpdated,
  taskToEdit,
}) => {
  const { userRole, user } = useAuth();
  const [departmentUsers, setDepartmentUsers] = useState<DepartmentUser[]>([]);
  const [form, setForm] = useState({
    title: "",
    description: "",
    startDate:"",
    dueDate: "",
    estimatedMinutes: "",
    priority: "Medium",
    status: "To Do",
    assignedTo: "",
  });
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const fetchDepartmentUsers = async () => {
      try {
        const [designerSnap, developerSnap, legalSnap, allowedSnap] = await Promise.all([
          getDocs(
            query(collection(db, "users"), where("role", "==", "designer"))
          ),
          getDocs(
            query(collection(db, "users"), where("role", "==", "developer"))
          ),
          getDocs(
            query(collection(db, "users"), where("role", "==", "legalteam"))
          ),
          getDocs(collection(db, "allowedUsers")),
        ]);

        const allowedEmails = new Set(
          allowedSnap.docs.map((doc) => doc.data().email?.toLowerCase())
        );

        const allUsers: DepartmentUser[] = [
          ...designerSnap.docs,
          ...developerSnap.docs,
          ...legalSnap.docs,
        ]
          .filter((doc) => allowedEmails.has(doc.data().email?.toLowerCase()))
          .map((doc) => ({
            id: doc.id,
            name: doc.data().name || "Unnamed",
            role: doc.data().role || "unknown",
          }));

        setDepartmentUsers(allUsers);
      } catch (error) {
        console.error("Error fetching department users:", error);
      }
    };

    fetchDepartmentUsers();
  }, []);

  // Pre-fill form if editing
  useEffect(() => {
    if (taskToEdit) {
      setForm({
        title: taskToEdit.title || "",
        description: taskToEdit.description || "",
        startDate: taskToEdit.startDate || "",
        dueDate: taskToEdit.dueDate || "",
        estimatedMinutes: taskToEdit.estimatedMinutes?.toString() || "",
        priority: taskToEdit.priority || "Medium",
        status: taskToEdit.status || "To Do",
        assignedTo: taskToEdit.assignedTo || "",
      });
      setOpen(true);
    }
  }, [taskToEdit]);

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      toast({
        title: "Missing required fields",
        description: "Please fill in all required fields before submitting.",
        variant: "destructive",
      });
      return;
    }

    if (!form.description.trim()) {
      toast({
        title: "Missing required fields",
        description: "Please fill in all required fields before submitting.",
        variant: "destructive",
      });
      return;
    }

    if (!form.dueDate) {
      toast({
        title: "Missing required fields",
        description: "Please fill in all required fields before submitting.",
        variant: "destructive",
      });
      return;
    }

    if (!form.estimatedMinutes || isNaN(Number(form.estimatedMinutes))) {
      toast({
        title: "Missing required fields",
        description: "Please fill in all required fields before submitting.",
        variant: "destructive",
      });
      return;
    }

    if (!form.assignedTo) {
      toast({
        title: "Missing required fields",
        description: "Please fill in all required fields before submitting.",
        variant: "destructive",
      });
      return;
    }
    const assignedUser = departmentUsers.find((d) => d.id === form.assignedTo);
    const taskData = {
      title: form.title,
      description: form.description,
      startDate: form.startDate,
      dueDate: form.dueDate,
      estimatedMinutes: parseInt(form.estimatedMinutes) || 0,
      priority: form.priority,
      status: form.status,
      assignedTo: form.assignedTo,
      assignedToName: assignedUser?.name || "Unknown",
      createdBy:user.uid
    };

    if (taskToEdit?.id) {
      const taskRef = doc(
        db,
        `projects/${projectId}/milestones/${milestoneId}/tasks/${taskToEdit.id}`
      );
      await updateDoc(taskRef, taskData);
      setOpen(false);
      onTaskUpdated?.();
    } else {
      const newTask = {
        ...taskData,
        actualMinutes: 0,
        createdAt: new Date().toISOString(),
        isApproved: false,
        subtasks: [],
        onHoldReason: "",
        projectId,
        milestoneId,
        isRevision: false,
        revisonCount: 0,
        revisionReasons: [],
        completedProof: "",
      };

      const taskDocRef = await addDoc(
        collection(db, `projects/${projectId}/milestones/${milestoneId}/tasks`),
        newTask
      );

      // 🔔 Notification
      await addDoc(collection(db, `users/${form.assignedTo}/notifications`), {
        message: `You have been assigned a new task: ${form.title}.`,
        type: "task",
        read: false,
        createdAt: Timestamp.now(),
      });

      const adminSnap = await getDocs(
        query(collection(db, "users"), where("role", "==", "admin"))
      );
      for (const docSnap of adminSnap.docs) {
        await addDoc(collection(db, `users/${docSnap.id}/notifications`), {
          message: `A new task was created: ${form.title} created by ${user.displayName}`,
          type: "task",
          read: false,
          createdAt: Timestamp.now(),
        });
      }

      setOpen(false);
      onTaskCreated?.();
    }

    setForm({
      title: "",
      description: "",
      startDate:"",
      dueDate: "",
      estimatedMinutes: "",
      priority: "Medium",
      status: "To Do",
      assignedTo: "",
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!taskToEdit && (
        <DialogTrigger asChild>
          {!["designer", "developer", "legalteam"].includes(userRole) && (
            <Button variant="default" onClick={() => setOpen(true)}>
              + Create Task
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {taskToEdit ? "Edit Task" : "Create New Task"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <label className="text-sm font-medium">Title</label>
          <Input
            placeholder="Title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />

          <label className="text-sm font-medium">Description</label>
          <Textarea
            placeholder="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />

          <label className="text-sm font-medium">Start Date</label>
          <Input
            type="date"
            value={form.startDate}
            onChange={(e) => setForm({ ...form, startDate: e.target.value })}
          />

          <label className="text-sm font-medium">End Date</label>
          <Input
            type="date"
            value={form.dueDate}
            onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
          />

          <label className="text-sm font-medium">
            Estimated Time (in minutes)
          </label>
          <Input
            type="number"
            min="1"
            placeholder="e.g. 90"
            value={form.estimatedMinutes}
            onChange={(e) =>
              setForm({ ...form, estimatedMinutes: e.target.value })
            }
          />

          <label className="text-sm font-medium">Assign To</label>
          <Select
            value={form.assignedTo}
            onValueChange={(val) => setForm({ ...form, assignedTo: val })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Team Member" />
            </SelectTrigger>
            <SelectContent>
              {departmentUsers.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name} ({user.role})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <label className="text-sm font-medium">Priority</label>
          <Select
            value={form.priority}
            onValueChange={(val) => setForm({ ...form, priority: val })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="High">High</SelectItem>
              <SelectItem value="Medium">Medium</SelectItem>
              <SelectItem value="Low">Low</SelectItem>
            </SelectContent>
          </Select>

          <label className="text-sm font-medium">Status</label>
          <Select
            value={form.status}
            onValueChange={(val) => setForm({ ...form, status: val })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="To Do">To Do</SelectItem>
              {userRole === "admin" ? null : (
                <>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Info Required">Info Required</SelectItem>
                  <SelectItem value="Review">Review</SelectItem>
                </>
              )}
              <SelectItem value="Completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleSubmit}>
            {taskToEdit ? "Update Task" : "Create Task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateTaskDialog;
