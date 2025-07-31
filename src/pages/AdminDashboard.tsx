import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  Users,
  Briefcase,
  IndianRupee,
  Clock,
  Search,
  Plus,
  Filter,
  Eye,
  Edit,
  Calendar,
  MessageCircle,
  CheckCircleIcon,
  Trash2,
} from "lucide-react";
import { Project } from "@/data/mockData";
import CreateProjectDialog from "@/components/CreateNewProject";
import {
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "@/hooks/use-toast";
import { PopoverClose } from "@radix-ui/react-popover";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import AllowedUsersList from "@/components/AllowedUsersList";
import { formatDate } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import LeaveRequestList from "@/components/LeaveRequestList";
import { useAuth } from "@/contexts/AuthContext";

const AdminDashboard = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [serviceTypeFilter, setServiceTypeFilter] = useState("UI/UX");
  const [projects, setProjects] = useState([]);
  const [editingProject, setEditingProject] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState<any[]>([]);
  const [pendingApprovalCount, setPendingApprovalCount] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const navigate = useNavigate();
  const { user, userRole } = useAuth();

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = onSnapshot(
      collection(db, `users/${user.uid}/notifications`),
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setUnreadNotifications(data);
      }
    );
    return () => unsub();
  }, [user]);

  useEffect(() => {
    const fetchPendingApprovals = async () => {
      try {
        const q = query(
          collectionGroup(db, "tasks"),
          where("isApproved", "==", false),
          where("status", "==", "Completed")
        );
        const snapshot = await getDocs(q);
        const filtered = snapshot.docs.filter(
          (doc) => doc.data().isDeleted !== true
        );
        setPendingApprovalCount(filtered.length); // 👈 Store this in state
      } catch (error) {
        console.error("Error fetching pending approvals:", error);
      }
    };

    fetchPendingApprovals();
  }, []);

  const unreadCount = unreadNotifications.filter((n) => !n.read).length;

  useEffect(() => {
    const q = query(collection(db, "projects"), orderBy("createdDate", "desc"));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const projList = await Promise.all(
        snapshot.docs.map(async (doc) => {
          const projectData = doc.data() as Project; // ✅ ADD THIS TYPE ASSERTION
          const milestonesSnap = await getDocs(
            collection(db, `projects/${doc.id}/milestones`)
          );

          const milestones = milestonesSnap.docs
            .map((d) => d.data())
            .filter((m) => m.isDeleted !== true);

          const total = milestones.length;
          const completed = milestones.filter((m) => m.progress === 100).length;

          const projectProgress =
            total > 0 ? Math.round((completed / total) * 100) : 0;

          if (projectProgress === 100 && projectData.status !== "Completed") {
            await updateDoc(doc.ref, {
              status: "Completed",
              progress: 100,
            });
          } else if (
            projectProgress < 100 &&
            projectData.status === "Completed"
          ) {
            await updateDoc(doc.ref, {
              status: "Active",
              progress: projectProgress,
            });
          } else if (projectProgress !== projectData.progress) {
            await updateDoc(doc.ref, {
              progress: projectProgress,
            });
          }

          return {
            ...projectData,
            id: doc.id,
            progress: projectProgress,
          };
        })
      );
      setProjects(projList);
    });

    return () => unsubscribe();
  }, []);

  // useEffect(() => {
  //   const q = query(collection(db, "projects"), orderBy("createdDate", "desc"));
  //   const unsubscribe = onSnapshot(q, async (snapshot) => {
  //     const projList = await Promise.all(
  //       snapshot.docs.map(async (doc) => {
  //         const projectData = { id: doc.id, ...doc.data() };

  //         const milestonesSnap = await getDocs(
  //           collection(db, `projects/${doc.id}/milestones`)
  //         );

  //         const milestones = milestonesSnap.docs.map((d) => d.data()).filter((m) => m.isDeleted !== true);
  //         const total = milestones.length;
  //         const completed = milestones.filter((m) => m.progress === 100).length;

  //         const projectProgress =
  //           total > 0 ? Math.round((completed / total) * 100) : 0;

  //         return {
  //           ...projectData,
  //           progress: projectProgress,
  //         };
  //       })
  //     );
  //     setProjects(projList);
  //   });

  //   return () => unsubscribe();
  // }, []);

  const updateStatus = async (projectId: string, status: string) => {
    const ref = doc(db, "projects", projectId);
    try {
      await updateDoc(ref, { status });
      toast({
        title: "Success",
        description: "Your project status has been updated.",
      });
    } catch (err) {
      console.error("Failed to update status:", err);
      toast({
        title: "Error",
        description: "Failed to update project status.",
      });
    }
  };

  const handleCreateProject = (newProject: any) => {
    setProjects((prev) => [...prev, newProject]);
  };

  const handleDelete = async (projectId: string) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this project?"
    );
    if (!confirmDelete) return;

    try {
      const ref = doc(db, "projects", projectId);
      await updateDoc(ref, { isDeleted: true });

      toast({
        title: "Deleted",
        description: "Project has been marked as deleted.",
      });
    } catch (err) {
      console.error("Failed to mark project as deleted:", err);
      toast({
        title: "Error",
        description: "Failed to delete project.",
      });
    }
  };

  const filteredProjects = projects.filter((project) => {
    const matchesSearch =
      project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.designer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || project.status === statusFilter;
    const matchesServiceType = project.serviceType === serviceTypeFilter;
    const isVisible = !project.isDeleted; // 👈 Only show non-deleted
    return matchesSearch && matchesStatus && matchesServiceType && isVisible;
  });

  const totalProjects = projects.filter(
    (project) => project.isDeleted !== true
  ).length;
  const completedProjects = projects.filter(
    (p) => p.status === "Completed" && p.isDeleted !== true
  ).length;
  const activeProjects = projects.filter((p) => p.isDeleted !== true);
  const totalRevenue = activeProjects.reduce((sum, p) => sum + p.paidAmount, 0);
  const pendingRevenue = activeProjects.reduce(
    (sum, p) => sum + (p.totalAmount - p.paidAmount),
    0
  );

  const visibleProjects = showAll
    ? filteredProjects
    : filteredProjects.slice(0, 4);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "bg-green-100 text-green-800 hover:bg-green-200";
      case "Completed":
        return "bg-blue-100 text-blue-800 hover:bg-blue-200";
      case "On Hold":
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-200";
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-200";
    }
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Super Admin Dashboard
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">
            Complete overview of all projects and operations
          </p>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button
            onClick={() => {
              setEditingProject(null);
              setOpenDialog(true);
            }}
            className="flex items-center gap-2 px-3 py-2 text-sm md:text-base md:px-4 md:py-2"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Create New Project</span>
            <span className="inline sm:hidden">New Project</span>
          </Button>

          <CreateProjectDialog
            onCreate={handleCreateProject}
            editProject={editingProject}
            mode={editingProject ? "edit" : "create"}
            open={openDialog}
            onOpenChange={(val) => {
              setOpenDialog(val);
              if (!val) setEditingProject(null);
            }}
          />
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Projects
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {totalProjects}
                </p>
              </div>
              <Briefcase className="w-8 h-8 text-blue-600 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-gray-900">
                  {completedProjects}
                </p>
              </div>
              <Clock className="w-8 h-8 text-green-600 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Revenue
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  ₹{totalRevenue.toLocaleString()}
                </p>
              </div>
              <IndianRupee className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Pending Revenue
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  ₹{pendingRevenue.toLocaleString()}
                </p>
              </div>
              <Users className="w-8 h-8 text-orange-600 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Unread Notificaions
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {unreadCount}
                </p>
              </div>
              <MessageCircle className="w-8 h-8 text-orange-600 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Pending Approvals
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {pendingApprovalCount}
                </p>
              </div>
              <CheckCircleIcon className="w-8 h-8 text-orange-600 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search projects, clients, or designers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 placeholder:text-xs sm:placeholder:text-sm"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="On Hold">On Hold</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Projects Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Projects Overview</CardTitle>
          <div className="flex gap-2 border-b">
            {["UI/UX", "Dev", "Legal"].map((type) => (
              <button
                key={type}
                onClick={() => setServiceTypeFilter(type)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  serviceTypeFilter === type
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {visibleProjects.map((project) => (
              <div
                key={project.id}
                className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
                  <div className="lg:col-span-3">
                    <h3 className="font-semibold text-gray-900">
                      {project.name}
                    </h3>
                    <p className="text-sm text-gray-600">{project.client}</p>
                    <div>
                      <p
                        className={`text-sm text-muted-foreground break-words ${
                          expanded ? "" : "line-clamp-2"
                        }`}
                      >
                        {project.brief}
                      </p>
                      {project.brief.length > 100 && (
                        <button
                          onClick={() => setExpanded(!expanded)}
                          className="text-xs text-green-900 hover:underline mt-1"
                        >
                          {expanded ? "View Less" : "View More"}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="lg:col-span-2">
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Progress</span>
                        <span className="font-medium">{project.progress}%</span>
                      </div>
                      <Progress value={project.progress} className="h-2" />
                    </div>
                  </div>

                  <div className="lg:col-span-1">
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="focus:outline-none">
                          <Badge
                            className={`cursor-pointer ${getStatusColor(
                              project.status
                            )}`}
                          >
                            {project.status}
                          </Badge>
                        </button>
                      </PopoverTrigger>

                      <PopoverContent
                        className="w-44 p-2 space-y-1"
                        align="start"
                        side="top"
                      >
                        {["Active", "On Hold", "Completed"].map(
                          (statusOption) => (
                            <PopoverClose asChild key={statusOption}>
                              <div
                                className={`text-sm px-2 py-1 rounded cursor-pointer hover:bg-gray-100 ${getStatusColor(
                                  statusOption
                                )}`}
                                onClick={() =>
                                  updateStatus(project.id, statusOption)
                                }
                              >
                                {statusOption}
                              </div>
                            </PopoverClose>
                          )
                        )}
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="lg:col-span-2">
                    <p className="text-sm text-gray-600">Manager</p>
                    <p className="font-medium">{project.manager.name}</p>
                  </div>

                  <div className="lg:col-span-2">
                    <p className="text-sm text-gray-600">POC</p>
                    <p className="font-medium">{project.poc.name}</p>
                  </div>

                  <div className="lg:col-span-2">
                    <p className="text-sm text-gray-600">Team Members</p>
                    <ul className="list-disc list-inside font-medium text-sm text-gray-800">
                      {project.teamMembers?.map((member: any) => (
                        <li key={member.id}>{member.name}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="lg:col-span-2">
                    <p className="text-sm text-gray-600">Payment</p>
                    <p className="font-medium">
                      ₹{project.paidAmount.toLocaleString()} / ₹
                      {project.totalAmount.toLocaleString()}
                    </p>
                  </div>

                  <div className="lg:col-span-1">
                    <p className="text-sm text-gray-600">Start Date</p>
                    <p className="font-medium">
                      {formatDate(project.startDate)}
                    </p>
                  </div>

                  <div className="lg:col-span-1">
                    <p className="text-sm text-gray-600">End Date</p>
                    <p className="font-medium">{formatDate(project.endDate)}</p>
                  </div>

                  <div className="lg:col-span-1">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/project/${project.id}`)}
                      >
                        <Eye className="w-3 h-3" />
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingProject(project);
                          setOpenDialog(true);
                        }}
                      >
                        <Edit className="w-3 h-3" />
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(project.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>

                {project.pendingFeedback.length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <div className="flex items-center gap-2 text-sm text-orange-600">
                      <span className="font-medium">Pending Feedback:</span>
                      <span>{project.pendingFeedback.join(", ")}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {filteredProjects.length > 4 && (
              <div className="text-center pt-4">
                <button
                  className="text-blue-600 hover:underline font-medium"
                  onClick={() => setShowAll((prev) => !prev)}
                >
                  {showAll ? "View Less" : "View More"}
                </button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      {/* Allowed users list component */}

      <Accordion
        type="single"
        collapsible
        className="border rounded-md"
        defaultValue="allowed-users" // ✅ This opens it by default
      >
        <AccordionItem value="allowed-users">
          <AccordionTrigger className="no-underline hover:no-underline focus:no-underline ml-2 font-bold text-lg">
            Allowed Users
          </AccordionTrigger>
          <AccordionContent>
            <AllowedUsersList />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
      <LeaveRequestList />
    </div>
  );
};

export default AdminDashboard;
