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
  role: "client" | "designer" | "developer" | "legalteam" | "admin" | "superadmin" | "manager";
  department?: "development" | "designing" | "legal";
  isManager?: boolean;
  isSuperadmin?: boolean;
}

interface AddUserProps {
  onClose: () => void;
  editUser?: AllowedUser | null;
}

const AddUser: React.FC<AddUserProps> = ({ onClose, editUser }) => {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"client" | "designer" | "developer" | "legalteam" | "admin" | "superadmin" | "manager">("designer");
  const [department, setDepartment] = useState<"development" | "designing" | "legal" | "">("");
  const [isManager, setIsManager] = useState(false);
  const [isSuperadmin, setIsSuperadmin] = useState(false);

  const isEditMode = !!editUser;

  useEffect(() => {
    if (editUser) {
      setEmail(editUser.email);
      setName(editUser.name);
      setRole(editUser.role);
      setDepartment(editUser.department || "");
      setIsManager(editUser.isManager || false);
      setIsSuperadmin(editUser.isSuperadmin || false);
    } else {
      setEmail("");
      setName("");
      setRole("designer");
      setDepartment("");
      setIsManager(false);
      setIsSuperadmin(false);
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

    // Validate department for specific roles
    if (["designer", "developer", "legalteam"].includes(role) && !department) {
      toast({
        title: "Error",
        description: "Department is required for this role",
        variant: "destructive",
      });
      return;
    }

    try {
      if (isEditMode && editUser) {
        // Update existing user
        const updateData: any = {
          email: email.trim().toLowerCase(),
          name: name.trim(),
          role,
        };

        // Add department for roles that require it
        if (["designer", "developer", "legalteam"].includes(role)) {
          updateData.department = department;
        }

        // Add manager flag
        updateData.isManager = isManager;

        // Add superadmin flag only if explicitly set
        if (isSuperadmin) {
          updateData.isSuperadmin = isSuperadmin;
        }

        await updateDoc(doc(db, "allowedUsers", editUser.id), updateData);

        toast({
          title: "Success",
          description: `User ${name} updated successfully`,
        });
      } else {
        // Add new user
        const newUserData: any = {
          email: email.trim().toLowerCase(),
          name: name.trim(),
          role,
        };

        // Add department for roles that require it
        if (["designer", "developer", "legalteam"].includes(role)) {
          newUserData.department = department;
        }

        // Add manager flag
        newUserData.isManager = isManager;

        // Add superadmin flag only if explicitly set
        if (isSuperadmin) {
          newUserData.isSuperadmin = isSuperadmin;
        }

        await addDoc(collection(db, "allowedUsers"), newUserData);

        toast({
          title: "Success",
          description: `${email} added successfully as ${role}`,
        });
      }

      // Reset fields
      setEmail("");
      setName("");
      setRole("designer");
      setDepartment("");
      setIsManager(false);
      setIsSuperadmin(false);
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
            setRole(value as "client" | "designer" | "developer" | "legalteam" | "admin" | "superadmin" | "manager")
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="client">Client</SelectItem>
            <SelectItem value="designer">Designer</SelectItem>
            <SelectItem value="developer">Developer</SelectItem>
            <SelectItem value="legalteam">Legal Team</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="superadmin">Super Admin</SelectItem>
            <SelectItem value="manager">Manager</SelectItem>
          </SelectContent>
        </Select>

        {/* Department field - only for specific roles */}
        {["designer", "developer", "legalteam"].includes(role) && (
          <Select
            value={department}
            onValueChange={(value) => setDepartment(value as "development" | "designing" | "legal")}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="designing">Designing</SelectItem>
              <SelectItem value="development">Development</SelectItem>
              <SelectItem value="legal">Legal</SelectItem>
            </SelectContent>
          </Select>
        )}

        {/* Manager checkbox - for all roles except client */}
        {role !== "client" && (
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isManager"
              checked={isManager}
              onChange={(e) => setIsManager(e.target.checked)}
              className="rounded border-gray-300"
            />
            <label htmlFor="isManager" className="text-sm font-medium">
              Is Manager
            </label>
          </div>
        )}

        {/* Superadmin checkbox - only for admin/superadmin/manager roles */}
        {["admin", "superadmin", "manager"].includes(role) && (
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isSuperadmin"
              checked={isSuperadmin}
              onChange={(e) => setIsSuperadmin(e.target.checked)}
              className="rounded border-gray-300"
            />
            <label htmlFor="isSuperadmin" className="text-sm font-medium">
              Is Superadmin
            </label>
          </div>
        )}
        <Button onClick={handleSubmit}>
          {isEditMode ? "Update User" : "Add User"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default AddUser;
