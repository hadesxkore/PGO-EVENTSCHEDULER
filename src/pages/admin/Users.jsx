import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useTheme } from "@/contexts/ThemeContext";
import {
  Search,
  Filter,
  User,
  Mail,
  Building2,
  MoreHorizontal,
  Shield,
  UserPlus,
  Pencil,
  Trash2,
  CheckCircle,
  XCircle,
} from "lucide-react";
import {
  Input
} from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

import { getAllUsers, getActiveUsers, getAdminUsers, updateUser } from "@/lib/firebase/users";

const roleColors = {
  admin: "bg-purple-500/10 text-purple-500",
  user: "bg-blue-500/10 text-blue-500",
};

const statusColors = {
  active: "bg-green-500/10 text-green-500",
  inactive: "bg-red-500/10 text-red-500",
};

const Users = () => {
  const { isDarkMode } = useTheme();
  const [users, setUsers] = useState([]);
  const [activeUsersCount, setActiveUsersCount] = useState(0);
  const [adminUsersCount, setAdminUsersCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [tableSearchTerm, setTableSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;
  const [selectedUser, setSelectedUser] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [usersResult, activeCount, adminCount] = await Promise.all([
          getAllUsers(),
          getActiveUsers(),
          getAdminUsers()
        ]);

        if (usersResult.success) {
          setUsers(usersResult.users);
          setActiveUsersCount(activeCount);
          setAdminUsersCount(adminCount);
        } else {
          toast.error("Failed to fetch users");
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error("An error occurred while fetching data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (selectedUser) {
      setEditForm({
        firstName: selectedUser.firstName || '',
        lastName: selectedUser.lastName || '',
        email: selectedUser.email || '',
        username: selectedUser.username || '',
        department: selectedUser.department || ''
      });
    }
  }, [selectedUser]);

  const handleInputChange = (field, value) => {
    setEditForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      const result = await updateUser(selectedUser.id, editForm);
      
      if (result.success) {
        toast.success("User updated successfully");
        // Refresh the users list
        const usersResult = await getAllUsers();
        if (usersResult.success) {
          setUsers(usersResult.users);
        }
        setIsViewDialogOpen(false);
      } else {
        toast.error("Failed to update user");
      }
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error("An error occurred while updating user");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesMainSearch = 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.department.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTableSearch = tableSearchTerm === "" || 
      user.name.toLowerCase().includes(tableSearchTerm.toLowerCase()) ||
      user.department.toLowerCase().includes(tableSearchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    return matchesMainSearch && matchesTableSearch && matchesRole && matchesStatus;
  });

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleDeleteUser = () => {
    // Implement delete logic here
    setUsers(users.filter(user => user.id !== selectedUser.id));
    setIsDeleteDialogOpen(false);
    toast.success("User deleted successfully");
  };

  const handleStatusChange = async () => {
    try {
      setIsSubmitting(true);
      const newStatus = selectedUser.status === 'active' ? 'inactive' : 'active';
      const result = await updateUser(selectedUser.id, { status: newStatus });
      
      if (result.success) {
        setUsers(users.map(user => 
          user.id === selectedUser.id 
            ? { ...user, status: newStatus }
            : user
        ));
        toast.success(`User ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`);
        setIsStatusDialogOpen(false);
      } else {
        toast.error("Failed to update user status");
      }
    } catch (error) {
      console.error('Error updating user status:', error);
      toast.error("An error occurred while updating user status");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto px-8 pt-4 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className={cn(
            "text-3xl font-bold tracking-tight",
            isDarkMode ? "text-white" : "text-gray-900"
          )}>
            Users
          </h1>
          <p className={cn(
            "text-base mt-2",
            isDarkMode ? "text-gray-400" : "text-gray-500"
          )}>
            Manage and monitor user accounts
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button className="bg-black hover:bg-gray-800 text-white gap-2">
            <UserPlus className="h-4 w-4" />
            Add User
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className={cn(
          "rounded-xl p-6 bg-gradient-to-br",
          isDarkMode 
            ? "from-blue-500/10 to-purple-500/10 shadow-lg shadow-blue-500/5" 
            : "from-blue-50 to-purple-50"
        )}>
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-blue-500 rounded-full blur opacity-25"></div>
              <div className={cn(
                "relative p-3 rounded-full",
                isDarkMode ? "bg-blue-500/10" : "bg-blue-100"
              )}>
                <User className="h-6 w-6 text-blue-500" />
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Users</p>
              <p className="text-2xl font-bold tracking-tight">{loading ? "-" : users.length}</p>
            </div>
          </div>
        </div>

        <div className={cn(
          "rounded-xl p-6 bg-gradient-to-br",
          isDarkMode 
            ? "from-green-500/10 to-emerald-500/10 shadow-lg shadow-green-500/5" 
            : "from-green-50 to-emerald-50"
        )}>
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-green-500 rounded-full blur opacity-25"></div>
              <div className={cn(
                "relative p-3 rounded-full",
                isDarkMode ? "bg-green-500/10" : "bg-green-100"
              )}>
                <CheckCircle className="h-6 w-6 text-green-500" />
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Active Users</p>
              <p className="text-2xl font-bold tracking-tight">{loading ? "-" : activeUsersCount}</p>
            </div>
          </div>
        </div>

        <div className={cn(
          "rounded-xl p-6 bg-gradient-to-br",
          isDarkMode 
            ? "from-purple-500/10 to-pink-500/10 shadow-lg shadow-purple-500/5" 
            : "from-purple-50 to-pink-50"
        )}>
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-purple-500 rounded-full blur opacity-25"></div>
              <div className={cn(
                "relative p-3 rounded-full",
                isDarkMode ? "bg-purple-500/10" : "bg-purple-100"
              )}>
                <Shield className="h-6 w-6 text-purple-500" />
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Admin Users</p>
              <p className="text-2xl font-bold tracking-tight">{loading ? "-" : adminUsersCount}</p>
            </div>
          </div>
        </div>
      </div>



      {/* Users Table */}
      <div className={cn(
        "rounded-xl border shadow-sm",
        isDarkMode ? "border-slate-700 bg-slate-900" : "border-gray-100 bg-white"
      )}>
        <div className="p-8">
          {/* Table Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className={cn(
                  "text-2xl font-bold mb-2",
                  isDarkMode ? "text-gray-100" : "text-gray-900"
                )}>
                  User List
                </h3>
                <p className={cn(
                  "text-base",
                  isDarkMode ? "text-gray-400" : "text-gray-500"
                )}>
                  Manage and monitor all user accounts
                </p>
              </div>
              <Badge variant="outline" className={cn(
                "h-10 px-4 text-base font-medium",
                isDarkMode ? "border-slate-700" : "border-gray-200"
              )}>
                {users.length} users
              </Badge>
                          </div>
            </div>

            {/* Table Search and Filters */}
            <div className="mb-4 flex items-center gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name or department..."
                  value={tableSearchTerm}
                  onChange={(e) => {
                    setTableSearchTerm(e.target.value);
                    setCurrentPage(1); // Reset to first page on search
                  }}
                  className={cn(
                    "pl-9",
                    isDarkMode
                      ? "bg-slate-900 border-slate-700"
                      : "bg-white border-gray-200"
                  )}
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className={cn(
                  "w-[130px]",
                  isDarkMode ? "bg-slate-900 border-slate-700" : "bg-white border-gray-200"
                )}>
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-purple-500" />
                    <span>Role</span>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className={cn(
                  "w-[130px]",
                  isDarkMode ? "bg-slate-900 border-slate-700" : "bg-white border-gray-200"
                )}>
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-blue-500" />
                    <span>Status</span>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

          <Table>
            <TableHeader>
              <TableRow className={cn(
                isDarkMode ? "border-slate-700 hover:bg-transparent" : "border-gray-100 hover:bg-transparent"
              )}>
                <TableHead className="w-[300px] py-3 text-sm font-semibold">User</TableHead>
                <TableHead className="py-3 text-sm font-semibold">Department</TableHead>
                <TableHead className="py-3 text-sm font-semibold">Role</TableHead>
                <TableHead className="py-3 text-sm font-semibold">Status</TableHead>
                <TableHead className="text-right py-3 text-sm font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
          <TableBody>
            {paginatedUsers.map((user) => (
              <TableRow 
                key={user.id}
                className={cn(
                  "hover:bg-muted/50 transition-colors border-gray-200",
                  isDarkMode ? "hover:bg-slate-800/50 border-gray-700/50" : "hover:bg-slate-50/50"
                )}
              >
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={user.avatar} />
                      <AvatarFallback className={cn(
                        "font-medium",
                        isDarkMode ? "bg-slate-700 text-gray-100" : "bg-gray-100 text-gray-900"
                      )}>
                        {user.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className={cn(
                        "font-medium",
                        isDarkMode ? "text-gray-100" : "text-gray-900"
                      )}>{user.name}</p>
                      <p className={cn(
                        "text-sm",
                        isDarkMode ? "text-gray-400" : "text-gray-500"
                      )}>{user.email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-gray-400" />
                    <span className={isDarkMode ? "text-gray-100" : "text-gray-900"}>
                      {user.department}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="secondary"
                    className={cn(
                      "capitalize font-medium",
                      roleColors[user.role]
                    )}
                  >
                    {user.role}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    className="p-0"
                    onClick={() => {
                      setSelectedUser(user);
                      setIsStatusDialogOpen(true);
                    }}
                  >
                    <Badge
                      variant="secondary"
                      className={cn(
                        "capitalize font-medium cursor-pointer transition-colors",
                        user.status === 'active' ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                      )}
                    >
                      {user.status}
                    </Badge>
                  </Button>
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      size="sm"
                      className={cn(
                        "h-8 px-2 text-xs gap-1 bg-black hover:bg-gray-800 text-white"
                      )}
                      onClick={() => {
                        setSelectedUser(user);
                        setIsViewDialogOpen(true);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      className={cn(
                        "h-8 px-2 text-xs gap-1 bg-red-500 hover:bg-red-600 text-white"
                      )}
                      onClick={() => {
                        setSelectedUser(user);
                        setIsDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
                    </Table>

            {/* Table Footer */}
            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between">
                <p className={cn(
                  "text-sm",
                  isDarkMode ? "text-gray-400" : "text-gray-500"
                )}>
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredUsers.length)} of {filteredUsers.length} users
                </p>
                <p className={cn(
                  "text-sm",
                  isDarkMode ? "text-gray-400" : "text-gray-500"
                )}>
                  Last updated {format(new Date(), "MMM d, yyyy 'at' h:mm a")}
                </p>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious 
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          className={cn(
                            "cursor-pointer",
                            currentPage === 1 && "pointer-events-none opacity-50"
                          )}
                        />
                      </PaginationItem>
                      {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => (
                        <PaginationItem key={i}>
                          <PaginationLink
                            onClick={() => setCurrentPage(i + 1)}
                            isActive={currentPage === i + 1}
                            className="cursor-pointer"
                          >
                            {i + 1}
                          </PaginationLink>
                        </PaginationItem>
                      ))}
                      <PaginationItem>
                        <PaginationNext 
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          className={cn(
                            "cursor-pointer",
                            currentPage === totalPages && "pointer-events-none opacity-50"
                          )}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </div>
          </div>
        </div>

      {/* Edit User Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className={cn(
          "sm:max-w-[500px] border-none shadow-lg",
          isDarkMode ? "bg-slate-900" : "bg-white"
        )}>
          {selectedUser && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold leading-none tracking-tight">
                  Edit User
                </DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  Make changes to user information
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 pt-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={selectedUser.avatar} />
                    <AvatarFallback className={cn(
                      "text-xl font-medium",
                      isDarkMode ? "bg-slate-700 text-gray-100" : "bg-gray-100 text-gray-900"
                    )}>
                      {selectedUser.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name</Label>
                        <Input
                          id="firstName"
                          value={editForm.firstName}
                          onChange={(e) => handleInputChange('firstName', e.target.value)}
                          className={cn(
                            "border-0",
                            isDarkMode 
                              ? "bg-slate-800" 
                              : "bg-gray-100"
                          )}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input
                          id="lastName"
                          value={editForm.lastName}
                          onChange={(e) => handleInputChange('lastName', e.target.value)}
                          className={cn(
                            "border-0",
                            isDarkMode 
                              ? "bg-slate-800" 
                              : "bg-gray-100"
                          )}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <Separator className="bg-black/20" />

                                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="email"
                        type="email"
                        value={editForm.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className={cn(
                          "pl-9 border-0 ring-0 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0",
                          isDarkMode 
                            ? "bg-slate-800" 
                            : "bg-gray-100"
                        )}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="username"
                        value={editForm.username}
                        onChange={(e) => handleInputChange('username', e.target.value)}
                        className={cn(
                          "pl-9 border-0 ring-0 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0",
                          isDarkMode 
                            ? "bg-slate-800" 
                            : "bg-gray-100"
                        )}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="department">Department</Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="department"
                        value={editForm.department}
                        onChange={(e) => handleInputChange('department', e.target.value)}
                        className={cn(
                          "pl-9 border-0 ring-0 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0",
                          isDarkMode 
                            ? "bg-slate-800" 
                            : "bg-gray-100"
                        )}
                      />
                    </div>
                  </div>

                  <div className="pt-4 flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsViewDialogOpen(false)}
                      className={cn(
                        "border-0",
                        isDarkMode 
                          ? "bg-slate-800 hover:bg-slate-700" 
                          : "bg-gray-100 hover:bg-gray-200"
                      )}
                    >
                      Cancel
                    </Button>
                    <Button
                      className="bg-black hover:bg-gray-800 text-white"
                      onClick={handleSubmit}
                      disabled={isSubmitting}
                    >
                      Save Changes
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className={cn(
          "border-none shadow-lg",
          isDarkMode ? "bg-slate-900" : "bg-white"
        )}>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-semibold leading-none tracking-tight">
              Delete User
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Are you sure you want to delete this user? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel 
              className={cn(
                "border-0",
                isDarkMode 
                  ? "bg-slate-800 hover:bg-slate-700" 
                  : "bg-gray-100 hover:bg-gray-200"
              )}
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600 text-white"
              onClick={handleDeleteUser}
            >
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Status Change Dialog */}
      <AlertDialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
        <AlertDialogContent className={cn(
          "border-none shadow-lg",
          isDarkMode ? "bg-slate-900" : "bg-white"
        )}>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-semibold leading-none tracking-tight">
              {selectedUser?.status === 'active' ? 'Deactivate' : 'Activate'} User
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Are you sure you want to {selectedUser?.status === 'active' ? 'deactivate' : 'activate'} this user?
              {selectedUser?.status === 'active' 
                ? " This will prevent them from accessing the system."
                : " This will restore their access to the system."
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel 
              className={cn(
                "border-0",
                isDarkMode 
                  ? "bg-slate-800 hover:bg-slate-700" 
                  : "bg-gray-100 hover:bg-gray-200"
              )}
              onClick={() => setIsStatusDialogOpen(false)}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className={cn(
                selectedUser?.status === 'active'
                  ? "bg-red-500 hover:bg-red-600"
                  : "bg-green-500 hover:bg-green-600",
                "text-white"
              )}
              onClick={handleStatusChange}
              disabled={isSubmitting}
            >
              {selectedUser?.status === 'active' ? 'Deactivate' : 'Activate'} User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Users;
