import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

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

export async function syncPaidAmountFromInvoice(projectId: string, milestoneId: string) {
  try {
    // Step 1: Query the invoiceUrls collection for the matching invoice
    const q = query(
      collection(db, "invoiceUrls"),
      where("projectId", "==", projectId),
      where("milestoneId", "==", milestoneId),
      where("status", "==", "paid") // only process if already paid
    );

    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      console.warn("No PAID invoice found for this milestone and project.");
      return;
    }

    // Assuming one invoice per milestone
    const invoiceDoc = querySnapshot.docs[0];
    const invoiceData = invoiceDoc.data();
    const pendingAmount = Number(invoiceData.pendingAmount || 0);

    if (!pendingAmount || isNaN(pendingAmount)) {
      console.error("Invalid pendingAmount on invoice.");
      return;
    }

    // Step 2: Fetch the project document
    const projectRef = doc(db, "projects", projectId);
    const projectSnap = await getDoc(projectRef);

    if (!projectSnap.exists()) {
      console.error("Project document not found.");
      return;
    }

    const currentPaidAmount = Number(projectSnap.data().paidAmount || 0);
    const updatedPaidAmount = currentPaidAmount + pendingAmount;

    // Step 3: Update the paidAmount in the project
    await updateDoc(projectRef, {
      paidAmount: updatedPaidAmount,
    });

    console.log(`✅ Paid amount updated to ₹${updatedPaidAmount} for project ${projectId}`);
  } catch (error) {
    console.error("❌ Error updating paid amount:", error);
  }
}
