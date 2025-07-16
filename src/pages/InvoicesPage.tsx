"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  query,
  orderBy,
  DocumentData,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Invoice {
  id: string;
  amount: number;
  createdAt: string;
  milestoneId: string;
  milestoneName: string;
  projectId: string;
  projectName: string;
  url: string;
}

const InvoicesPage = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
   const navigate = useNavigate();

  useEffect(() => {
    const fetchInvoices = async () => {
      const ref = query(
        collection(db, "invoiceUrls"),
        orderBy("createdAt", "desc")
      );
      const snapshot = await getDocs(ref);
      const result: Invoice[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<Invoice, "id">),
      }));
      setInvoices(result);
    };

    fetchInvoices();
  }, []);

  const totalPaid = invoices.reduce((acc, inv) => acc + inv.amount, 0);

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

      {/* Summary Cards */}
      <div className="hidden grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xl font-bold text-black">
              ₹{totalPaid.toLocaleString()}
            </p>
            <p className="text-sm text-gray-600">Total Paid</p>
          </CardContent>
        </Card>

        {/* You can enhance these with real-time "pending" and "overdue" states if you have them */}
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xl font-bold text-black">-</p>
            <p className="text-sm text-gray-600">Pending Invoices</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xl font-bold text-black">-</p>
            <p className="text-sm text-gray-600">Overdue Count</p>
          </CardContent>
        </Card>
      </div>

      {/* Table of Invoices */}
      <Card>
        <CardContent className="overflow-x-auto">
          <h2 className="text-xl font-semibold mb-4">Invoices & Payments</h2>
          <table className="min-w-full table-auto border border-gray-200">
            <thead className="bg-gray-100 text-left text-sm">
              <tr>
                <th className="p-3">Project</th>
                <th className="p-3">Milestone</th>
                <th className="p-3">Amount</th>
                <th className="p-3">File Link</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="border-t">
                  <td className="p-3">{invoice.projectName}</td>
                  <td className="p-3">{invoice.milestoneName}</td>
                  <td className="p-3">
                    ₹
                    {typeof invoice.amount === "number"
                      ? invoice.amount.toLocaleString()
                      : "0"}
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
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
};

export default InvoicesPage;
