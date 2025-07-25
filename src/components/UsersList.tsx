import React, { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Search, Users as UsersIcon, Building, UserCheck, ArrowLeft, Mail, Phone, FileText, MapPin, User, Calendar, Shield, Briefcase, CreditCard, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  gstno?: string;
  company?: string;
  phonenumber?: string;
  alternatemobile?: string;
  dateOfBirth?: string;
  emergencyContact?: string;
  permanentAddress?: string;
  residentialAddress?: string;
  department?: string;
  expertIn?: string;
  averageIn?: string;
  aadharNumber?: string;
  panNumber?: string;
  dateOfJoining?: string;
}

const Users = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const q = query(collection(db, "users"), orderBy("name"));
      const querySnapshot = await getDocs(q);
      const usersData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as User[];
      setUsers(usersData);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  const clients = users.filter(user => user.role === "client");
  const employees = users.filter(user => user.role === "designer");
  const totalUsers = users.length;

  const filteredClients = clients.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.company && user.company.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredEmployees = employees.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const UserCard = ({ user }: { user: User }) => (
    <Card 
      className="hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => setSelectedUser(user)}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
            <span className="text-lg font-medium text-primary">
              {user.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-foreground">{user.name}</h3>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const UserDetailsDialog = ({ user }: { user: User }) => (
    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-3 pb-4">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
            <span className="text-lg font-medium text-primary">
              {user.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h3 className="text-lg font-semibold">{user.name}</h3>
            <p className="text-sm text-muted-foreground capitalize">{user.role}</p>
          </div>
        </DialogTitle>
      </DialogHeader>
      
      <div className="space-y-6">
        {/* Personal Info Section */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <User className="w-4 h-4 text-primary" />
            <h4 className="font-semibold text-foreground">Personal Info</h4>
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Full Name</p>
                <p className="text-sm font-medium">{user.name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Email ID</p>
                <p className="text-sm font-medium">{user.email}</p>
              </div>
            </div>
            {(user.phonenumber || user.dateOfBirth) && (
              <div className="grid grid-cols-2 gap-4">
                {user.phonenumber && (
                  <div>
                    <p className="text-xs text-muted-foreground">Phone Number</p>
                    <p className="text-sm font-medium">{user.phonenumber}</p>
                  </div>
                )}
                {user.dateOfBirth && (
                  <div>
                    <p className="text-xs text-muted-foreground">Date of Birth</p>
                    <p className="text-sm font-medium">{user.dateOfBirth}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Contact Info Section */}
        {(user.alternatemobile || user.permanentAddress || user.residentialAddress) && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Phone className="w-4 h-4 text-primary" />
              <h4 className="font-semibold text-foreground">Contact Info</h4>
            </div>
            <div className="space-y-3">
              {user.alternatemobile && (
                <div>
                  <p className="text-xs text-muted-foreground">Emergency Contact (Phone number)</p>
                  <p className="text-sm font-medium">{user.alternatemobile}</p>
                </div>
              )}
              {user.permanentAddress && (
                <div>
                  <p className="text-xs text-muted-foreground">Permanent Address</p>
                  <p className="text-sm font-medium">{user.permanentAddress}</p>
                </div>
              )}
              {user.residentialAddress && (
                <div>
                  <p className="text-xs text-muted-foreground">Residential Address</p>
                  <p className="text-sm font-medium">{user.residentialAddress}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Work Details Section */}
        {(user.role || user.department || user.expertIn || user.averageIn || user.company) && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Briefcase className="w-4 h-4 text-primary" />
              <h4 className="font-semibold text-foreground">Work Details</h4>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Role</p>
                  <p className="text-sm font-medium capitalize">{user.role}</p>
                </div>
                {user.department && (
                  <div>
                    <p className="text-xs text-muted-foreground">Department</p>
                    <p className="text-sm font-medium">{user.department}</p>
                  </div>
                )}
              </div>
              {user.company && (
                <div>
                  <p className="text-xs text-muted-foreground">Company</p>
                  <p className="text-sm font-medium">{user.company}</p>
                </div>
              )}
              {user.expertIn && (
                <div>
                  <p className="text-xs text-muted-foreground">Expert In (Tags)</p>
                  <p className="text-sm font-medium">{user.expertIn}</p>
                </div>
              )}
              {user.averageIn && (
                <div>
                  <p className="text-xs text-muted-foreground">Average In (Tags)</p>
                  <p className="text-sm font-medium">{user.averageIn}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Documents Section */}
        {(user.aadharNumber || user.panNumber || user.gstno) && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-primary" />
              <h4 className="font-semibold text-foreground">Documents</h4>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                {user.aadharNumber && (
                  <div>
                    <p className="text-xs text-muted-foreground">Aadhar Number</p>
                    <p className="text-sm font-medium">{user.aadharNumber}</p>
                  </div>
                )}
                {user.panNumber && (
                  <div>
                    <p className="text-xs text-muted-foreground">PAN Number</p>
                    <p className="text-sm font-medium">{user.panNumber}</p>
                  </div>
                )}
              </div>
              {user.gstno && (
                <div>
                  <p className="text-xs text-muted-foreground">GST Number</p>
                  <p className="text-sm font-medium">{user.gstno}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Joining Info Section */}
        {user.dateOfJoining && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-primary" />
              <h4 className="font-semibold text-foreground">Joining Info</h4>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Date of Joining</p>
              <p className="text-sm font-medium">{user.dateOfJoining}</p>
            </div>
          </div>
        )}
      </div>
    </DialogContent>
  );

  if (loading) {
    return (
      <div className="p-6 space-y-6 bg-background min-h-screen">
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-background min-h-screen">
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
        <h1 className="text-3xl font-bold text-foreground">Users Management</h1>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Users
            </CardTitle>
            <UsersIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{totalUsers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Clients
            </CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{clients.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Employees
            </CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{employees.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Search users..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="clients" className="space-y-4">
        <TabsList>
          <TabsTrigger value="clients">Clients</TabsTrigger>
          <TabsTrigger value="employees">Employees</TabsTrigger>
        </TabsList>

        <TabsContent value="clients" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredClients.map((client) => (
              <UserCard key={client.id} user={client} />
            ))}
          </div>
          {filteredClients.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No clients found</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="employees" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredEmployees.map((employee) => (
              <UserCard key={employee.id} user={employee} />
            ))}
          </div>
          {filteredEmployees.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No employees found</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* User Details Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        {selectedUser && <UserDetailsDialog user={selectedUser} />}
      </Dialog>
    </div>
  );
};

export default Users;