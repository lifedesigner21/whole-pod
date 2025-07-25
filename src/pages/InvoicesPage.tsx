"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";

interface Invoice {
  id: string;
  userId: string;
  pendingAmount: number;
  createdAt: string;
  milestoneId: string;
  milestoneName: string;
  projectId: string;
  projectName: string;
  url: string;
  status: "Paid" | "Pending";
}

const InvoicesPage = () => {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [totalPending, setTotalPending] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user?.uid) return;

    const fetchInvoices = async () => {
      const ref = query(
        collection(db, "invoiceUrls"),
        where("clientId", "==", user.uid),
        orderBy("createdAt", "desc")
      );

      const snapshot = await getDocs(ref);

      const result: Invoice[] = snapshot.docs.map((doc) => {
        const data = doc.data() as Partial<Invoice>;
        const pending =
          typeof data.pendingAmount === "number" ? data.pendingAmount : 0;
        const status = data.status === "Paid" ? "Paid" : "Pending";

        return {
          id: doc.id,
          userId: data.userId || "",
          pendingAmount: pending,
          createdAt: data.createdAt || "",
          milestoneId: data.milestoneId || "",
          milestoneName: data.milestoneName || "",
          projectId: data.projectId || "",
          projectName: data.projectName || "",
          url: data.url || "#",
          status,
        };
      });

      // Calculate total pending only for status === "Pending"
      const totalPendingAmount = result
        .filter((inv) => inv.status === "Pending")
        .reduce((acc, inv) => acc + inv.pendingAmount, 0);

      setInvoices(result);
      setTotalPending(totalPendingAmount);
    };

    fetchInvoices();
  }, [user?.uid]);

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Back Button */}
      <Button
        variant="outline"
        onClick={() => navigate(-1)}
        className="self-start w-fit text-gray-700"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </Button>

      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Payment History</h1>
      </div>

      <Card>
        <CardContent className="overflow-x-auto">
          <h2 className="text-xl font-semibold mb-4">Invoices & Payments</h2>
          <table className="min-w-full table-auto border border-gray-200">
            <thead className="bg-gray-100 text-left text-sm">
              <tr>
                <th className="p-3">Project</th>
                <th className="p-3">Milestone</th>
                <th className="p-3">Pending Amount</th>
                <th className="p-3">Status</th>
                <th className="p-3">File Link</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="border-t">
                  <td className="p-3">{invoice.projectName}</td>
                  <td className="p-3">{invoice.milestoneName}</td>
                  <td className="p-3">
                    ₹{invoice.pendingAmount.toLocaleString()}
                  </td>
                  <td className="p-3">
                    <Badge
                      className={
                        invoice.status === "Paid"
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }
                    >
                      {invoice.status}
                    </Badge>
                  </td>
                  <td className="p-3">
                    <a
                      href={invoice.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline"
                    >
                      View PDF
                    </a>
                  </td>
                </tr>
              ))}

              {/* Footer row for total pending */}
              <tr className="border-t bg-gray-50 font-semibold">
                <td className="p-3" colSpan={2}>
                  Total Pending Amount
                </td>
                <td className="p-3">₹{totalPending.toLocaleString()}</td>
                <td className="p-3" colSpan={2}></td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
};

export default InvoicesPage;
