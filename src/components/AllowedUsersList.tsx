import { useEffect, useState } from "react";
import { collection, onSnapshot, doc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash, Edit } from "lucide-react";
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
import AddUserDialog from "./AddUserDialogue";

interface AllowedUser {
  id: string;
  email: string;
  name: string;
  role: "client" | "designer" | "admin";
}

const AllowedUsersList = () => {
  const [users, setUsers] = useState<AllowedUser[]>([]);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [editUser, setEditUser] = useState<AllowedUser | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);

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

  const visibleUsers = showAll ? users : users.slice(0, 5);

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

  const handleEdit = (user: AllowedUser) => {
    setEditUser(user);
    setIsEditDialogOpen(true);
  };

  const handleCloseEditDialog = () => {
    setIsEditDialogOpen(false);
    setEditUser(null);
  };

  return (
    <>
      <Card className="mt-6 ">
        <CardContent className="space-y-3 py-4">
          {users.length === 0 && (
            <p className="text-sm text-gray-500">No users added yet.</p>
          )}
          {visibleUsers.map((user) => (
            <div
              key={user.id}
              className="grid  md:grid-cols-5 items-center gap-4 p-3 border rounded"
            >
              <span className="text-sm">
                <b>Name:</b> {user.name}
              </span>
              <span className="text-sm">
                <b>Email:</b> {user.email}
              </span>
              <span className="text-sm">
                <b>Role:</b>{" "}
                {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleEdit(user)}
                >
                  <Edit className="w-4 h-4 text-blue-600" />
                </Button>
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
            </div>
          ))}
          {users.length > 5 && (
            <div className="text-center pt-2">
              <button
                className="text-blue-600 hover:underline font-medium text-sm"
                onClick={() => setShowAll((prev) => !prev)}
              >
                {showAll ? "View Less" : "View More"}
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      <AddUserDialog
        open={isEditDialogOpen}
        onClose={handleCloseEditDialog}
        editUser={editUser}
      />
    </>
  );
};

export default AllowedUsersList;
