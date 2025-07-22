import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface UserOption {
  id: string;
  name: string;
}

type NewProject = {
  name: string;
  client: string;
  clientId: string;
  designer: string;
  designerId: string;
  status: string;
  totalAmount: string;
  paidAmount: string;
  startDate: string;
  endDate: string;
  figmaUrl: string;
  assetsLink: string;
  serviceType: string;
  brief: string;
};

interface CreateProjectDialogProps {
  onCreate: (project: any) => void;
  editProject?: any;
  mode?: "create" | "edit";
  open?: boolean;
  onOpenChange?: (val: boolean) => void;
}

const CreateProjectDialog: React.FC<CreateProjectDialogProps> = ({
  onCreate,
  editProject,
  mode = "create",
  open = false,
  onOpenChange,
}) => {
  const [form, setForm] = useState<NewProject>({
    name: "",
    client: "",
    clientId: "",
    designer: "",
    designerId: "",
    status: "Active",
    totalAmount: "",
    paidAmount: "",
    startDate: "",
    endDate: "",
    figmaUrl: "",
    assetsLink: "",
    serviceType: "",
    brief: "",
  });

  const [clients, setClients] = useState<UserOption[]>([]);
  const [designers, setDesigners] = useState<UserOption[]>([]);
  const { user } = useAuth();

  const handleSubmit = async () => {
    const project = {
      ...form,
      totalAmount: Number(form.totalAmount),
      paidAmount: mode === "edit" ? Number(form.paidAmount) : 0,
    };

    try {
      if (mode === "edit" && editProject?.id) {
        await updateDoc(doc(db, "projects", editProject.id), project);
        toast({
          title: "Project updated successfully",
          description: "Your project has been updated.",
        });
      } else {
        const projectRef = await addDoc(collection(db, "projects"), {
          ...project,
          progress: 0,
          createdDate: Timestamp.now(),
          tasksCompleted: 0,
          totalTasks: 0,
          revisionsUsed: 0,
          maxRevisions: 5,
          pendingFeedback: [],
          milestones: [],
          paidAmount: project.paidAmount,
        });

        // 🔔 Notifications
        const { name, designerId, clientId } = form;

        const notifications = [
          {
            userId: designerId,
            message: `You have been assigned to a new project: ${name}.`,
          },
          {
            userId: clientId,
            message: `You have been added to the project: ${name}.`,
          },
        ];

        for (const notif of notifications) {
          await addDoc(collection(db, `users/${notif.userId}/notifications`), {
            message: notif.message,
            type: "project",
            read: false,
            createdAt: Timestamp.now(),
          });
        }

        const adminSnap = await getDocs(
          query(collection(db, "users"), where("role", "==", "admin"))
        );
        for (const docSnap of adminSnap.docs) {
          await addDoc(collection(db, `users/${docSnap.id}/notifications`), {
            message: `You have created a new project: ${name} created by ${user.displayName}.`,
            type: "project",
            read: false,
            createdAt: Timestamp.now(),
          });
        }
      }

      toast({
        title: "Success",
        description: "Your project has been created.",
      });
      onOpenChange?.(false);
    } catch (error) {
      console.error("Error saving project:", error);
      toast({
        title: "Error",
        description: " Failed to save project.",
      });
    }
  };

  useEffect(() => {
    if (editProject) {
      setForm({
        name: editProject.name || "",
        client: editProject.client || "",
        clientId: editProject.clientId || "",
        designer: editProject.designer || "",
        designerId: editProject.designerId || "",
        status: editProject.status || "Active",
        totalAmount: editProject.totalAmount?.toString() || "",
        paidAmount: editProject.paidAmount?.toString() || "",
        startDate: editProject.startDate || "",
        endDate: editProject.endDate || "",
        figmaUrl: editProject.figmaUrl || "",
        assetsLink: editProject.assetsLink || "",
        serviceType: editProject.serviceType || "",
        brief: editProject.brief || "",
      });
    } else {
      setForm({
        name: "",
        client: "",
        clientId: "",
        designer: "",
        designerId: "",
        status: "Active",
        totalAmount: "",
        paidAmount: "",
        startDate: "",
        endDate: "",
        figmaUrl: "",
        assetsLink: "",
        serviceType: "",
        brief: "",
      });
    }
  }, [editProject]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const clientQuery = query(
          collection(db, "users"),
          where("role", "==", "client")
        );
        const designerQuery = query(
          collection(db, "users"),
          where("role", "==", "designer")
        );

        const [clientSnap, designerSnap] = await Promise.all([
          getDocs(clientQuery),
          getDocs(designerQuery),
        ]);

        const fetchedClients = clientSnap.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().name,
        }));

        const fetchedDesigners = designerSnap.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().name,
        }));

        setClients(fetchedClients);
        setDesigners(fetchedDesigners);
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };

    fetchUsers();
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>
            {mode === "edit" ? "Edit Project" : "Create New Project"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
          <div className="grid gap-1">
            <label className="text-sm font-medium text-gray-700">
              Project Name
            </label>
            <Input
              placeholder="Enter project name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          <div className="grid gap-1">
            <label className="text-sm font-medium text-gray-700">Client</label>
            <Select
              value={form.clientId}
              onValueChange={(val) => {
                const selectedClient = clients.find((c) => c.id === val);
                if (selectedClient) {
                  setForm({
                    ...form,
                    clientId: val,
                    client: selectedClient.name,
                  });
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Client" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-2">
            <label className="text-sm font-medium text-gray-700">
              Project Brief
            </label>
            <textarea
              rows={4}
              placeholder="Describe the project..."
              className="w-full mt-1 border border-gray-300 rounded-md px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring focus:ring-blue-200"
              value={form.brief}
              onChange={(e) => setForm({ ...form, brief: e.target.value })}
            />
          </div>

          <div className="grid gap-1">
            <label className="text-sm font-medium text-gray-700">POC</label>
            <Select
              value={form.designerId}
              onValueChange={(val) => {
                const selectedDesigner = designers.find((d) => d.id === val);
                if (selectedDesigner) {
                  setForm({
                    ...form,
                    designerId: val,
                    designer: selectedDesigner.name,
                  });
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Designer" />
              </SelectTrigger>
              <SelectContent>
                {designers.map((designer) => (
                  <SelectItem key={designer.id} value={designer.id}>
                    {designer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1">
            <label className="text-sm font-medium text-gray-700">Status</label>
            <Select
              value={form.status}
              onValueChange={(val) => setForm({ ...form, status: val })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="On Hold">On Hold</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1">
            <label className="text-sm font-medium text-gray-700">
              Total Amount (₹)
            </label>
            <Input
              type="number"
              placeholder="Enter total amount"
              value={form.totalAmount}
              onChange={(e) =>
                setForm({ ...form, totalAmount: e.target.value })
              }
            />
          </div>

          <div className="grid gap-1">
            <label className="text-sm font-medium text-gray-700">
              Paid Amount (₹)
            </label>
            <Input
              type="number"
              placeholder="Enter paid amount"
              value={form.paidAmount}
              onChange={(e) => setForm({ ...form, paidAmount: e.target.value })}
            />
          </div>

          <div className="grid gap-1">
            <label className="text-sm font-medium text-gray-700">
              Start Date
            </label>
            <Input
              type="date"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
            />
          </div>

          <div className="grid gap-1">
            <label className="text-sm font-medium text-gray-700">
              End Date
            </label>
            <Input
              type="date"
              value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
            />
          </div>

          <div className="grid gap-1">
            <label className="text-sm font-medium text-gray-700">
              Service Type
            </label>
            <Input
              placeholder="Enter service type"
              value={form.serviceType}
              onChange={(e) =>
                setForm({ ...form, serviceType: e.target.value })
              }
            />
          </div>

          <div className="grid gap-1">
            <label className="text-sm font-medium text-gray-700">
              Figma URL
            </label>
            <Input
              placeholder="Enter Figma URL"
              value={form.figmaUrl}
              onChange={(e) => setForm({ ...form, figmaUrl: e.target.value })}
            />
          </div>

          <div className="grid gap-1">
            <label className="text-sm font-medium text-gray-700">
              Assets Link
            </label>
            <Input
              placeholder="Enter Assets Link"
              value={form.assetsLink}
              onChange={(e) => setForm({ ...form, assetsLink: e.target.value })}
            />
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleSubmit}>
            {mode === "edit" ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateProjectDialog;
