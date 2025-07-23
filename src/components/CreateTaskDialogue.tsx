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

interface CreateTaskDialogProps {
  projectId: string;
  milestoneId: string;
  onTaskCreated?: () => void;
  onTaskUpdated?: () => void;
  taskToEdit?: any; // Pass the task object for editing
  projectName?: string;
  milestoneName?: string;
}

interface DesignerUser {
  id: string;
  name: string;
}

const CreateTaskDialog: React.FC<CreateTaskDialogProps> = ({
  projectId,
  milestoneId,
  onTaskCreated,
  onTaskUpdated,
  taskToEdit,
}) => {
  const { userRole, user } = useAuth();
  const [designers, setDesigners] = useState<DesignerUser[]>([]);
  const [form, setForm] = useState({
    title: "",
    description: "",
    dueDate: "",
    estimatedMinutes: "",
    priority: "Medium",
    status: "To Do",
    assignedTo: "",
  });
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const fetchDesigners = async () => {
      const q = query(collection(db, "users"), where("role", "==", "designer"));
      const snapshot = await getDocs(q);
      const users: DesignerUser[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        name: doc.data().name || "Unnamed",
      }));
      setDesigners(users);
    };
    fetchDesigners();
  }, []);

  // Pre-fill form if editing
  useEffect(() => {
    if (taskToEdit) {
      setForm({
        title: taskToEdit.title || "",
        description: taskToEdit.description || "",
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
    const assignedUser = designers.find((d) => d.id === form.assignedTo);
    const taskData = {
      title: form.title,
      description: form.description,
      dueDate: form.dueDate,
      estimatedMinutes: parseInt(form.estimatedMinutes) || 0,
      priority: form.priority,
      status: form.status,
      assignedTo: form.assignedTo,
      assignedToName: assignedUser?.name || "Unknown",
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
          {userRole !== "designer" && (
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

          <label className="text-sm font-medium">Due Date</label>
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
              <SelectValue placeholder="Select Designer" />
            </SelectTrigger>
            <SelectContent>
              {designers.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name}
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
              {userRole !== "admin" && (
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
