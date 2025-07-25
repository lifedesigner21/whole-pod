import { clsx, type ClassValue } from "clsx";
import { collection, doc, getDoc, getDocs, query, updateDoc, where } from "firebase/firestore";
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
