import { clsx, type ClassValue } from "clsx";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { twMerge } from "tailwind-merge";
import { db } from "./firebase";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
  });
};

export async function syncPaidAmountFromInvoice(projectId: string) {
  try {
    // 🔍 Step 1: Get all 'Paid' invoices for the project
    const q = query(
      collection(db, "invoiceUrls"),
      where("projectId", "==", projectId),
      where("isDeleted", "==", false),
      where("status", "==", "Paid")
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      console.warn("No paid invoices found.");
      return;
    }

    // ➕ Step 2: Sum all the pendingAmount values
    let totalPaid = 0;
    snapshot.forEach((doc) => {
      const data = doc.data();
      const amt = Number(data.pendingAmount || 0);
      if (!isNaN(amt)) {
        totalPaid += amt;
      }
    });

    // 📝 Step 3: Update the project with the new total
    const projectRef = doc(db, "projects", projectId);
    await updateDoc(projectRef, {
      paidAmount: totalPaid,
    });

    console.log(`✅ Project paidAmount synced to ₹${totalPaid}`);
  } catch (err) {
    console.error("❌ Error syncing paidAmount:", err);
  }
}

export async function decrementPaidAmountByInvoice(
  invoiceId: string,
  projectId: string
) {
  try {
    // 🔍 Step 1: Get the invoice data
    const invoiceRef = doc(db, "invoiceUrls", invoiceId);
    const invoiceSnap = await getDoc(invoiceRef);

    if (!invoiceSnap.exists()) {
      console.error("Invoice not found.");
      return;
    }

    const invoiceData = invoiceSnap.data();

    // Only proceed if the invoice is marked as "Paid"
    if (invoiceData.status !== "Paid") {
      console.warn("Invoice is not marked as Paid. No adjustment made.");
      return;
    }

    const amountToSubtract = Number(invoiceData.pendingAmount || 0);
    if (isNaN(amountToSubtract)) {
      console.warn("Invalid pendingAmount in invoice.");
      return;
    }

    // 🔁 Step 2: Update the project document
    const projectRef = doc(db, "projects", projectId);
    const projectSnap = await getDoc(projectRef);

    if (!projectSnap.exists()) {
      console.error("Project not found.");
      return;
    }

    const currentPaidAmount = Number(projectSnap.data().paidAmount || 0);
    const newPaidAmount = Math.max(0, currentPaidAmount - amountToSubtract);

    await updateDoc(projectRef, {
      paidAmount: newPaidAmount,
    });

    console.log(
      `✅ Decremented paidAmount by ₹${amountToSubtract}. New total: ₹${newPaidAmount}`
    );
  } catch (err) {
    console.error("❌ Failed to decrement paidAmount:", err);
  }
}
