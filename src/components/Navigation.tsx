import React, { useEffect, useState } from "react";
import {
  Bell,
  CheckCircle,
  Group,
  IndianRupeeIcon,
  LogOut,
  User,
  Users,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { auth, db } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { collection, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import AddUserDialog from "./AddUserDialogue";

interface NotificationItem {
  id: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: {
    seconds: number;
    nanoseconds: number;
    toDate?: () => Date; // optional if you're using Firestore Timestamp object
  };
}

const Navigation = () => {
  const { user, userRole } = useAuth();
  const navigate = useNavigate();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  // 🔔 Fetch notifications
  useEffect(() => {
    if (!user?.uid) return;

    const unsub = onSnapshot(
      collection(db, `users/${user.uid}/notifications`),
      (snapshot) => {
        const data: NotificationItem[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as NotificationItem), // 👈 cast properly here
        }));

        // Sort unread first, and then by createdAt descending
        const sorted = data.sort((a, b) => {
          const aTime = a.createdAt?.seconds || 0;
          const bTime = b.createdAt?.seconds || 0;

          if (a.read === b.read) {
            return bTime - aTime; // newer first
          }
          return a.read ? 1 : -1; // unread first
        });

        setNotifications(sorted);
      }
    );

    return () => unsub();
  }, [user]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAsRead = async (id: string) => {
    const ref = doc(db, `users/${user.uid}/notifications/${id}`);
    await updateDoc(ref, { read: true });
  };

  const getTimeAgo = (createdAt: any) => {
    if (!createdAt) return "";

    const date = createdAt.toDate
      ? createdAt.toDate()
      : new Date(createdAt.seconds * 1000);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMinutes < 1) return "just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString();
  };

  const handleProfileClick = () => navigate("/profile");
  const handlePaymentClick = () => navigate("/payments");
  const handleUsersClick = () => navigate("/usersList");

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error("Sign-out error:", error);
    }
  };

  const getRoleDisplayName = (role: string | null) => {
    switch (role) {
      case "admin":
        return "Super Admin";
      case "client":
        return "Client";
      case "designer":
        return "Designer";
      case "developer":
        return "Developer";
      default:
        return "User";
    }
  };

  const getRoleColor = (role: string | null) => {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-800";
      case "client":
        return "bg-blue-100 text-blue-800";
      case "designer":
        return "bg-green-100 text-green-800";
      case "developer":
        return "bg-orange-100 text-green-800";

      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <h1 className="text-xl font-bold text-gray-900">ProjectHub</h1>
            <span
              className={`ml-3 px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(
                userRole
              )}`}
            >
              {getRoleDisplayName(userRole)}
            </span>
          </div>

          <div className="flex items-center space-x-4">
            {/* 🔔 Notifications */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative">
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-600" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-72 max-h-80 overflow-y-auto"
                align="end"
              >
                <DropdownMenuLabel className="text-sm font-semibold">
                  Notifications
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {notifications.length === 0 && (
                  <DropdownMenuItem disabled>No notifications</DropdownMenuItem>
                )}
                {notifications.map((n) => (
                  <DropdownMenuItem
                    key={n.id}
                    onClick={() => handleMarkAsRead(n.id)}
                    className={!n.read ? "bg-gray-100" : ""}
                  >
                    <div className="flex items-start w-full">
                      {n.type === "chat" ? (
                        <Bell className="w-4 h-4 mr-2 text-blue-500 mt-0.5" />
                      ) : (
                        <CheckCircle className="w-4 h-4 mr-2 text-green-500 mt-0.5" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">{n.message}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {getTimeAgo(n.createdAt)}
                        </p>
                      </div>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Avatar/Profile */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-8 w-8 rounded-full"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src={user?.photoURL || ""}
                      alt={user?.displayName || ""}
                    />
                    <AvatarFallback>
                      {user?.email?.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {user?.displayName || "User"}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {userRole === "admin" && (
                  <>
                    <DropdownMenuItem
                      onSelect={(e) => {
                        e.preventDefault();
                        setIsDialogOpen(true);
                      }}
                    >
                      <Users className="mr-2 h-4 w-4" />
                      <span>Add User</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleUsersClick}>
                      <Group className="mr-2 h-4 w-4" />
                      <span>Users</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handlePaymentClick}>
                      <IndianRupeeIcon className="mr-2 h-4 w-4" />
                      <span>Payments and Invoices</span>
                    </DropdownMenuItem>
                  </>
                )}
                <AddUserDialog
                  open={isDialogOpen}
                  onClose={() => setIsDialogOpen(false)}
                />
                <DropdownMenuItem onClick={handleProfileClick}>
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
