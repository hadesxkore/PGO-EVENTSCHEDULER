import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/contexts/ThemeContext";
import {
  Building2,
  Search,
  Plus,
  Users,
  Calendar,
  Pencil,
  Trash2,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

import { 
  getAllDepartments, 
  addDepartment, 
  updateDepartment, 
  deleteDepartment 
} from "@/lib/firebase/departments";



const Departments = () => {
  const { isDarkMode } = useTheme();
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const result = await getAllDepartments();
      if (result.success) {
        setDepartments(result.departments);
      } else {
        toast.error("Failed to fetch departments");
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
      toast.error("An error occurred while fetching departments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedDepartment) {
      setName(selectedDepartment.name || '');
      setLocation(selectedDepartment.location || '');
    } else {
      setName('');
      setLocation('');
    }
  }, [selectedDepartment]);

  const handleAddDepartment = async () => {
    try {
      setIsSubmitting(true);
      const result = await addDepartment({ name, location });
      
      if (result.success) {
        toast.success("Department added successfully");
        await fetchDepartments();
        setIsAddDialogOpen(false);
        setName("");
        setLocation("");
      } else {
        toast.error("Failed to add department");
      }
    } catch (error) {
      console.error('Error adding department:', error);
      toast.error("An error occurred while adding department");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateDepartment = async () => {
    try {
      setIsSubmitting(true);
      const result = await updateDepartment(selectedDepartment.id, { name, location });
      
      if (result.success) {
        toast.success("Department updated successfully");
        await fetchDepartments();
        setIsEditDialogOpen(false);
      } else {
        toast.error("Failed to update department");
      }
    } catch (error) {
      console.error('Error updating department:', error);
      toast.error("An error occurred while updating department");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteDepartment = async () => {
    try {
      setIsSubmitting(true);
      const result = await deleteDepartment(selectedDepartment.id);
      
      if (result.success) {
        toast.success("Department deleted successfully");
        await fetchDepartments();
        setIsDeleteDialogOpen(false);
      } else {
        toast.error("Failed to delete department");
      }
    } catch (error) {
      console.error('Error deleting department:', error);
      toast.error("An error occurred while deleting department");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredDepartments = departments.filter(dept =>
    dept.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dept.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dept.location?.toLowerCase().includes(searchTerm.toLowerCase())
  );



  return (
    <div className="max-w-[1400px] mx-auto px-8 pt-4 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className={cn(
            "text-3xl font-bold tracking-tight",
            isDarkMode ? "text-white" : "text-gray-900"
          )}>
            Departments
          </h1>
          <p className={cn(
            "text-base mt-2",
            isDarkMode ? "text-gray-400" : "text-gray-500"
          )}>
            Manage and organize departments
          </p>
        </div>
        <Button 
          className="bg-black hover:bg-gray-800 text-white gap-2"
          onClick={() => {
            setName("");
            setLocation("");
            setIsAddDialogOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Add Department
        </Button>
      </div>

      {/* Stats Card */}
      <div className="mb-8">
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
                <Building2 className="h-6 w-6 text-blue-500" />
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Departments</p>
              <p className="text-2xl font-bold tracking-tight">{loading ? "-" : departments.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Departments Table */}
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
                  Department List
                </h3>
                <p className={cn(
                  "text-base",
                  isDarkMode ? "text-gray-400" : "text-gray-500"
                )}>
                  View and manage all departments
                </p>
              </div>
              <Badge variant="outline" className={cn(
                "h-10 px-4 text-base font-medium",
                isDarkMode ? "border-slate-700" : "border-gray-200"
              )}>
                {departments.length} departments
              </Badge>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search departments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={cn(
                  "pl-9",
                  isDarkMode 
                    ? "bg-slate-800 border-0" 
                    : "bg-gray-100 border-0"
                )}
              />
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow className={cn(
                isDarkMode ? "border-slate-700 hover:bg-transparent" : "border-gray-100 hover:bg-transparent"
              )}>
                <TableHead className="w-[300px] py-3 text-sm font-semibold">Department</TableHead>
                <TableHead className="py-3 text-sm font-semibold">Location</TableHead>
                <TableHead className="py-3 text-sm font-semibold">Created</TableHead>
                <TableHead className="text-right py-3 text-sm font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDepartments.map((department) => (
                <TableRow 
                  key={department.id}
                  className={cn(
                    "hover:bg-muted/50 transition-colors border-gray-200",
                    isDarkMode ? "hover:bg-slate-800/50 border-gray-700/50" : "hover:bg-slate-50/50"
                  )}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-2 rounded-lg",
                        isDarkMode ? "bg-slate-800" : "bg-gray-100"
                      )}>
                        <Building2 className="h-5 w-5 text-blue-500" />
                      </div>
                      <div>
                        <p className={cn(
                          "font-medium",
                          isDarkMode ? "text-gray-100" : "text-gray-900"
                        )}>{department.name}</p>

                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-medium bg-blue-500/10 text-blue-500">
                      {department.location}
                    </Badge>
                  </TableCell>

                  <TableCell>
                    <div className="text-sm">
                      <p className={isDarkMode ? "text-gray-100" : "text-gray-900"}>
                        {department.createdAt?.seconds 
                          ? format(new Date(department.createdAt.seconds * 1000), "MMM d, yyyy")
                          : "Unknown"
                        }
                      </p>
                      <p className={isDarkMode ? "text-gray-400" : "text-gray-500"}>
                        {department.createdAt?.seconds 
                          ? format(new Date(department.createdAt.seconds * 1000), "h:mm a")
                          : ""
                        }
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        className={cn(
                          "h-8 px-2 text-xs gap-1 bg-black hover:bg-gray-800 text-white"
                        )}
                        onClick={() => {
                          setSelectedDepartment(department);
                          setIsEditDialogOpen(true);
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
                          setSelectedDepartment(department);
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
          <div className="mt-4">
            <p className={cn(
              "text-sm",
              isDarkMode ? "text-gray-400" : "text-gray-500"
            )}>
              Last updated {format(new Date(), "MMM d, yyyy 'at' h:mm a")}
            </p>
          </div>
        </div>
      </div>

      {/* Add/Edit Department Dialog */}
      <Dialog open={isAddDialogOpen || isEditDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsAddDialogOpen(false);
          setIsEditDialogOpen(false);
          setName("");
          setLocation("");
        }
      }}>
        <DialogContent className="sm:max-w-[500px] border-none shadow-lg bg-white dark:bg-slate-900">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold leading-none tracking-tight">
              {isAddDialogOpen ? "Add Department" : "Edit Department"}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {isAddDialogOpen ? "Add a new department" : "Make changes to department information"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 pt-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Department Name</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value.toUpperCase())}
                    className="pl-9 bg-gray-100 border-0 dark:bg-slate-800"
                    placeholder="ENTER DEPARTMENT NAME"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value.toUpperCase())}
                    className="pl-9 bg-gray-100 border-0 dark:bg-slate-800"
                    placeholder="ENTER DEPARTMENT LOCATION"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsAddDialogOpen(false);
                  setIsEditDialogOpen(false);
                  setName("");
                  setLocation("");
                }}
                className="border-0 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700"
              >
                Cancel
              </Button>
              <Button
                className="bg-black hover:bg-gray-800 text-white"
                onClick={isAddDialogOpen ? handleAddDepartment : handleUpdateDepartment}
                disabled={isSubmitting}
              >
                {isAddDialogOpen ? "Add Department" : "Save Changes"}
              </Button>
            </div>
          </div>
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
              Delete Department
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Are you sure you want to delete this department? This action cannot be undone.
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
              onClick={handleDeleteDepartment}
              disabled={isSubmitting}
            >
              Delete Department
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Departments;
