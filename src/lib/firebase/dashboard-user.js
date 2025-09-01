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
      orderBy("startDate", "asc")
    );
    const upcomingEventsSnapshot = await getDocs(upcomingEventsQuery);
    const upcomingEvents = upcomingEventsSnapshot.docs
      .map(doc => {
        const eventData = doc.data();
        let eventDate;
        
        // Handle different date formats
        if (eventData.startDate?.seconds) {
          eventDate = new Date(eventData.startDate.seconds * 1000);
        } else if (eventData.date?.seconds) {
          eventDate = new Date(eventData.date.seconds * 1000);
        } else {
          console.warn('Invalid date format for event:', eventData);
          return null;
        }
        
        // Only include future events
        if (eventDate >= now.toDate()) {
          return {
            id: doc.id,
            ...eventData,
            parsedDate: eventDate
          };
        }
        return null;
      })
      .filter(event => event !== null);

    // Get events where user's department is tagged
    const allEventsQuery = query(eventsRef);
    const allEventsSnapshot = await getDocs(allEventsQuery);
    const taggedEvents = allEventsSnapshot.docs
      .map(doc => {
        const eventData = doc.data();
        let eventDate;
        
        // Handle different date formats
        if (eventData.startDate?.seconds) {
          eventDate = new Date(eventData.startDate.seconds * 1000);
        } else if (eventData.date?.seconds) {
          eventDate = new Date(eventData.date.seconds * 1000);
        } else {
          console.warn('Invalid date format for event:', eventData);
          return null;
        }
        
        // Check if event has department requirements and user's department is tagged
        if (eventData.departmentRequirements) {
          const isTagged = eventData.departmentRequirements.some(
            dept => dept.departmentName === userDepartment
          );
          if (isTagged) {
            return {
              id: doc.id,
              ...eventData,
              parsedDate: eventDate,
              requirements: eventData.departmentRequirements.find(
                dept => dept.departmentName === userDepartment
              )?.requirements || []
            };
          }
        }
        return null;
      })
      .filter(event => event !== null);
    
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
      ? Math.ceil((nextEvent.parsedDate - now.toDate()) / (1000 * 60 * 60 * 24))
      : null;

    // Get this week's events count
    const weekStartDate = new Date();
    weekStartDate.setHours(0, 0, 0, 0);
    weekStartDate.setDate(weekStartDate.getDate() - weekStartDate.getDay());
    const weekStart = Timestamp.fromDate(weekStartDate);
    const thisWeekEvents = departmentEventsSnapshot.docs.filter(doc => {
      const eventData = doc.data();
      let eventDate;
      
      // Handle different date formats
      if (eventData.startDate?.seconds) {
        eventDate = new Date(eventData.startDate.seconds * 1000);
      } else if (eventData.date?.seconds) {
        eventDate = new Date(eventData.date.seconds * 1000);
      } else if (eventData.startDate instanceof Date) {
        eventDate = new Date(eventData.startDate);
      } else if (eventData.date instanceof Date) {
        eventDate = new Date(eventData.date);
      } else {
        console.warn('Invalid date format for event:', eventData);
        return false;
      }
      
      return eventDate >= weekStartDate;
    }).length;

    // Calculate this week's hours
    const thisWeekHours = userEventsSnapshot.docs.reduce((total, doc) => {
      const eventData = doc.data();
      let eventDate;
      
      // Handle different date formats
      if (eventData.startDate?.seconds) {
        eventDate = new Date(eventData.startDate.seconds * 1000);
      } else if (eventData.date?.seconds) {
        eventDate = new Date(eventData.date.seconds * 1000);
      } else if (eventData.startDate instanceof Date) {
        eventDate = new Date(eventData.startDate);
      } else if (eventData.date instanceof Date) {
        eventDate = new Date(eventData.date);
      } else {
        console.warn('Invalid date format for event:', eventData);
        return total;
      }
      
      if (eventDate >= weekStartDate) {
        const duration = eventData.duration || 0;
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
          date: event.parsedDate,
          duration: event.duration
        })),
        taggedEventsList: taggedEvents.map(event => ({
          id: event.id,
          title: event.title,
          date: event.parsedDate,
          department: event.department,
          requirements: event.requirements
        }))
      }
    };
  } catch (error) {
    console.error("Error getting dashboard stats:", error);
    return { success: false, error: error.message };
  }
};
