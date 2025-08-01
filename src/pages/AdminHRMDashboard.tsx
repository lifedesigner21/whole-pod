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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Users,
  Calendar as CalendarIcon,
  Clock,
  AlertCircle,
  Search,
  Filter,
  CheckCircle,
  X,
  Coffee,
} from "lucide-react";
import { db } from "@/lib/firebase";
import {
  collection,
  collectionGroup,
  onSnapshot,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { format, isToday } from "date-fns";

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  department: string;
  leaveQuota?: number;
}

interface LeaveRequest {
  id: string;
  userId: string;
  leaveType: string;
  status: "Pending" | "Approved" | "Rejected";
  leaveFrom: any;
  leaveTo: any;
  requestedBy: string;
}

interface Task {
  id: string;
  assignedTo: string;
  status: string;
  completedAt: any;
  createdAt: any;
}

interface EmployeeAttendance {
  user: User;
  status: "Present" | "On Leave" | "Absent";
  leaveType?: string;
  leavesTakenThisMonth: number;
  leavesRemaining: number;
}

const AdminHRMDashboard = () => {
  const { user, userRole } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [attendanceData, setAttendanceData] = useState<EmployeeAttendance[]>([]);

  // Fetch users
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "users"), (snapshot) => {
      const userData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as User[];
      setUsers(userData.filter((u) => u.role !== "admin"));
    });
    return () => unsubscribe();
  }, []);

  // Fetch leave requests
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collectionGroup(db, "leaveRequests"),
      (snapshot) => {
        const leaveData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as LeaveRequest[];
        setLeaveRequests(leaveData);
      }
    );
    return () => unsubscribe();
  }, []);

  // Fetch tasks
  useEffect(() => {
    const unsubscribe = onSnapshot(collectionGroup(db, "tasks"), (snapshot) => {
      const taskData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Task[];
      setTasks(taskData);
    });
    return () => unsubscribe();
  }, []);

  // Calculate attendance data
  useEffect(() => {
    const calculateAttendance = () => {
      console.log("🔍 Starting attendance calculation for", users.length, "users");
      console.log("📊 Total tasks:", tasks.length);
      console.log("📋 Total leave requests:", leaveRequests.length);
      console.log("📅 Selected date:", selectedDate);
      
      const attendance: EmployeeAttendance[] = users.map((user) => {
        console.log(`\n👤 Calculating attendance for: ${user.name} (ID: ${user.id})`);
        
        // Check if user has completed any task on selected date
        const userTasks = tasks.filter((task) => task.assignedTo === user.id);
        console.log(`📝 User has ${userTasks.length} total tasks assigned`);
        
        const selectedDateTasks = tasks.filter((task) => {
          if (task.assignedTo !== user.id) return false;
          
          // Check if task is completed
          if (task.status !== "Completed") return false;
          
          console.log(`🔍 Found completed task for ${user.name}:`, {
            id: task.id,
            status: task.status,
            completedAt: task.completedAt,
            createdAt: task.createdAt
          });
          
          // Case 1: Task has completedAt timestamp
          if (task.completedAt) {
            try {
              const completedDate = task.completedAt.toDate ? 
                task.completedAt.toDate() : 
                new Date(task.completedAt.seconds * 1000);
              
              const isSameDate = completedDate.toDateString() === selectedDate.toDateString();
              if (isSameDate) {
                console.log(`✅ Task completed on selected date (with completedAt): ${task.id} at ${completedDate}`);
              }
              return isSameDate;
            } catch (error) {
              console.error("❌ Error processing completedAt date:", error, task);
              return false;
            }
          }
          
          // Case 2: Task is marked as completed but no completedAt timestamp
          // Check if it was created/updated on selected date (fallback)
          if (task.createdAt) {
            try {
              let dateToCheck;
              
              // Handle different date formats
              if (typeof task.createdAt === 'string') {
                dateToCheck = new Date(task.createdAt);
              } else if (task.createdAt.toDate) {
                dateToCheck = task.createdAt.toDate();
              } else if (task.createdAt.seconds) {
                dateToCheck = new Date(task.createdAt.seconds * 1000);
              } else {
                console.error("❌ Unable to parse createdAt date:", task.createdAt);
                return false;
              }
              
              const isSameDate = dateToCheck.toDateString() === selectedDate.toDateString();
              if (isSameDate) {
                console.log(`✅ Task completed on selected date (using createdAt as fallback): ${task.id} at ${dateToCheck}`);
              }
              return isSameDate;
            } catch (error) {
              console.error("❌ Error processing createdAt date:", error, task);
              return false;
            }
          }
          
          console.log(`⚠️ Completed task has no valid timestamp: ${task.id}`);
          return false;
        });
        
        console.log(`📅 Tasks completed on selected date: ${selectedDateTasks.length}`);

        // Check if user has leave request for selected date
        const userLeaves = leaveRequests.filter((leave) => leave.userId === user.id);
        console.log(`🏖️ User has ${userLeaves.length} total leave requests`);
        
        const selectedDateLeave = leaveRequests.find((leave) => {
          if (leave.userId !== user.id || leave.status !== "Approved") return false;
          if (!leave.leaveFrom || !leave.leaveTo) return false;
          
          try {
            // Handle different date formats for leaveFrom and leaveTo
            let startDate, endDate;
            
            if (typeof leave.leaveFrom === 'string') {
              startDate = new Date(leave.leaveFrom);
            } else if (leave.leaveFrom.toDate) {
              startDate = leave.leaveFrom.toDate();
            } else if (leave.leaveFrom.seconds) {
              startDate = new Date(leave.leaveFrom.seconds * 1000);
            } else {
              console.error("❌ Unable to parse leaveFrom date:", leave.leaveFrom);
              return false;
            }
            
            if (typeof leave.leaveTo === 'string') {
              endDate = new Date(leave.leaveTo);
            } else if (leave.leaveTo.toDate) {
              endDate = leave.leaveTo.toDate();
            } else if (leave.leaveTo.seconds) {
              endDate = new Date(leave.leaveTo.seconds * 1000);
            } else {
              console.error("❌ Unable to parse leaveTo date:", leave.leaveTo);
              return false;
            }
            
            // Reset time to compare only dates
            const selectedDateOnly = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
            const startDateOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
            const endDateOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
            
            const isOnLeaveOnSelectedDate = selectedDateOnly >= startDateOnly && selectedDateOnly <= endDateOnly;
            if (isOnLeaveOnSelectedDate) {
              console.log(`🏖️ On leave on selected date: ${leave.leaveType} from ${startDate} to ${endDate}`);
            }
            return isOnLeaveOnSelectedDate;
          } catch (error) {
            console.error("❌ Error processing leave date:", error, leave);
            return false;
          }
        });

        // Calculate leaves taken in selected month
        const selectedMonth = selectedDate.getMonth();
        const selectedYear = selectedDate.getFullYear();
        
        const leavesThisMonth = leaveRequests.filter((leave) => {
          if (leave.userId !== user.id || leave.status !== "Approved") return false;
          if (!leave.leaveFrom) return false;
          
          try {
            let leaveDate;
            if (typeof leave.leaveFrom === 'string') {
              leaveDate = new Date(leave.leaveFrom);
            } else if (leave.leaveFrom.toDate) {
              leaveDate = leave.leaveFrom.toDate();
            } else if (leave.leaveFrom.seconds) {
              leaveDate = new Date(leave.leaveFrom.seconds * 1000);
            } else {
              console.error("❌ Unable to parse leaveFrom date for month calculation:", leave.leaveFrom);
              return false;
            }
            
            return leaveDate.getMonth() === selectedMonth && 
                   leaveDate.getFullYear() === selectedYear;
          } catch (error) {
            console.error("❌ Error processing leave date for month calculation:", error);
            return false;
          }
        }).length;

        // Determine status
        let status: "Present" | "On Leave" | "Absent";
        let leaveType: string | undefined;

        if (selectedDateLeave) {
          status = "On Leave";
          leaveType = selectedDateLeave.leaveType;
          console.log(`📊 Final status: ON LEAVE (${leaveType})`);
        } else if (selectedDateTasks.length > 0) {
          status = "Present";
          console.log(`📊 Final status: PRESENT (${selectedDateTasks.length} tasks completed on selected date)`);
        } else {
          status = "Absent";
          console.log(`📊 Final status: ABSENT (no tasks completed, no approved leave)`);
        }

        return {
          user,
          status,
          leaveType,
          leavesTakenThisMonth: leavesThisMonth,
          leavesRemaining: 2 - leavesThisMonth, // Changed from 12 to 2
        };
      });

      console.log("\n📈 Attendance Summary:");
      console.log("Present:", attendance.filter(a => a.status === "Present").length);
      console.log("On Leave:", attendance.filter(a => a.status === "On Leave").length);
      console.log("Absent:", attendance.filter(a => a.status === "Absent").length);

      setAttendanceData(attendance);
    };

    if (users.length > 0) {
      calculateAttendance();
    }
  }, [users, leaveRequests, tasks, selectedDate]);

  // Filter attendance data
  const filteredAttendance = attendanceData.filter((item) => {
    const matchesSearch = 
      item.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.user.role.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDepartment = 
      departmentFilter === "all" || item.user.department === departmentFilter;
    
    return matchesSearch && matchesDepartment;
  });

  // Calculate stats for selected date
  const totalEmployees = users.length;
  const presentOnSelectedDate = attendanceData.filter((item) => item.status === "Present").length;
  const onLeaveOnSelectedDate = attendanceData.filter((item) => item.status === "On Leave").length;
  const pendingRequests = leaveRequests.filter((req) => req.status === "Pending").length;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Present":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "On Leave":
        return <Coffee className="w-4 h-4 text-orange-600" />;
      case "Absent":
        return <X className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Present":
        return <Badge className="bg-green-100 text-green-800">Present</Badge>;
      case "On Leave":
        return <Badge className="bg-orange-100 text-orange-800">On Leave</Badge>;
      case "Absent":
        return <Badge className="bg-red-100 text-red-800">Absent</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">Unknown</Badge>;
    }
  };

  if (userRole !== "admin") {
    return <div>Access Denied</div>;
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            HRM Dashboard
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">
            Manage employee attendance and leave requests for {format(selectedDate, "MMMM yyyy")}
          </p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Employees
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {totalEmployees}
                </p>
              </div>
              <Users className="w-8 h-8 text-blue-600 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Present on {format(selectedDate, "MMM d")}</p>
                <p className="text-2xl font-bold text-gray-900">
                  {presentOnSelectedDate}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  On Leave on {format(selectedDate, "MMM d")}
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {onLeaveOnSelectedDate}
                </p>
              </div>
              <Coffee className="w-8 h-8 text-orange-600 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Pending Requests
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {pendingRequests}
                </p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-600 flex-shrink-0" />
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
                  placeholder="Search employees..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                <SelectItem value="development">Development</SelectItem>
                <SelectItem value="design">Design</SelectItem>
                <SelectItem value="legal">Legal</SelectItem>
                <SelectItem value="management">Management</SelectItem>
              </SelectContent>
            </Select>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full sm:w-64 justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(selectedDate, "PPP")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  disabled={(date) => date > new Date()}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
        </CardContent>
      </Card>

      {/* Employee Attendance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Employee Attendance & Leave Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Leave Type</TableHead>
                  <TableHead>Leaves Taken (This Month)</TableHead>
                  <TableHead>Leave Quota</TableHead>
                  <TableHead>Leaves Remaining</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAttendance.map((item) => (
                  <TableRow key={item.user.id}>
                    <TableCell className="font-medium">
                      <div>
                        <p className="font-semibold">{item.user.name}</p>
                        <p className="text-sm text-gray-600">{item.user.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>{item.user.role}</TableCell>
                    <TableCell>{item.user.department || "N/A"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(item.status)}
                        {getStatusBadge(item.status)}
                      </div>
                    </TableCell>
                    <TableCell>{item.leaveType || "-"}</TableCell>
                    <TableCell>{item.leavesTakenThisMonth}</TableCell>
                    <TableCell>{item.user.leaveQuota || 2}</TableCell>
                    <TableCell>
                      <span className={item.leavesRemaining < 3 ? "text-red-600 font-semibold" : ""}>
                        {item.leavesRemaining}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminHRMDashboard;