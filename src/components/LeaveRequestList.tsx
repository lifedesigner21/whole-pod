import React, { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  collectionGroup,
  doc,
  getDoc,
  onSnapshot,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import LeaveRequestDialog from "./LeaveRequestDialog";
import { format } from "date-fns";

interface LeaveRequest {
  id: string;
  userId: string;
  requestedBy: string;
  role: string;
  title: string;
  leaveType: string;
  leaveFrom: string;
  leaveTo: string;
  reason: string;
  proofUrl?: string;
  status: string;
}

const LeaveRequestList = () => {
  const { user, userRole } = useAuth();
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;

    const unsub =
      ["admin", "superadmin", "manager"].includes(userRole || "")
        ? onSnapshot(collectionGroup(db, "leaveRequests"), (snapshot) => {
            const data = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            })) as LeaveRequest[];

            // ✅ Sort: requested & pending first, then approved & rejected
            const sortedData = data.sort((a, b) => {
              const order = {
                Pending: 1,
                Approved: 2,
                Rejected: 3,
              };
              return (order[a.status] ?? 99) - (order[b.status] ?? 99);
            });

            setLeaveRequests(sortedData);
          })
        : onSnapshot(
            collection(db, `users/${user.uid}/leaveRequests`),
            (snapshot) => {
              const data = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
              })) as LeaveRequest[];

              // ✅ Sort user-specific leaves
              const sortedData = data.sort((a, b) => {
                const order = {
                  Pending: 1,
                  Approved: 2,
                  Rejected: 3,
                };
                return (order[a.status] ?? 99) - (order[b.status] ?? 99);
              });

              setLeaveRequests(sortedData);
            }
          );

    return () => unsub();
  }, [user, userRole]);

  const visibleRequests = showAll ? leaveRequests : leaveRequests.slice(0, 5);

  const notifyLeaveStatusChange = async (
    userId: string,
    status: "Approved" | "Rejected",
    leaveTitle: string
  ) => {
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) return;

    await addDoc(collection(db, `users/${userId}/notifications`), {
      message: `Your leave request (${leaveTitle}) has been ${status.toLowerCase()}.`,
      type: "leave-status",
      read: false,
      createdAt: Timestamp.now(),
    });
  };

  const handleUpdateStatus = async (
    uid: string,
    leaveId: string,
    status: "Approved" | "Rejected"
  ) => {
    const ref = doc(db, `users/${uid}/leaveRequests/${leaveId}`);
    const leaveSnap = await getDoc(ref);
    const leaveTitle = leaveSnap.exists()
      ? leaveSnap.data()?.title
      : "your leave";

    await updateDoc(ref, { status });
    await notifyLeaveStatusChange(uid, status, leaveTitle);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Leave Requests</CardTitle>
          {!["admin", "superadmin", "manager"].includes(userRole || "") && <LeaveRequestDialog />}
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {leaveRequests.length === 0 ? (
          <p className="text-sm text-gray-500">No leave requests yet.</p>
        ) : (
          <table className="w-full table-auto border rounded">
            <thead className="bg-gray-100">
              <tr className="text-left">
                <th className="py-2 px-3 text-sm">Name</th>
                <th className="py-2 px-3 text-sm">Role</th>
                <th className="py-2 px-3 text-sm">Leave Type</th>
                <th className="py-2 px-3 text-sm">From</th>
                <th className="py-2 px-3 text-sm">To</th>
                <th className="py-2 px-3 text-sm">Reason</th>
                <th className="py-2 px-3 text-sm">Proof</th>
                <th className="py-2 px-3 text-sm">Status</th>
                {["admin", "superadmin", "manager"].includes(userRole || "") && (
                  <th className="py-2 px-3 text-sm">Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {visibleRequests.map((req) => (
                <tr key={req.id} className="border-b hover:bg-gray-50">
                  <td className="py-2 px-3">{req.requestedBy}</td>
                  <td className="py-2 px-3 capitalize">{req.role}</td>
                  <td className="py-2 px-3">{req.leaveType}</td>
                  <td className="py-2 px-3">
                    {req.leaveFrom
                      ? format(new Date(req.leaveFrom), "dd MMM yyyy")
                      : "N/A"}
                  </td>
                  <td className="py-2 px-3">
                    {req.leaveTo
                      ? format(new Date(req.leaveTo), "dd MMM yyyy")
                      : "N/A"}
                  </td>
                  <td className="py-2 px-3">{req.reason}</td>
                  <td className="py-2 px-3">
                    {req.proofUrl ? (
                      <a
                        href={req.proofUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 underline text-sm"
                      >
                        View
                      </a>
                    ) : (
                      "Nill"
                    )}
                  </td>
                  <td className="py-2 px-3">
                    <Badge
                      className={
                        req.status === "Approved"
                          ? "bg-green-100 text-green-800"
                          : req.status === "Rejected"
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
                      }
                    >
                      {req.status}
                    </Badge>
                  </td>
                  {["admin", "superadmin", "manager"].includes(userRole || "") && (
                    <td className="py-2 px-3 space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          handleUpdateStatus(req.userId, req.id, "Approved")
                        }
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() =>
                          handleUpdateStatus(req.userId, req.id, "Rejected")
                        }
                      >
                        Reject
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            {leaveRequests.length > 5 && (
              <tfoot>
                <tr>
                  <td
                    colSpan={["admin", "superadmin", "manager"].includes(userRole || "") ? 9 : 8}
                    className="text-center py-3"
                  >
                    <button
                      onClick={() => setShowAll((prev) => !prev)}
                      className="text-blue-600 hover:underline text-sm font-medium"
                    >
                      {showAll ? "View Less" : "View More"}
                    </button>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        )}
      </CardContent>
    </Card>
  );
};

export default LeaveRequestList;
