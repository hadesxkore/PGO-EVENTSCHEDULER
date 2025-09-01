import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useTheme } from "@/contexts/ThemeContext";
import { 
  Tag, 
  FileText, 
  X, 
  Calendar, 
  Clock, 
  Users, 
  ChevronLeft, 
  ChevronRight,
  ArrowLeft,
  Building2,
  CalendarDays,
  MapPin,
  UserPlus,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { useLocation, useNavigate } from "react-router-dom";
import { auth } from "@/lib/firebase/firebase";
import { db } from "@/lib/firebase/firebase";
import { collection, query, where, getDocs, orderBy, doc, getDoc, Timestamp } from 'firebase/firestore';
import useEventStore from "@/store/eventStore";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";

const TaggedDepartments = () => {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // State for events data
  const [events, setEvents] = useState([]);

  // Fetch tagged departments events
  useEffect(() => {
    const fetchTaggedEvents = async () => {
      setLoading(true);
      try {
        // Get current user's document to get their department
        const user = auth.currentUser;
        if (!user) {
          throw new Error("User not authenticated");
        }

        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (!userDocSnap.exists()) {
          throw new Error("User not found");
        }
        const userData = userDocSnap.data();
        const userDepartment = userData.department;

        // Get all events
        const eventsRef = collection(db, "eventRequests");
        const allEventsQuery = query(eventsRef);
        const allEventsSnapshot = await getDocs(allEventsQuery);
        
        // Filter events where user's department is tagged OR where user has tagged others
        const taggedEvents = allEventsSnapshot.docs
          .map(doc => {
            const eventData = doc.data();
            const id = doc.id;
            const departmentRequirements = eventData.departmentRequirements || [];

            // Case 1: User's department is tagged in this event
            const taggedDept = departmentRequirements.find(
              dept => dept.departmentName === userDepartment
            );

            if (taggedDept && eventData.userId !== user.uid) {
              return {
                id,
                title: eventData.title,
                department: eventData.department,
                startDate: eventData.startDate,
                endDate: eventData.endDate,
                date: eventData.date,
                location: eventData.location,
                participants: eventData.participants,
      tagType: 'received',
                requirements: taggedDept.requirements || []
              };
            }

            // Case 2: User created this event and tagged other departments
            if (eventData.userId === user.uid && departmentRequirements.length > 0) {
              return {
                id,
                title: eventData.title,
                department: eventData.department,
                startDate: eventData.startDate,
                endDate: eventData.endDate,
                date: eventData.date,
                location: eventData.location,
                participants: eventData.participants,
      tagType: 'sent',
                requirements: departmentRequirements.map(dept => ({
                  name: dept.departmentName,
                  requirements: dept.requirements || []
                }))
              };
            }

            return null;
          })
          .filter(event => event !== null);

        setEvents(taggedEvents);
        setError(null);
      } catch (err) {
        setError('Failed to fetch tagged events');
        console.error('Error fetching tagged events:', err);
        toast.error('Failed to fetch tagged events');
      } finally {
        setLoading(false);
      }
    };

    fetchTaggedEvents();
  }, []);

  // Show error toast if there's an error
  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };



  // Debug logs
  console.log('Rendering TaggedDepartments page');

  return (
    <AnimatePresence mode="wait">
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="min-h-screen"
    >
      {/* Header */}
        <div className={cn(
          "sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
          isDarkMode ? "border-slate-700/50" : "border-slate-200"
        )}>
          <div className="container flex h-16 items-center">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
              className="mr-4"
        >
              <ArrowLeft className="h-5 w-5" />
        </Button>
            <div className="flex items-center gap-2">
              <Building2 className={cn(
                "h-6 w-6",
                isDarkMode ? "text-purple-400" : "text-purple-600"
              )} />
              <h1 className="font-semibold text-lg">Tagged Departments</h1>
            </div>
          </div>
        </div>

        <div className="container py-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h2 className={cn(
                  "text-2xl font-semibold tracking-tight",
                  isDarkMode ? "text-white" : "text-slate-900"
                )}>Department Events</h2>
                <p className={cn(
                  "text-sm",
                  isDarkMode ? "text-slate-400" : "text-slate-500"
                )}>
                  View and manage events where your department has been tagged
                </p>
              </div>
            </div>
            <Separator className={isDarkMode ? "bg-slate-700" : "bg-slate-200"} />
          </div>
        </div>

      {/* Events List */}
      {!selectedEvent && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="container mt-6"
        >
          <Tabs defaultValue="created" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="created">Created Events</TabsTrigger>
              <TabsTrigger value="tagged">Tagged Events</TabsTrigger>
            </TabsList>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
                <p className={cn(
                  "mt-4 text-sm",
                  isDarkMode ? "text-slate-400" : "text-slate-600"
                )}>Loading events...</p>
              </div>
            ) : (
              <>
                <TabsContent value="created" className="space-y-6">
                  {events.filter(event => event.tagType === 'sent').length > 0 ? (
                    <div className="grid gap-6">
                      {events
                        .filter(event => event.tagType === 'sent')
                        .map((event) => (
                
                      <motion.div
                        key={event.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                        onClick={() => setSelectedEvent(event)}
                  >
                    <Card className={cn(
                      "cursor-pointer transition-all duration-200 hover:shadow-lg border-slate-200",
                          isDarkMode 
                        ? "bg-slate-800/50 border-slate-700/50 hover:bg-slate-800" 
                        : "bg-white hover:bg-slate-50"
                    )}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <CardTitle className="flex items-center gap-2">
                              <span className={cn(
                                "text-lg",
                                isDarkMode ? "text-white" : "text-slate-900"
                              )}>{event.title}</span>
                              <Badge variant={event.tagType === 'received' ? "default" : "secondary"}>
                                {event.tagType === 'received' ? 'Tagged' : 'Created'}
                              </Badge>
                            </CardTitle>
                            <CardDescription className="flex items-center gap-2">
                              <Building2 className="h-4 w-4" />
                              <span>{event.department}</span>
                            </CardDescription>
                          </div>
                          <Button variant="ghost" size="icon">
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid gap-4">
                          <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-1">
                              <CalendarDays className={cn(
                                "h-4 w-4",
                                isDarkMode ? "text-slate-400" : "text-slate-500"
                              )} />
                              <span className={isDarkMode ? "text-slate-400" : "text-slate-500"}>
                                {event.startDate?.toDate ? 
                                  format(event.startDate.toDate(), "MMM d, yyyy") :
                                  'Date not specified'
                                }
                                  </span>
                                </div>
                            <div className="flex items-center gap-1">
                              <MapPin className={cn(
                                "h-4 w-4",
                                isDarkMode ? "text-slate-400" : "text-slate-500"
                              )} />
                              <span className={isDarkMode ? "text-slate-400" : "text-slate-500"}>
                                {event.location || 'Location not specified'}
                              </span>
                              </div>
                            <div className="flex items-center gap-1">
                              <UserPlus className={cn(
                                "h-4 w-4",
                                isDarkMode ? "text-slate-400" : "text-slate-500"
                              )} />
                              <span className={isDarkMode ? "text-slate-400" : "text-slate-500"}>
                                {event.participants || '0'} attendees
                              </span>
                            </div>
                            </div>
                                                            {event.requirements && event.requirements.length > 0 && (
                                <div className="flex flex-wrap gap-2 pt-2">
                                    {event.requirements.map((req, reqIndex) => (
                                      <Badge
                                        key={reqIndex}
                                        variant="outline"
                                        className={cn(
                                        "flex items-center gap-1",
                                          isDarkMode 
                                          ? "border-purple-500/20 text-purple-400" 
                                          : "border-purple-500/20 text-purple-600"
                                        )}
                                      >
                                      <CheckCircle2 className="h-3 w-3" />
                                        {typeof req === 'string' ? req : req.name}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                          </div>
                      </CardContent>
                    </Card>
                      </motion.div>
                    ))}
                                      </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12">
                      <AlertCircle className={cn(
                        "h-12 w-12",
                        isDarkMode ? "text-slate-600" : "text-slate-300"
                      )} />
                      <h3 className={cn(
                        "mt-4 text-lg font-medium",
                        isDarkMode ? "text-slate-300" : "text-slate-700"
                      )}>No Created Events</h3>
                      <p className={cn(
                        "mt-2 text-sm text-center",
                        isDarkMode ? "text-slate-400" : "text-slate-500"
                      )}>
                        You haven't created any events that tag other departments.
                      </p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="tagged" className="space-y-6">
                  {events.filter(event => event.tagType === 'received').length > 0 ? (
                    <div className="grid gap-6">
                      {events
                        .filter(event => event.tagType === 'received')
                        .map((event) => (
                          <motion.div
                            key={event.id}
                            layout
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            onClick={() => setSelectedEvent(event)}
                          >
                            <Card className={cn(
                              "cursor-pointer transition-all duration-200 hover:shadow-lg border-slate-200",
                              isDarkMode 
                                ? "bg-slate-800/50 border-slate-700/50 hover:bg-slate-800" 
                                : "bg-white hover:bg-slate-50"
                            )}>
                              <CardHeader className="pb-3">
                                <div className="flex items-start justify-between">
                                  <div className="space-y-1">
                                    <CardTitle className="flex items-center gap-2">
                                      <span className={cn(
                                        "text-lg",
                                        isDarkMode ? "text-white" : "text-slate-900"
                                      )}>{event.title}</span>
                                      <Badge variant="default">Tagged</Badge>
                                    </CardTitle>
                                    <CardDescription className="flex items-center gap-2">
                                      <Building2 className="h-4 w-4" />
                                      <span>{event.department}</span>
                                    </CardDescription>
                                  </div>
                                  <Button variant="ghost" size="icon">
                                    <ChevronRight className="h-4 w-4" />
                                  </Button>
                                </div>
                              </CardHeader>
                              <CardContent>
                                <div className="grid gap-4">
                                  <div className="flex items-center gap-4 text-sm">
                                    <div className="flex items-center gap-1">
                                      <CalendarDays className={cn(
                                        "h-4 w-4",
                                        isDarkMode ? "text-slate-400" : "text-slate-500"
                                      )} />
                                      <span className={isDarkMode ? "text-slate-400" : "text-slate-500"}>
                                        {event.startDate?.toDate ? 
                                          format(event.startDate.toDate(), "MMM d, yyyy") :
                                          'Date not specified'
                                        }
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <MapPin className={cn(
                                        "h-4 w-4",
                                        isDarkMode ? "text-slate-400" : "text-slate-500"
                                      )} />
                                      <span className={isDarkMode ? "text-slate-400" : "text-slate-500"}>
                                        {event.location || 'Location not specified'}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <UserPlus className={cn(
                                        "h-4 w-4",
                                        isDarkMode ? "text-slate-400" : "text-slate-500"
                                      )} />
                                      <span className={isDarkMode ? "text-slate-400" : "text-slate-500"}>
                                        {event.participants || '0'} attendees
                                      </span>
                                    </div>
                                  </div>
                                  {event.requirements && event.requirements.length > 0 && (
                                    <div className="flex flex-wrap gap-2 pt-2">
                                      {event.requirements.map((req, reqIndex) => (
                                        <Badge
                                          key={reqIndex}
                                          variant="outline"
                                          className={cn(
                                            "flex items-center gap-1",
                                            isDarkMode 
                                              ? "border-purple-500/20 text-purple-400" 
                                              : "border-purple-500/20 text-purple-600"
                                          )}
                                        >
                                          <CheckCircle2 className="h-3 w-3" />
                                          {typeof req === 'string' ? req : req.name}
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          </motion.div>
                        ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12">
                      <AlertCircle className={cn(
                        "h-12 w-12",
                        isDarkMode ? "text-slate-600" : "text-slate-300"
                      )} />
                      <h3 className={cn(
                        "mt-4 text-lg font-medium",
                        isDarkMode ? "text-slate-300" : "text-slate-700"
                      )}>No Tagged Events</h3>
                      <p className={cn(
                        "mt-2 text-sm text-center",
                        isDarkMode ? "text-slate-400" : "text-slate-500"
                      )}>
                        There are no events where your department has been tagged.
                      </p>
                    </div>
                  )}
                </TabsContent>
              </>
            )}
          </Tabs>
        </motion.div>
      )}

      {/* Selected Event Details */}
      {selectedEvent && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="container py-6"
        >
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedEvent(null)}
              className={cn(
                "shrink-0",
                isDarkMode ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900"
              )}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h2 className={cn(
                "text-2xl font-semibold tracking-tight",
                isDarkMode ? "text-white" : "text-slate-900"
              )}>{selectedEvent.title}</h2>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={selectedEvent.tagType === 'received' ? "default" : "secondary"}>
                  {selectedEvent.tagType === 'received' ? 'Tagged' : 'Created'}
                </Badge>
                <span className={cn(
                  "text-sm",
                  isDarkMode ? "text-slate-400" : "text-slate-600"
                )}>
                  {selectedEvent.department}
                </span>
              </div>
            </div>
          </div>

          <div className="grid gap-6">
                        {/* Event Overview */}
                <Card className={cn(
              "border-slate-200",
              isDarkMode ? "bg-slate-800/50 border-slate-700/50" : "bg-white"
                )}>
                  <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CalendarDays className="h-5 w-5 text-purple-500" />
                  Event Overview
                </CardTitle>
                  </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-3">
                  <div className="space-y-1">
                    <h4 className={cn(
                        "text-sm font-medium",
                      isDarkMode ? "text-slate-400" : "text-slate-600"
                    )}>Start Time</h4>
                      <p className={cn(
                        "text-sm",
                      isDarkMode ? "text-white" : "text-slate-900"
                      )}>
                      {selectedEvent.startDate?.toDate ? 
                        format(selectedEvent.startDate.toDate(), "MMMM d, yyyy 'at' h:mm a") :
                        'Not specified'
                      }
                      </p>
                    </div>
                  <div className="space-y-1">
                    <h4 className={cn(
                        "text-sm font-medium",
                      isDarkMode ? "text-slate-400" : "text-slate-600"
                    )}>End Time</h4>
                      <p className={cn(
                        "text-sm",
                      isDarkMode ? "text-white" : "text-slate-900"
                      )}>
                      {selectedEvent.endDate?.toDate ? 
                        format(selectedEvent.endDate.toDate(), "MMMM d, yyyy 'at' h:mm a") :
                        'Not specified'
                      }
                      </p>
                    </div>
                  <div className="space-y-1">
                    <h4 className={cn(
                        "text-sm font-medium",
                      isDarkMode ? "text-slate-400" : "text-slate-600"
                    )}>Location</h4>
                      <p className={cn(
                        "text-sm",
                      isDarkMode ? "text-white" : "text-slate-900"
                    )}>
                      {selectedEvent.location || 'Not specified'}
                    </p>
                    </div>
                    </div>
                  </CardContent>
                </Card>

              {/* Requirements */}
              <Card className={cn(
              "border-slate-200",
              isDarkMode ? "bg-slate-800/50 border-slate-700/50" : "bg-white"
              )}>
                <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-purple-500" />
                  Department Requirements
                </CardTitle>
                <CardDescription>
                  Resources and requirements needed for this event
                </CardDescription>
                </CardHeader>
                <CardContent>
                <div className="grid gap-4">
                    {selectedEvent.requirements?.map((req, index) => (
                      <div
                        key={index}
                        className={cn(
                        "flex items-start gap-4 rounded-lg border p-4",
                        isDarkMode ? "bg-slate-800/30 border-slate-700/50" : "bg-slate-50/50 border-slate-200"
                      )}
                    >
                      <div className={cn(
                        "p-2 rounded-md shrink-0",
                        isDarkMode ? "bg-purple-500/10" : "bg-purple-50"
                      )}>
                        <FileText className="h-4 w-4 text-purple-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className={cn(
                            "font-medium",
                          isDarkMode ? "text-white" : "text-slate-900"
                        )}>{req.name}</h4>
                        {req.note && (
                          <p className={cn(
                            "mt-1 text-sm",
                            isDarkMode ? "text-slate-400" : "text-slate-600"
                          )}>{req.note}</p>
                        )}
                      </div>
                      <Badge variant="outline" className={cn(
                        isDarkMode ? "border-purple-500/20 text-purple-400" : "border-purple-500/20 text-purple-600"
                      )}>Required</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
          </div>
        </motion.div>
      )}
    </motion.div>
    </AnimatePresence>
  );
};

export default TaggedDepartments;
