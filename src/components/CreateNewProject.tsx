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
import { Checkbox } from "@/components/ui/checkbox";
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
  department: string;
  teamMembers: { id: string; name: string }[];
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
    department: "",
    teamMembers: [],
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
  const [developers, setDevelopers] = useState<UserOption[]>([]);
  const [legalTeam, setLegalTeam] = useState<UserOption[]>([]);
  const { user } = useAuth();

  const getCurrentDepartmentUsers = () => {
    switch (form.department) {
      case "design":
        return designers;
      case "development":
        return developers;
      case "legal":
        return legalTeam;
      default:
        return [];
    }
  };

  const handleTeamMemberToggle = (member: UserOption) => {
    setForm(prev => {
      const currentMembers = prev.teamMembers;
      const isSelected = currentMembers.some(m => m.id === member.id);
      
      if (isSelected) {
        return {
          ...prev,
          teamMembers: currentMembers.filter(m => m.id !== member.id)
        };
      } else {
        return {
          ...prev,
          teamMembers: [...currentMembers, member]
        };
      }
    });
  };

  const handleSubmit = async () => {
    // ✅ Validate required fields before proceeding
    if (
      !form.name ||
      !form.clientId ||
      !form.department ||
      form.teamMembers.length === 0 ||
      !form.totalAmount ||
      !form.brief ||
      !form.startDate ||
      !form.endDate
    ) {
      toast({
        title: "Missing required fields",
        description: "Please fill in all required fields before submitting.",
        variant: "destructive",
      });
      return;
    }

    // invalid start/end dates
    const start = new Date(form.startDate);
    const end = new Date(form.endDate);
    if (start > end) {
      toast({
        title: "Invalid Date Range",
        description: "Start date cannot be after end date.",
        variant: "destructive",
      });
      return;
    }

    // Negative or illogical financial amounts
    if (Number(form.totalAmount) < 0 || Number(form.paidAmount) < 0) {
      toast({
        title: "Invalid Amount",
        description: "Amounts cannot be negative.",
        variant: "destructive",
      });
      return;
    }
    if (Number(form.paidAmount) > Number(form.totalAmount)) {
      toast({
        title: "Invalid Payment",
        description: "Paid amount cannot exceed total amount.",
        variant: "destructive",
      });
      return;
    }

    const project = {
      ...form,
      totalAmount: Number(form.totalAmount),
      paidAmount: mode === "edit" ? Number(form.paidAmount) : 0,
      projectCreatedBy: user.uid,
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
          isDeleted: false,
          projectCreatedBy: user.uid,
        });

        // 🔔 Notifications for all team members
        const { name, teamMembers, clientId } = form;

        const allNotifications = [
          ...teamMembers.map(member => ({ userId: member.id, role: form.department })),
          { userId: clientId, role: 'client' }
        ];

        for (const member of allNotifications) {
          await addDoc(collection(db, `users/${member.userId}/notifications`), {
            message: member.role === 'client' 
              ? `You have been added to the project: ${name}.`
              : `You have been assigned to a new project: ${name}.`,
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
            createdBy: user.uid
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
        department: editProject.department || "",
        teamMembers: editProject.teamMembers || [],
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
        department: "",
        teamMembers: [],
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
        const [clientSnap, designerSnap, developerSnap, legalSnap, allowedSnap] = await Promise.all([
          getDocs(
            query(collection(db, "users"), where("role", "==", "client"))
          ),
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

        const filteredClients = clientSnap.docs
          .filter((doc) => allowedEmails.has(doc.data().email?.toLowerCase()))
          .map((doc) => ({
            id: doc.id,
            name: doc.data().name,
          }));

        const filteredDesigners = designerSnap.docs
          .filter((doc) => allowedEmails.has(doc.data().email?.toLowerCase()))
          .map((doc) => ({
            id: doc.id,
            name: doc.data().name,
          }));

        const filteredDevelopers = developerSnap.docs
          .filter((doc) => allowedEmails.has(doc.data().email?.toLowerCase()))
          .map((doc) => ({
            id: doc.id,
            name: doc.data().name,
          }));

        const filteredLegal = legalSnap.docs
          .filter((doc) => allowedEmails.has(doc.data().email?.toLowerCase()))
          .map((doc) => ({
            id: doc.id,
            name: doc.data().name,
          }));

        setClients(filteredClients);
        setDesigners(filteredDesigners);
        setDevelopers(filteredDevelopers);
        setLegalTeam(filteredLegal);
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };

    fetchUsers();
  }, []);

  const currentDepartmentUsers = getCurrentDepartmentUsers();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
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
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          <div className="grid gap-1">
            <label className="text-sm font-medium text-gray-700">Client</label>
            <Select
              value={form.clientId}
              required
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
            <label className="text-sm font-medium text-gray-700 ">
              Project Brief
            </label>
            <textarea
              rows={4}
              required
              placeholder="Describe the project..."
              className="w-full mt-1 border border-gray-300 rounded-md px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring focus:ring-blue-200 "
              value={form.brief}
              onChange={(e) => setForm({ ...form, brief: e.target.value })}
            />
          </div>

          <div className="grid gap-1">
            <label className="text-sm font-medium text-gray-700">Department</label>
            <Select
              value={form.department}
              required
              onValueChange={(val) => {
                setForm({
                  ...form,
                  department: val,
                  teamMembers: [] // Clear team members when department changes
                });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="design">Design</SelectItem>
                <SelectItem value="development">Development</SelectItem>
                <SelectItem value="legal">Legal</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {form.department && (
            <div className="grid gap-2">
              <label className="text-sm font-medium text-gray-700">
                {form.department === "design" ? "Designers" : 
                 form.department === "development" ? "Developers" : 
                 "Legal Team"} ({form.teamMembers.length} selected)
              </label>
              <div className="border rounded-md p-3 max-h-32 overflow-y-auto space-y-2">
                {currentDepartmentUsers.map((member) => (
                  <div key={member.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`member-${member.id}`}
                      checked={form.teamMembers.some(m => m.id === member.id)}
                      onCheckedChange={() => handleTeamMemberToggle(member)}
                    />
                    <label 
                      htmlFor={`member-${member.id}`}
                      className="text-sm cursor-pointer"
                    >
                      {member.name}
                    </label>
                  </div>
                ))}
                {currentDepartmentUsers.length === 0 && (
                  <p className="text-sm text-gray-500">No team members available</p>
                )}
              </div>
            </div>
          )}

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
              required
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
              required
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
              required
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
              required
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