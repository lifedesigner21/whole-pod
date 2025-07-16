export type ProjectStatus = "Completed" | "Active" | "On Hold" ;

export type Project = {
  id: string;
  name: string;
  client: string;
  designer: string;
  progress: number;
  status: ProjectStatus;
  pendingFeedback: any[];
  paidAmount: number;
  totalAmount: number;
  startDate: string;
  endDate: string;
  description: string;
  dueDate: string;
  createdDate: string;
  tasksCompleted: number;
  totalTasks: number;
  revisionsUsed: number;
  milestones: any[];
  maxRevisions: number;
  [key: string]: any;
  breif?: string;
};

export interface Milestone {
  id: string;
  name: string;
  title: string;
  podDesigner: string;
  description: string;
  amount?: number;
  endDate: string;
  startDate;
  string;
  assignedDesigner: string;
  paymentAmount: number;
  paymentStatus: "Paid" | "Pending" | "Overdue";
  status: "Pending" | "In Progress" | "Completed" | "Revision Required";
  comments?: Comment[];
  files?: FileAttachment[];
  tasks?: Task[];
  revisionsUsed?: number;
}


export interface Task {
  id: string;
  name: string;
  status: string;
}

export type Message = {
  id: string;
  content: string;
  senderId: string;
  senderRole: string;
  timestamp: any;
};


export interface Comment {
  id: string;
  author: string;
  content: string;
  timestamp: string;
  type: "feedback" | "approval" | "revision";
}

export interface FileAttachment {
  id: string;
  name: string;
  url: string;
  uploadedBy: string;
  uploadDate: string;
  type: "image" | "document" | "design";
  link?: string; 
}

export interface TaskHistory {
  date: string;
  tasksCompleted: number;
  hoursLogged: number;
  closedAt: string;
}


export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  date: string;
  time: string;
  tag: string;
  actions: string[];
}
export interface Invoice {
  id: string;
  invoiceId: string;
  project?: string;
  amount: number;
  description: string;
  dueText: string;
  tag: string;
  statusColor: string; // e.g., "bg-yellow-500", "bg-red-500"
  fileLink:string;
}


export const mockNotifications: Notification[] = [
  {
    id: "1",
    type: "✅ Completed Alert",
    title: "Final Logo Files Ready",
    message: "Final logo pack and brand manual have been uploaded.",
    date: "6 July 2025",
    time: "12:30am",
    tag: "MetroM Branding",
    actions: ["Open Link"],
  },
  {
    id: "2",
    type: "🟡 Approval Required",
    title: "Static 3 Caption – Awaiting Approval",
    message:
      "Please review & approve the caption + visual shared for Static 3 (Instagram).",
    date: "Due Date: 7 July 2025",
    time: "12:30am",
    tag: "MetroM SMM",
    actions: ["Approve", "Request Revision"],
  },
  {
    id: "3",
    type: "📞 Meeting Reminder",
    title: "PPT Discussion Call",
    message:
      "“Your kickoff call for SMM deck is scheduled at 4 PM on 10 July.”",
    date: "9 July 2025",
    time: "12:30am",
    tag: "Collaterals",
    actions: ["Join Call"],
  },
];

export const mockInvoices:Invoice[] = [
  {
    id: "1",
    invoiceId: "INV-M4",
    project: "MetroM Branding",
    description: "M4 – Brand Manual",
    amount: 30000,
    tag: "SMM",
    statusColor: "bg-yellow-400",
    dueText: "Due in 3 days (10th July 2025)",
    fileLink: "https://example.com/invoice/inv-m4.pdf",
  },
  {
    id: "2",
    invoiceId: "INV-M3",
    project: "MetroM Branding",
    description: "M3 – Final Logo Pack",
    amount: 25000,
    tag: "SMM",
    statusColor: "bg-red-500",
    dueText: "Overdue by 7 days",
    fileLink: "https://example.com/invoice/inv-m3.pdf",
  },
  {
    id: "3",
    invoiceId: "INV-MONTH1",
    project: "SMM – Coffee Brand",
    description: "Month 1",
    amount: 45000,
    tag: "Website UIUX",
    statusColor: "bg-red-500",
    dueText: "Overdue by 7 days",
    fileLink: "https://example.com/invoice/inv-month1.pdf",
  },
];




export const mockTaskHistory: TaskHistory[] = [
  {
    date: "01 Jul 2025",
    tasksCompleted: 5,
    hoursLogged: 7.5,
    closedAt: "6:45 PM",
  },
  {
    date: "30 Jun 2025",
    tasksCompleted: 3,
    hoursLogged: 6.0,
    closedAt: "5:30 PM",
  },
  {
    date: "29 Jun 2025",
    tasksCompleted: 4,
    hoursLogged: 8.0,
    closedAt: "7:00 PM",
  },
  {
    date: "28 Jun 2025",
    tasksCompleted: 2,
    hoursLogged: 4.5,
    closedAt: "3:15 PM",
  },
  {
    date: "27 Jun 2025",
    tasksCompleted: 6,
    hoursLogged: 8.5,
    closedAt: "7:30 PM",
  },
];

export const mockPerformanceData = {
  clientRating: 4.8,
  pmRating: 4.6,
  onTimeDelivery: 92,
  avgRevisions: 2.3,
  totalProjects: 24,
  completedProjects: 18,
  hoursToday: 4.5,
  expectedHours: 8,
  tasksDueToday: 3,
  pendingFeedback: 2,
};
