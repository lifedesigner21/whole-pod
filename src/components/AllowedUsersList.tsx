import { useEffect, useState } from "react";
import { collection, onSnapshot, doc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash } from "lucide-react";
import { toast } from "@/hooks/use-toast";

import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
  AlertDialogDescription,
} from "@/components/ui/alert-dialog";

interface AllowedUser {
  id: string;
  email: string;
  name: string;
  role: "client" | "designer" | "admin";
}

const AllowedUsersList = () => {
  const [users, setUsers] = useState<AllowedUser[]>([]);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "allowedUsers"),
      (snapshot) => {
        const fetchedUsers = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as AllowedUser[];
        setUsers(fetchedUsers);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleDelete = async () => {
    if (!deleteUserId) return;
    try {
      await deleteDoc(doc(db, "allowedUsers", deleteUserId));
      toast({ title: "User removed successfully" });
    } catch (err) {
      console.error("Error deleting user:", err);
      toast({ title: "Error removing user", variant: "destructive" });
    } finally {
      setDeleteUserId(null);
    }
  };

  return (
    <Card className="mt-6">
      <CardContent className="space-y-3">
        {users.length === 0 && (
          <p className="text-sm text-gray-500">No users added yet.</p>
        )}
        {users.map((user) => (
          <div
            key={user.id}
            className="grid grid-cols-4 items-center gap-4 p-3 border rounded"
          >
            <span className="text-sm">
              <b>Name:</b> {user.name}
            </span>
            <span className="text-sm">
              <b>Email:</b> {user.email}
            </span>
            <span className="text-sm">
              <b>Role:</b> {user.role}
            </span>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDeleteUserId(user.id)}
                >
                  <Trash className="w-4 h-4 text-red-600" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete User</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this user? This action
                    cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setDeleteUserId(null)}>
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default AllowedUsersList;
