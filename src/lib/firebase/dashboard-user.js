import { db } from './firebase';
import { collection, query, where, getDocs, orderBy, doc, getDoc, Timestamp } from 'firebase/firestore';

export const getUserDashboardStats = async (uid) => {
  try {
    // First get the user document to get their department
    const userDocRef = doc(db, "users", uid);
    const userDocSnap = await getDoc(userDocRef);
    if (!userDocSnap.exists()) {
      throw new Error("User not found");
    }
    const userData = userDocSnap.data();
    const userDepartment = userData.department;

    const eventsRef = collection(db, "eventRequests");
    const now = Timestamp.now();

    // Get total events for the user
    const userEventsQuery = query(
      eventsRef,
      where("userId", "==", uid)
    );
    const userEventsSnapshot = await getDocs(userEventsQuery);
    const totalEvents = userEventsSnapshot.size;

    // Get all upcoming events for the user
    const upcomingEventsQuery = query(
      eventsRef,
      where("userId", "==", uid),
      where("date", ">=", now),
      orderBy("date", "asc")
    );
    const upcomingEventsSnapshot = await getDocs(upcomingEventsQuery);
    const upcomingEvents = upcomingEventsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Get department events (events from user's department)
    const departmentEventsQuery = query(
      eventsRef,
      where("department", "==", userDepartment)
    );
    const departmentEventsSnapshot = await getDocs(departmentEventsQuery);
    const departmentEvents = departmentEventsSnapshot.size;

    // Calculate total hours scheduled
    const totalHours = userEventsSnapshot.docs.reduce((total, doc) => {
      const duration = doc.data().duration || 0;
      return total + (duration / 60); // Convert minutes to hours
    }, 0);

    // Get next upcoming event date for trend
    const nextEvent = upcomingEvents[0];
    const daysUntilNext = nextEvent 
      ? Math.ceil((nextEvent.date.toDate() - now.toDate()) / (1000 * 60 * 60 * 24))
      : null;

    // Get this week's events count
    const weekStartDate = new Date();
    weekStartDate.setHours(0, 0, 0, 0);
    weekStartDate.setDate(weekStartDate.getDate() - weekStartDate.getDay());
    const weekStart = Timestamp.fromDate(weekStartDate);
    const thisWeekEvents = departmentEventsSnapshot.docs.filter(doc => {
      const eventDate = doc.data().date.toDate();
      return eventDate >= weekStart;
    }).length;

    // Calculate this week's hours
    const thisWeekHours = userEventsSnapshot.docs.reduce((total, doc) => {
      const eventDate = doc.data().date.toDate();
      if (eventDate >= weekStart) {
        const duration = doc.data().duration || 0;
        return total + (duration / 60);
      }
      return total;
    }, 0);

    return {
      success: true,
      stats: {
        totalEvents,
        upcomingEvents: upcomingEvents.length,
        departmentEvents,
        totalHours: Math.round(totalHours),
        nextEventIn: daysUntilNext,
        thisWeekEvents,
        thisWeekHours: Math.round(thisWeekHours),
        upcomingEventsList: upcomingEvents.slice(0, 5).map(event => ({
          id: event.id,
          title: event.title,
          date: event.date.toDate(),
          duration: event.duration
        }))
      }
    };
  } catch (error) {
    console.error("Error getting dashboard stats:", error);
    return { success: false, error: error.message };
  }
};
