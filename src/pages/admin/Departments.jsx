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
  ListChecks,
  X,
  Eye,
  EyeOff,
  Filter,
  ChevronDown,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

import { 
  updateDepartment
} from "@/lib/firebase/departments";
import useDepartmentStore from "../../store/departmentStore";



const Departments = () => {
  const { isDarkMode } = useTheme();
  
  // Zustand store
  const {
    departments,
    loading,
    error,
    fetchAllDepartments,
    toggleVisibility,
    addDepartment: addDepartmentToStore,
    updateDepartment: updateDepartmentInStore,
    deleteDepartment: deleteDepartmentFromStore
  } = useDepartmentStore();
  
  const [localLoading, setLocalLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const [isRequirementsDialogOpen, setIsRequirementsDialogOpen] = useState(false);
  const [newRequirement, setNewRequirement] = useState("");
  const [departmentRequirements, setDepartmentRequirements] = useState([]);
  // Remove localStorage-based hidden departments state
  // Now using Firestore isHidden field directly
  const [visibilityFilter, setVisibilityFilter] = useState("all"); // "all", "visible", "hidden"

  useEffect(() => {
    const loadDepartments = async () => {
      setLocalLoading(true);
      await fetchAllDepartments();
      setLocalLoading(false);
    };
    loadDepartments();
  }, [fetchAllDepartments]);

  // Reset to first page when search term or visibility filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, visibilityFilter]);

  // Remove fetchDepartments - now handled by Zustand store

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
      const result = await addDepartmentToStore({ name, location });
      
      if (result.success) {
        toast.success("Department added successfully");
        // Refresh the departments list
        await fetchAllDepartments(true); // Force refresh
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
      const result = await updateDepartmentInStore(selectedDepartment.id, { name, location });
      
      if (result.success) {
        toast.success("Department updated successfully");
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
      const result = await deleteDepartmentFromStore(selectedDepartment.id);
      
      if (result.success) {
        toast.success("Department deleted successfully");
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

  const filteredDepartments = departments.filter(dept => {
    // Filter by search term
    const matchesSearch = dept.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dept.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dept.location?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filter by visibility using Firestore isHidden field
    const isHidden = dept.isHidden || false;
    let matchesVisibility = true;
    
    if (visibilityFilter === "visible") {
      matchesVisibility = !isHidden;
    } else if (visibilityFilter === "hidden") {
      matchesVisibility = isHidden;
    }
    // If visibilityFilter is "all", show all departments
    
    return matchesSearch && matchesVisibility;
  });

  // Toggle department visibility using Zustand store
  const handleToggleDepartmentVisibility = async (departmentId) => {
    try {
      const department = departments.find(d => d.id === departmentId);
      const newHiddenState = !(department.isHidden || false);
      
      const result = await toggleVisibility(departmentId, newHiddenState);
      
      if (result.success) {
        toast.success(`Department ${newHiddenState ? 'hidden' : 'shown'} successfully`);
        // No need to manually refresh - Zustand store handles cache updates
      } else {
        toast.error("Failed to update department visibility");
      }
    } catch (error) {
      console.error('Error toggling department visibility:', error);
      toast.error("An error occurred while updating department visibility");
    }
  };

  // Calculate pagination
  const totalPages = Math.ceil(filteredDepartments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedDepartments = filteredDepartments.slice(startIndex, startIndex + itemsPerPage);

  // Generate page numbers
  const getPageNumbers = () => {
    const pageNumbers = [];
    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 || // First page
        i === totalPages || // Last page
        (i >= currentPage - 1 && i <= currentPage + 1) // Pages around current page
      ) {
        pageNumbers.push(i);
      } else if (i === currentPage - 2 || i === currentPage + 2) {
        pageNumbers.push("...");
      }
    }
    return pageNumbers;
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
            Departments
          </h1>
          <p className={cn(
            "text-base mt-2",
            isDarkMode ? "text-gray-400" : "text-gray-500"
          )}>
            Manage and organize departments
          </p>
        </div>
        <div className="flex gap-2">
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
              <p className="text-2xl font-bold tracking-tight">{(loading || localLoading) ? "-" : departments.length}</p>
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
              <div className="flex items-center gap-3">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "h-10 px-4 gap-2 border-0",
                        isDarkMode ? "bg-slate-800 hover:bg-slate-700" : "bg-gray-100 hover:bg-gray-200"
                      )}
                    >
                      <Filter className="h-4 w-4" />
                      {visibilityFilter === "all" && "All Departments"}
                      {visibilityFilter === "visible" && "Visible Only"}
                      {visibilityFilter === "hidden" && "Hidden Only"}
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className={cn(
                    "w-48",
                    isDarkMode ? "bg-slate-900 border-slate-700" : "bg-white border-gray-200"
                  )}>
                    <DropdownMenuItem
                      onClick={() => setVisibilityFilter("all")}
                      className={cn(
                        "cursor-pointer flex items-center gap-2",
                        visibilityFilter === "all" && "bg-blue-50 dark:bg-blue-500/10"
                      )}
                    >
                      <Building2 className="h-4 w-4" />
                      All Departments
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setVisibilityFilter("visible")}
                      className={cn(
                        "cursor-pointer flex items-center gap-2",
                        visibilityFilter === "visible" && "bg-blue-50 dark:bg-blue-500/10"
                      )}
                    >
                      <Eye className="h-4 w-4 text-green-500" />
                      Visible Only
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setVisibilityFilter("hidden")}
                      className={cn(
                        "cursor-pointer flex items-center gap-2",
                        visibilityFilter === "hidden" && "bg-blue-50 dark:bg-blue-500/10"
                      )}
                    >
                      <EyeOff className="h-4 w-4 text-gray-400" />
                      Hidden Only
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Badge variant="outline" className={cn(
                  "h-10 px-4 text-base font-medium",
                  isDarkMode ? "border-slate-700" : "border-gray-200"
                )}>
                  {filteredDepartments.length} of {departments.length}
                </Badge>
              </div>
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
                <TableHead className="w-[60px] py-3 text-sm font-semibold text-center">Toggle</TableHead>
                <TableHead className="w-[300px] py-3 text-sm font-semibold">Department</TableHead>
                <TableHead className="py-3 text-sm font-semibold">Location</TableHead>
                <TableHead className="py-3 text-sm font-semibold">Created</TableHead>
                <TableHead className="text-right py-3 text-sm font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedDepartments.map((department) => (
                <TableRow 
                  key={department.id}
                  className={cn(
                    "transition-colors border-gray-200",
                    isDarkMode ? "border-gray-700/50" : "",
                    (department.isHidden || false) && visibilityFilter === "all" && "opacity-50 bg-gray-50 dark:bg-slate-800/50"
                  )}
                >
                  <TableCell className="text-center">
                    <Button
                      size="sm"
                      variant="ghost"
                      className={cn(
                        "h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-slate-800",
                        department.isHidden ? "text-gray-400 hover:text-gray-600" : "text-green-500 hover:text-green-600"
                      )}
                      onClick={() => handleToggleDepartmentVisibility(department.id)}
                      title={department.isHidden ? "Show department" : "Hide department"}
                    >
                      {department.isHidden ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-2 rounded-lg",
                        isDarkMode ? "bg-slate-800" : "bg-gray-100"
                      )}>
                        <Building2 className="h-5 w-5 text-blue-500" />
                      </div>
                      <div>
                        <p className="font-medium group-hover:text-white">{department.name}</p>

                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-medium bg-blue-500/10 text-blue-500 group-hover:bg-white/10 group-hover:text-white">
                      {department.location}
                    </Badge>
                  </TableCell>

                  <TableCell>
                    <div className="text-sm">
                      <p className="group-hover:text-white">
                        {department.createdAt?.seconds 
                          ? format(new Date(department.createdAt.seconds * 1000), "MMM d, yyyy")
                          : "Unknown"
                        }
                      </p>
                      <p className="text-gray-400 group-hover:text-white/70">
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
                          "h-8 px-2 text-xs gap-1 bg-blue-500 hover:bg-blue-600 text-white"
                        )}
                        onClick={() => {
                          setSelectedDepartment(department);
                          setDepartmentRequirements(department.defaultRequirements || []);
                          setIsRequirementsDialogOpen(true);
                        }}
                      >
                        <ListChecks className="h-3.5 w-3.5" />
                        Requirements
                      </Button>
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
            <div className="flex items-center justify-end gap-8">
              {/* Pagination */}
              {totalPages > 1 && (
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        className={cn(
                          "cursor-pointer hover:bg-blue-500 hover:text-white",
                          currentPage === 1 && "pointer-events-none opacity-50"
                        )}
                      />
                    </PaginationItem>
                    
                    {getPageNumbers().map((pageNumber, index) => (
                      <PaginationItem key={index}>
                        {pageNumber === "..." ? (
                          <PaginationEllipsis />
                        ) : (
                          <PaginationLink
                            className={cn(
                              "cursor-pointer hover:bg-blue-500 hover:text-white",
                              currentPage === pageNumber && "bg-blue-500 text-white hover:bg-blue-600"
                            )}
                            isActive={currentPage === pageNumber}
                            onClick={() => setCurrentPage(pageNumber)}
                          >
                            {pageNumber}
                          </PaginationLink>
                        )}
                      </PaginationItem>
                    ))}

                    <PaginationItem>
                      <PaginationNext 
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        className={cn(
                          "cursor-pointer hover:bg-blue-500 hover:text-white",
                          currentPage === totalPages && "pointer-events-none opacity-50"
                        )}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </div>
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

      {/* Requirements Dialog */}
      <Dialog open={isRequirementsDialogOpen} onOpenChange={setIsRequirementsDialogOpen}>
        <DialogContent className={cn(
          "sm:max-w-[600px] border-none shadow-lg",
          isDarkMode ? "bg-slate-900" : "bg-white"
        )}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <ListChecks className="h-5 w-5" />
              Default Requirements for {selectedDepartment?.name}
            </DialogTitle>
            <DialogDescription>
              Add default requirements that users can quickly select when requesting events.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 pt-4">
            {/* Add New Requirement */}
            <div className="flex gap-2">
              <Input
                placeholder="Add new requirement..."
                value={newRequirement}
                onChange={(e) => setNewRequirement(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newRequirement.trim()) {
                    setDepartmentRequirements([...departmentRequirements, newRequirement.trim()]);
                    setNewRequirement('');
                  }
                }}
                className={cn(
                  isDarkMode ? "bg-slate-800 border-0" : "bg-gray-100 border-0"
                )}
              />
              <Button
                className="px-4 bg-black hover:bg-gray-800 text-white"
                onClick={() => {
                  if (newRequirement.trim()) {
                    setDepartmentRequirements([...departmentRequirements, newRequirement.trim()]);
                    setNewRequirement('');
                  }
                }}
              >
                Add
              </Button>
            </div>

            {/* Requirements List */}
            <div className={cn(
              "rounded-lg border divide-y",
              isDarkMode ? "border-slate-700 divide-slate-700" : "border-gray-200 divide-gray-200"
            )}>
              {departmentRequirements.length > 0 ? (
                departmentRequirements.map((req, index) => (
                  <div
                    key={index}
                    className={cn(
                      "flex items-center justify-between p-3",
                      isDarkMode ? "hover:bg-slate-800/50" : "hover:bg-gray-50"
                    )}
                  >
                    <span className={cn(
                      "text-sm",
                      isDarkMode ? "text-gray-300" : "text-gray-700"
                    )}>{req}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "h-8 w-8 p-0",
                        isDarkMode 
                          ? "hover:bg-red-500/10 text-red-400 hover:text-red-300" 
                          : "hover:bg-red-50 text-red-600 hover:text-red-700"
                      )}
                      onClick={() => {
                        setDepartmentRequirements(departmentRequirements.filter((_, i) => i !== index));
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              ) : (
                <div className={cn(
                  "p-8 text-center",
                  isDarkMode ? "text-gray-400" : "text-gray-500"
                )}>
                  <p className="text-sm">No default requirements added yet.</p>
                  <p className="text-xs mt-1">Add requirements above to help users quickly select common requirements.</p>
                </div>
              )}
            </div>

            {/* Save Button */}
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setIsRequirementsDialogOpen(false)}
                className={cn(
                  "border-0",
                  isDarkMode ? "bg-slate-800 hover:bg-slate-700" : "bg-gray-100 hover:bg-gray-200"
                )}
              >
                Cancel
              </Button>
              <Button
                className="bg-black hover:bg-gray-800 text-white"
                onClick={async () => {
                  if (selectedDepartment) {
                    setIsSubmitting(true);
                    const result = await updateDepartment(selectedDepartment.id, {
                      ...selectedDepartment,
                      defaultRequirements: departmentRequirements
                    });
                    if (result.success) {
                      toast.success("Requirements updated successfully");
                      // Refresh the departments list from store
                      await fetchAllDepartments(true); // Force refresh
                      setIsRequirementsDialogOpen(false);
                    } else {
                      toast.error("Failed to update requirements");
                    }
                    setIsSubmitting(false);
                  }
                }}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Saving..." : "Save Requirements"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Departments;
