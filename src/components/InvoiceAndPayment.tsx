import React, { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Search, Trash2 } from "lucide-react";
import { Button } from "./ui/button";
import { useNavigate } from "react-router-dom";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { updateDoc, doc } from "firebase/firestore";
import {
  decrementPaidAmountByInvoice,
  syncPaidAmountFromInvoice,
} from "@/lib/utils";

interface Invoice {
  id: string;
  url: string;
  milestoneId: string;
  milestoneName: string;
  projectId: string;
  projectName: string;
  clientId: string;
  pendingAmount: number;
  paymentDueDate: string;
  status: string;
  createdAt: string;
  isDeleted?: boolean;
}

const InvoiceDashboard = () => {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        const ref = query(
          collection(db, "invoiceUrls"),
          orderBy("createdAt", "desc")
        );
        const snapshot = await getDocs(ref);
        const result: Invoice[] = snapshot.docs
          .map((doc) => ({
            id: doc.id,
            ...(doc.data() as Omit<Invoice, "id">),
          }))
          .filter((inv) => !inv.isDeleted); // <-- Filter out deleted

        // 🟡 Sort: Pending first, Paid last (and keep createdAt descending within same status)
        result.sort((a, b) => {
          const statusPriority = (status: string) =>
            status === "Pending" ? 0 : status === "Paid" ? 1 : 2;

          const aPriority = statusPriority(a.status);
          const bPriority = statusPriority(b.status);

          if (aPriority !== bPriority) {
            return aPriority - bPriority;
          }

          // Within same status, sort by createdAt descending
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        });
        setInvoices(result);
        setFilteredInvoices(result);
      } catch (error) {
        console.error("Error fetching invoices:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchInvoices();
  }, []);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredInvoices(invoices);
    } else {
      const lowerSearch = searchTerm.toLowerCase();
      const filtered = invoices.filter((invoice) => {
        return (
          (typeof invoice.projectName === "string" &&
            invoice.projectName.toLowerCase().includes(lowerSearch)) ||
          (typeof invoice.milestoneName === "string" &&
            invoice.milestoneName.toLowerCase().includes(lowerSearch)) ||
          (typeof invoice.status === "string" &&
            invoice.status.toLowerCase().includes(lowerSearch)) ||
          invoice.pendingAmount?.toString().includes(lowerSearch) ||
          (typeof invoice.id === "string" &&
            invoice.id.toLowerCase().includes(lowerSearch)) ||
          (typeof invoice.paymentDueDate === "string" &&
            invoice.paymentDueDate.toLowerCase().includes(lowerSearch)) ||
          (typeof invoice.createdAt === "string" &&
            invoice.createdAt.toLowerCase().includes(lowerSearch))
        );
      });
      setFilteredInvoices(filtered);
    }
  }, [searchTerm, invoices]);

  const handleStatusUpdate = async (invoiceId: string, newStatus: string) => {
    try {
      const invoiceRef = doc(db, "invoiceUrls", invoiceId);
      await updateDoc(invoiceRef, {
        status: newStatus,
      });
      setInvoices((prev) =>
        prev.map((inv) =>
          inv.id === invoiceId ? { ...inv, status: newStatus } : inv
        )
      );

      // If status is Paid, sync the paidAmount for the corresponding project
      if (newStatus === "Paid") {
        const invoice = invoices.find((inv) => inv.id === invoiceId);
        if (invoice?.projectId) {
          await syncPaidAmountFromInvoice(invoice.projectId);
        }
      }
    } catch (err) {
      console.error("Failed to update invoice status:", err);
    }
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this invoice?"
    );
    if (!confirmDelete) return;

    try {
      const invoiceRef = doc(db, "invoiceUrls", invoiceId);

      // 🗑️ Soft delete the invoice
      await updateDoc(invoiceRef, { isDeleted: true });

      // 🧠 Update UI
      setInvoices((prev) => prev.filter((inv) => inv.id !== invoiceId));

      const invoice = invoices.find((inv) => inv.id === invoiceId);
      if (invoice?.projectId) {
        await decrementPaidAmountByInvoice(invoiceId, invoice.projectId);
      }
      
    } catch (err) {
      console.error("Failed to delete invoice:", err);
    }
  };

  const totalRevenue = invoices
    .filter((inv) => inv.status === "Paid")
    .reduce((sum, inv) => sum + (Number(inv.pendingAmount) || 0), 0);

  const totalPending = invoices
    .filter((inv) => inv.status === "Pending")
    .reduce((sum, inv) => sum + (Number(inv.pendingAmount) || 0), 0);

  const overdueCount = invoices.filter((inv) => {
    const dueDate = new Date(inv.paymentDueDate);
    const today = new Date();
    return inv.status === "Pending" && dueDate < today;
  }).length;

  const upcomingCount = invoices.filter((inv) => {
    const dueDate = new Date(inv.paymentDueDate);
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    return inv.status === "Pending" && dueDate >= today && dueDate <= nextWeek;
  }).length;

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "paid":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "overdue":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getDaysUntilDue = (dueDateString: string, status: string) => {
    if (status.toLowerCase() === "paid") return null;

    const dueDate = new Date(dueDateString);
    const today = new Date();
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return `Overdue by ${Math.abs(diffDays)} days`;
    } else if (diffDays === 0) {
      return "Due today";
    } else {
      return `Due in ${diffDays} days`;
    }
  };

  const formatAmount = (amount: number) => {
    return `₹${amount?.toLocaleString()}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const totalFilteredAmount = filteredInvoices.reduce(
    (sum, inv) => sum + (Number(inv.pendingAmount) || 0),
    0
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Loading invoices...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(-1)}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">
            Invoice Dashboard
          </h1>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-black">
              {formatAmount(totalRevenue)}
            </p>
            <p className="text-sm text-gray-600">Revenue Received</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-black">
              {formatAmount(totalPending)}
            </p>
            <p className="text-sm text-gray-600">Pending Payments</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-black">{overdueCount}</p>
            <p className="text-sm text-gray-600">Overdue Milestones</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-black">{upcomingCount}</p>
            <p className="text-sm text-gray-600">Upcoming Payments (Next 7d)</p>
          </CardContent>
        </Card>
      </div>

      {/* Search Filter */}
      <div className="relative w-full max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          placeholder="Search invoices..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Invoice Table */}
      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-xl">
            <thead className="bg-gray-100">
              <tr>
                {/* <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Invoice Number</th> */}
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                  Invoice Link
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                  Client
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                  Due Date
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                  Milestone
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                  Amount Pending
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                  Payment Status
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map((invoice, index) => {
                const normalizedUrl = invoice.url.startsWith("http")
                  ? invoice.url
                  : `https://${invoice.url}`;
                return (
                  <tr
                    key={invoice.id}
                    className="border-t hover:bg-gray-50 text-xl"
                  >
                    {/* <td className="px-4 py-3 text-sm text-gray-900">INV-{String(index + 1).padStart(3, '0')}</td> */}
                    <td className="px-4 py-3">
                      <a
                        href={normalizedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 underline text-sm"
                      >
                        View Invoice
                      </a>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {invoice.projectName}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {formatDate(invoice.paymentDueDate)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {invoice.milestoneName}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                      {formatAmount(
                        invoice.pendingAmount ? invoice.pendingAmount : 0
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-row items-center gap-2">
                        {invoice.status === "Pending" ? (
                          <Popover>
                            <PopoverTrigger asChild>
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-bold cursor-pointer ${getStatusColor(
                                  invoice.status
                                )} w-fit`}
                              >
                                {invoice.status}
                              </span>
                            </PopoverTrigger>
                            <PopoverContent className="w-32 p-2">
                              <p
                                className="text-sm cursor-pointer bg-green-100 text-green-800 hover:bg-green-200 px-2 py-1 rounded font-medium"
                                onClick={() =>
                                  handleStatusUpdate(invoice.id, "Paid")
                                }
                              >
                                Paid
                              </p>
                            </PopoverContent>
                          </Popover>
                        ) : (
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-bold cursor-not-allowed ${getStatusColor(
                              invoice.status
                            )} w-fit`}
                          >
                            {invoice.status}
                          </span>
                        )}
                        {getDaysUntilDue(
                          invoice.paymentDueDate,
                          invoice.status
                        ) && (
                          <span className="text-xs text-gray-500 font-bold">
                            {getDaysUntilDue(
                              invoice.paymentDueDate,
                              invoice.status
                            )}
                          </span>
                        )}

                        {/* 🗑️ Delete Icon */}
                        <Trash2
                          size={16}
                          className="text-red-500 cursor-pointer hover:text-red-700 ml-4"
                          onClick={() => handleDeleteInvoice(invoice.id)}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredInvoices.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-gray-500"
                  >
                    {searchTerm
                      ? "No invoices found matching your search."
                      : "No invoices available."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Total Amount Row */}
          {filteredInvoices.length > 0 && (
            <div className="border-t bg-gray-50 px-4 py-3">
              <div className="flex justify-end">
                <span className="text-lg font-bold text-gray-900">
                  Total:{" "}
                  {formatAmount(totalFilteredAmount ? totalFilteredAmount : 0)}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default InvoiceDashboard;
