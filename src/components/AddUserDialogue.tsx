import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import AddUser from "./AddUsers";

interface AddUserDialogProps {
  open: boolean;
  onClose: () => void;
}

const AddUserDialog: React.FC<AddUserDialogProps> = ({ open, onClose }) => {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <AddUser />
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
