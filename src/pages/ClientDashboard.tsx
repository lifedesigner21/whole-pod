import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ProjectCard from "@/components/ProjectCard";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import {
  mockNotifications,
  Notification,
  Project,
  mockInvoices,
} from "@/data/mockData";
import { BadgeCheck, AlertCircle, PhoneCall } from "lucide-react";
// import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { where } from "firebase/firestore";

const ClientDashboard = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjects, setActiveProjects] = useState(0);
  const [completedProjects, setCompletedProjects] = useState(0);
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [unpaidInvoices, setUnpaidInvoices] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.uid) return;

    const fetchProjects = async () => {
      try {
        if (!user?.uid) return;

        const q = query(
          collection(db, "projects"),
          where("clientId", "==", user.uid)
        );

        const snapshot = await getDocs(q);
        const allProjects: Project[] = [];
        let active = 0;
        let completed = 0;
        let approvals = 0;
        let invoices = 0;

        snapshot.forEach((doc) => {
          const project = { id: doc.id, ...(doc.data() as Project) };
          if (project.isDeleted) return;
          allProjects.push(project);

          if (project.status === "Completed") {
            completed++;
          } else if (project.status === "Active") {
            active++;
          }

          if (
            Array.isArray(project.pendingFeedback) &&
            project.pendingFeedback.length > 0
          ) {
            approvals++;
          }

          if ((project.paidAmount ?? 0) < (project.totalAmount ?? 0)) {
            invoices++;
          }
        });

        setProjects(allProjects);
        setActiveProjects(active);
        setCompletedProjects(completed);
        setPendingApprovals(approvals);
        setUnpaidInvoices(invoices);
      } catch (err) {
        console.error("Error loading projects:", err);
        setError("Failed to load project data.");
      }
    };

    fetchProjects();

    const fetchNotifications = async () => {
      try {
        const q = query(
          collection(db, "notifications"),
          orderBy("timestamp", "desc"),
          limit(3)
        );
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
          setNotifications(mockNotifications);
        } else {
          const data = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...(doc.data() as Notification),
          }));
          setNotifications(data);
        }
      } catch (err) {
        console.warn("Using mock notifications due to error:", err);
        setNotifications(mockNotifications);
      }
    };

    fetchNotifications();
    // const fetchNotifications = async () => {
    //   const q = query(
    //     collection(db, "notifications"),
    //     orderBy("timestamp", "desc"),
    //     limit(3)
    //   );
    //   const snapshot = await getDocs(q);
    //   const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    //   setNotifications(data);
    // };

    // fetchNotifications();
  }, [user]);

  const handleViewDetails = (projectId: string) => {
    navigate(`/client/project/${projectId}`);
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Client Dashboard</h1>
        <p className="text-gray-600 mt-1">
          Track your projects and collaborate with designers
        </p>
      </div>
      <div className="flex justify-end">
        {mockInvoices.length >= 3 && (
          <div className="text-center mt-4">
            <button
              onClick={() => navigate("/client/invoices")}
              className="bg-black text-white px-6 py-2 rounded hover:bg-gray-800 text-sm"
            >
              Go to my Invoices
            </button>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-2xl font-bold text-indigo-600">
              {activeProjects}
            </p>
            <p className="text-sm text-gray-600">Active Projects</p>
            {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-2xl font-bold text-green-600">
              {completedProjects}
            </p>
            <p className="text-sm text-gray-600">Completed Projects</p>
          </CardContent>
        </Card>
        {/* <Card>
          <CardContent className="p-6 text-center">
            <p className="text-2xl font-bold text-yellow-600">
              {pendingApprovals}
            </p>
            <p className="text-sm text-gray-600">Pending Approvals</p>
          </CardContent>
        </Card> */}
        <Card className="hidden">
          <CardContent className=" p-6 text-center">
            <p className="text-2xl font-bold text-red-600">{unpaidInvoices}</p>
            <p className="text-sm text-gray-600">Invoices to be Paid</p>
          </CardContent>
        </Card>
      </div>

      {/* Inbox and Notifications */}
      {/* {notifications.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-md mt-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Inbox/Notifications{" "}
            <span className="text-sm font-normal text-gray-500">
              ({notifications.length} notifications)
            </span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {notifications.map((notif) => (
              <Card key={notif.id} className="bg-gray-100">
                <CardContent className="p-4 space-y-2">
                  <div className="flex justify-between text-sm text-gray-500 items-center">
                    <div className="flex items-center gap-1">
                      {notif.type === "Completed Alert" && (
                        <BadgeCheck className="w-4 h-4 text-green-600" />
                      )}
                      {notif.type === "Approval Required" && (
                        <AlertCircle className="w-4 h-4 text-yellow-500" />
                      )}
                      {notif.type === "Meeting Reminder" && (
                        <PhoneCall className="w-4 h-4 text-gray-500" />
                      )}
                      <span className="font-medium text-gray-700">
                        {notif.type}
                      </span>
                    </div>
                    <div className="text-right text-xs">
                      <span>
                        {notif.date} • {notif.time}
                      </span>
                      <p>
                        {format(
                          new Date(notif.timestamp?.seconds * 1000),
                          "d MMM yyyy"
                        )}
                      </p>
                      <p>
                        {format(
                          new Date(notif.timestamp?.seconds * 1000),
                          "h:mmaaa"
                        )}
                      </p>
                    </div>
                  </div>

                  <h3 className="font-semibold text-lg text-gray-800">
                    {notif.title}
                  </h3>

                  <p className="text-sm text-gray-600">{notif.message}</p>

                  {notif.tag && (
                    <span className="inline-block bg-gray-300 text-xs px-2 py-0.5 rounded-full text-gray-800">
                      {notif.tag}
                    </span>
                  )}

                  <div className="mt-2 flex flex-wrap gap-2">
                    {(notif.actions || []).map(
                      (action: string, index: number) => (
                        <button
                          key={index}
                          className="bg-black text-white px-3 py-1 text-sm rounded hover:bg-gray-800"
                        >
                          {action}
                        </button>
                      )
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center mt-4">
            <button
              onClick={() => navigate("/client/inbox")}
              className="bg-black text-white px-6 py-2 rounded hover:bg-gray-800 text-sm"
            >
              Go to my inbox
            </button>
          </div>
        </div>
      )} */}

      {/* Project List */}
      <Card>
        <CardHeader>
          <CardTitle>Active Projects</CardTitle>
        </CardHeader>
        <CardContent>
          {projects.filter((p) => p.status === "Active").length === 0 ? (
            <div className="text-center text-gray-500 text-sm col-span-full">
              No projects found.
              <br />
              {/* <span className="text-blue-600 underline cursor-pointer">
                Do you want to open a new project with us?
              </span> */}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {projects
                .filter((project) => project.status === "Active")
                .map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    onViewDetails={handleViewDetails}
                    showClientInfo={false}
                    showDesignerInfo={true}
                  />
                ))}
            </div>
          )}
        </CardContent>
      </Card>
      {/* Projects on Hold */}
      {projects.some((p) => p.status === "On Hold") && (
        <Card>
          <CardHeader>
            <CardTitle>Projects on Hold</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {projects
                .filter((project) => project.status === "On Hold")
                .map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    onViewDetails={handleViewDetails}
                    showClientInfo={false}
                    showDesignerInfo={true}
                  />
                ))}
            </div>
          </CardContent>
        </Card>
      )}
      {/* Completed Projects */}
      {projects.some((p) => p.status === "Completed") && (
        <Card>
          <CardHeader>
            <CardTitle>Completed Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {projects
                .filter(
                  (project) =>
                    project.status === "Completed" && project.isDeleted !== true
                )
                .map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    onViewDetails={handleViewDetails}
                    showClientInfo={false}
                    showDesignerInfo={true}
                  />
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Overdue */}
      {/* <div className="bg-white p-6 rounded-lg shadow-md mt-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Payment Overdue{" "}
          <span className="text-sm font-normal text-gray-500">
            ({mockInvoices.length} invoice)
          </span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {mockInvoices.map((inv) => (
            <Card key={inv.id} className="bg-gray-100">
              <CardContent className="p-4 space-y-2">
                <h3 className="font-bold text-lg text-black">
                  ₹{inv.amount}/-
                </h3>
                <div className="font-medium text-sm">
                  Invoice #{inv.invoiceId}
                </div>
                <p className="text-sm text-gray-600">{inv.description}</p>
                <div className="flex justify-between items-center text-xs text-gray-600">
                  <div className="flex items-center gap-1">
                    <span
                      className={`w-2 h-2 rounded-full ${inv.statusColor}`}
                    ></span>
                    <span>{inv.dueText}</span>
                  </div>
                  <span className="bg-gray-300 px-2 py-0.5 rounded-full text-gray-800">
                    {inv.tag}
                  </span>
                </div>
                <div className="mt-3 flex gap-2">
                  <button className="bg-black text-white px-3 py-1 text-sm rounded hover:bg-gray-800">
                    View Invoice
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        {mockInvoices.length >= 3 && (
          <div className="text-center mt-4">
            <button
              onClick={() => navigate("/client/invoices")}
              className="bg-black text-white px-6 py-2 rounded hover:bg-gray-800 text-sm"
            >
              Go to my Invoices
            </button>
          </div>
        )}
      </div> */}
    </div>
  );
};

export default ClientDashboard;
