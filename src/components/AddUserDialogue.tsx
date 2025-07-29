import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import AddUser from "./AddUsers";

interface AllowedUser {
  id: string;
  email: string;
  name: string;
  role: "client" | "designer" | "developer" | "legalteam" | "admin" | "superadmin" | "manager";
  department?: "development" | "designing" | "legal";
  isManager?: boolean;
  isSuperadmin?: boolean;
}

interface AddUserDialogProps {
  open: boolean;
  onClose: () => void;
  editUser?: AllowedUser | null;
}

const AddUserDialog: React.FC<AddUserDialogProps> = ({
  open,
  onClose,
  editUser,
}) => {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <AddUser onClose={onClose} editUser={editUser} />
        <DialogClose asChild>
          <Button variant="outline" className="mt-4 w-full">
            Close
          </Button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
};

export default AddUserDialog;
