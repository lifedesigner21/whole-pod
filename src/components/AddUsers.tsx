import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { db } from "@/lib/firebase";
import { collection, addDoc, doc, updateDoc } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";

interface AllowedUser {
  id: string;
  email: string;
  name: string;
  role: "client" | "designer" | "admin";
}

interface AddUserProps {
  onClose: () => void;
  editUser?: AllowedUser | null;
}

const AddUser: React.FC<AddUserProps> = ({ onClose, editUser }) => {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"client" | "designer" | "admin">("designer");

  const isEditMode = !!editUser;

  useEffect(() => {
    if (editUser) {
      setEmail(editUser.email);
      setName(editUser.name);
      setRole(editUser.role);
    } else {
      setEmail("");
      setName("");
      setRole("designer");
    }
  }, [editUser]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast({
        title: "Error",
        description: "Name is required",
        variant: "destructive",
      });
      return;
    }

    if (!email.trim()) {
      toast({
        title: "Error",
        description: "Email is required",
        variant: "destructive",
      });
      return;
    }

    if (!role) {
      toast({
        title: "Error",
        description: "Role selection is required",
        variant: "destructive",
      });
      return;
    }

    try {
      if (isEditMode && editUser) {
        // Update existing user
        await updateDoc(doc(db, "allowedUsers", editUser.id), {
          email: email.trim().toLowerCase(),
          name: name.trim(),
          role,
        });

        toast({
          title: "Success",
          description: `User ${name} updated successfully`,
        });
      } else {
        // Add new user
        await addDoc(collection(db, "allowedUsers"), {
          email: email.trim().toLowerCase(),
          name: name.trim(),
          role,
        });

        toast({
          title: "Success",
          description: `${email} added successfully as ${role}`,
        });
      }

      // Reset fields
      setEmail("");
      setName("");
      setRole("designer");
      // Close the dialog
      onClose();
    } catch (error) {
      console.error("Error saving user:", error);
      toast({
        title: "Error",
        description: isEditMode
          ? "Failed to update user"
          : "Failed to add user",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="max-w-md mx-auto mt-10">
      <CardHeader>
        <CardTitle>{isEditMode ? "Edit User" : "Add Allowed User"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          type="text"
          placeholder="Enter user name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Input
          type="email"
          placeholder="Enter email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Select
          value={role}
          onValueChange={(value) =>
            setRole(value as "client" | "designer" | "admin")
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="client">Client</SelectItem>
            <SelectItem value="designer">Designer</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={handleSubmit}>
          {isEditMode ? "Update User" : "Add User"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default AddUser;
