import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";

const AddUser: React.FC = () => {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"client" | "designer" | "admin">("designer");

  const handleAddUser = async () => {
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
      await addDoc(collection(db, "allowedUsers"), {
        email: email.trim().toLowerCase(),
        name: name.trim(),
        role,
      });

      toast({
        title: "Success",
        description: `${email} added successfully as ${role}`,
      });

      // Reset fields
      setEmail("");
      setName("");
      setRole("designer");
    } catch (error) {
      console.error("Error adding user:", error);
      toast({
        title: "Error",
        description: "Failed to add user",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="max-w-md mx-auto mt-10">
      <CardHeader>
        <CardTitle>Add Allowed User</CardTitle>
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
        <Select value={role} onValueChange={(value) => setRole(value as "client" | "designer" | "admin")}>
          <SelectTrigger>
            <SelectValue placeholder="Select role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="client">Client</SelectItem>
            <SelectItem value="designer">Designer</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={handleAddUser}>Add User</Button>
      </CardContent>
    </Card>
  );
};

export default AddUser;
