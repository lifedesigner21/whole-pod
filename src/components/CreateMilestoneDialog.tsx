import React, {
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Textarea } from "@/components/ui/textarea";
import {
  collection,
  getDocs,
  where,
  query,
  addDoc,
  Timestamp,
  doc,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface UserOption {
  id: string;
  name: string;
}

interface CreateMilestoneDialogProps {
  projectId: string;
  projectName: string;
  clientName?: string;
  clientId?: string;
  onMilestoneCreated: () => void;
}

export interface CreateMilestoneDialogRef {
  openDialog: (milestone?: any) => void;
}

const defaultForm = {
  id: "",
  name: "",
  description: "",
  podDesigner: "",
  podDesignerId: "",
  client: "",
  clientId: "",
  startDate: "",
  endDate: "",
  status: "Pending",
  amount: "",
};

const CreateMilestoneDialog = forwardRef<
  CreateMilestoneDialogRef,
  CreateMilestoneDialogProps
>(
  (
    { projectId, projectName, clientName, clientId, onMilestoneCreated },
    ref
  ) => {
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState({ ...defaultForm });
    const [isEdit, setIsEdit] = useState(false);

    const [designers, setDesigners] = useState<UserOption[]>([]);
    const [clients, setClients] = useState<UserOption[]>([]);
    const { user } = useAuth();

    useImperativeHandle(ref, () => ({
      openDialog: (milestone) => {
        if (milestone) {
          setForm({
            ...milestone,
            amount: String(milestone.amount),
            id: milestone.id,
          });
          setIsEdit(true);
        } else {
          setForm({
            ...defaultForm,
            client: clientName || "",
            clientId: clientId || "",
          });
          setIsEdit(false);
        }
        setOpen(true);
      },
    }));

    useEffect(() => {
      const fetchUsers = async () => {
        try {
          const [designerSnap, clientSnap] = await Promise.all([
            getDocs(
              query(collection(db, "users"), where("role", "==", "designer"))
            ),
            getDocs(
              query(collection(db, "users"), where("role", "==", "client"))
            ),
          ]);

          setDesigners(
            designerSnap.docs.map((doc) => ({
              id: doc.id,
              name: doc.data().name,
            }))
          );

          setClients(
            clientSnap.docs.map((doc) => ({
              id: doc.id,
              name: doc.data().name,
            }))
          );
        } catch (err) {
          console.error("Error fetching users:", err);
        }
      };

      fetchUsers();
    }, []);

    const sendNotification = async () => {
      const { name, podDesignerId, clientId } = form;

      const notifications = [
        {
          userId: podDesignerId,
          message: `You have been assigned in a milestone: ${name}. Get ready for the tasks!`,
        },
        {
          userId: clientId,
          message: `Milestone '${name}' has been assigned to your project.`,
        },
      ];

      for (const notif of notifications) {
        await addDoc(collection(db, `users/${notif.userId}/notifications`), {
          message: notif.message,
          type: "milestone",
          read: false,
          createdAt: Timestamp.now(),
        });
      }

      const adminSnap = await getDocs(
        query(collection(db, "users"), where("role", "==", "admin"))
      );
      for (const docSnap of adminSnap.docs) {
        await addDoc(collection(db, `users/${docSnap.id}/notifications`), {
          message: `You have created a new milestone: ${name} created by ${user.displayName}`,
          type: "milestone",
          read: false,
          createdAt: Timestamp.now(),
        });
      }
    };

    const handleSave = async () => {
      const {
        name,
        description,
        podDesignerId,
        clientId,
        startDate,
        endDate,
        amount,
      } = form;

      if (
        !name ||
        !description ||
        !podDesignerId ||
        !clientId ||
        !startDate ||
        !endDate ||
        !amount
      ) {
        toast({
          title: "Missing Fields",
          description: "Please fill all required fields before submitting.",
          variant: "destructive",
        });
        return;
      }

      try {
        // Create a clean data object without undefined values
        const milestoneData = {
          name: name || "",
          description: description || "",
          podDesigner: form.podDesigner || "",
          podDesignerId: podDesignerId || "",
          client: form.client || "",
          clientId: clientId || "",
          startDate: startDate || "",
          endDate: endDate || "",
          status: form.status || "Pending",
          amount: Number(amount) || 0,
          projectId: projectId || "",
          projectName: projectName || "",
          progress: 0,
          createdAt: Timestamp.now(),
          tasks: [],
        };

        if (isEdit && form.id) {
          const milestoneRef = doc(
            db,
            "projects",
            projectId,
            "milestones",
            form.id
          );
          await setDoc(
            milestoneRef,
            {
              ...milestoneData,
              updatedAt: Timestamp.now(),
            },
            { merge: true }
          );
          onMilestoneCreated?.();
          toast({ title: "Milestone updated successfully" });
        } else {
          // Create milestone and get its auto-generated ID
          const milestoneRef = await addDoc(
            collection(db, "projects", projectId, "milestones"),
            milestoneData
          );

          // Update that milestone to include its own ID field
          await updateDoc(milestoneRef, {
            id: milestoneRef.id,
          });

          await sendNotification();
          onMilestoneCreated?.();

          toast({ title: "Milestone created successfully" });
        }

        setOpen(false);
        setForm({ ...defaultForm });
      } catch (error) {
        console.error("Error saving milestone:", error);
        toast({ title: "Error", description: "Failed to save milestone." });
      }
    };

    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {isEdit ? "Edit Milestone" : "Create Milestone"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Milestone Name</label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Enter milestone name"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Amount (₹)</label>
              <Input
                type="number"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="Enter milestone amount"
              />
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="Describe the milestone"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Pod Designer</label>
              <Select
                value={form.podDesignerId}
                onValueChange={(val) => {
                  const selected = designers.find((d) => d.id === val);
                  if (selected) {
                    setForm({
                      ...form,
                      podDesignerId: val,
                      podDesigner: selected.name,
                    });
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Pod Designer" />
                </SelectTrigger>
                <SelectContent>
                  {designers.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Client</label>
              <Select
                value={form.clientId}
                onValueChange={(val) => {
                  const selected = clients.find((c) => c.id === val);
                  if (selected) {
                    setForm({
                      ...form,
                      clientId: val,
                      client: selected.name,
                    });
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
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
                onChange={(e) =>
                  setForm({ ...form, startDate: e.target.value })
                }
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
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {isEdit ? "Update Milestone" : "Create Milestone"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
);

CreateMilestoneDialog.displayName = "CreateMilestoneDialog";
export default CreateMilestoneDialog;
