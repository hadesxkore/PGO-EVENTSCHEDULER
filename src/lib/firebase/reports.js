import { db } from './firebase';
import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';

// Get events count by department
export const getEventsByDepartment = async (timeRange = 'month') => {
  try {
    const eventsRef = collection(db, 'eventRequests');
    let startDate;
    
    switch (timeRange) {
      case 'week':
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = subMonths(new Date(), 1);
        break;
      case 'quarter':
        startDate = subMonths(new Date(), 3);
        break;
      case 'year':
        startDate = subMonths(new Date(), 12);
        break;
      default:
        startDate = subMonths(new Date(), 1);
    }

    const q = query(
      eventsRef,
      where('createdAt', '>=', Timestamp.fromDate(startDate)),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const departmentCounts = {};
    let totalEvents = 0;

    querySnapshot.forEach((doc) => {
      const event = doc.data();
      const dept = event.userDepartment || event.department;
      if (dept) {
        departmentCounts[dept] = (departmentCounts[dept] || 0) + 1;
        totalEvents++;
      }
    });

    // Convert to array and calculate percentages
    const departmentStats = Object.entries(departmentCounts)
      .map(([name, events]) => ({
        name,
        events,
        percentage: totalEvents > 0 ? Number(((events / totalEvents) * 100).toFixed(1)) : 0
      }))
      .sort((a, b) => b.events - a.events);

    return {
      departmentStats,
      totalEvents
    };
  } catch (error) {
    console.error('Error getting events by department:', error);
    throw error;
  }
};

// Get monthly statistics
export const getMonthlyStats = async () => {
  try {
    const eventsRef = collection(db, 'eventRequests');
    const usersRef = collection(db, 'users');
    const requestsRef = collection(db, 'eventRequests');
    
    // Get last 6 months
    const months = Array.from({ length: 6 }, (_, i) => {
      const date = subMonths(new Date(), i);
      return {
        month: format(date, 'MMM'),
        startDate: startOfMonth(date),
        endDate: endOfMonth(date)
      };
    }).reverse();

    const monthlyStats = await Promise.all(
      months.map(async ({ month, startDate, endDate }) => {
        // Events query
        const eventsQuery = query(
          eventsRef,
          where('createdAt', '>=', Timestamp.fromDate(startDate)),
          where('createdAt', '<=', Timestamp.fromDate(endDate))
        );

        // Users query (users created in that month)
        const usersQuery = query(
          usersRef,
          where('createdAt', '>=', Timestamp.fromDate(startDate)),
          where('createdAt', '<=', Timestamp.fromDate(endDate))
        );

        // Requests query
        const requestsQuery = query(
          requestsRef,
          where('createdAt', '>=', Timestamp.fromDate(startDate)),
          where('createdAt', '<=', Timestamp.fromDate(endDate))
        );

        const [eventsSnap, usersSnap, requestsSnap] = await Promise.all([
          getDocs(eventsQuery),
          getDocs(usersQuery),
          getDocs(requestsQuery)
        ]);

        return {
          month,
          events: eventsSnap.size,
          users: usersSnap.size,
          requests: requestsSnap.size
        };
      })
    );

    return monthlyStats;
  } catch (error) {
    console.error('Error getting monthly stats:', error);
    throw error;
  }
};

// Get total counts
export const getTotalCounts = async () => {
  try {
    const eventsRef = collection(db, 'eventRequests');
    const usersRef = collection(db, 'users');
    const departmentsRef = collection(db, 'departments');

    // Get current month's start date for growth calculation
    const currentMonthStart = startOfMonth(new Date());
    const lastMonthStart = startOfMonth(subMonths(new Date(), 1));
    const lastMonthEnd = endOfMonth(subMonths(new Date(), 1));

    // Current month events query
    const currentMonthQuery = query(
      eventsRef,
      where('createdAt', '>=', Timestamp.fromDate(currentMonthStart))
    );

    // Last month events query
    const lastMonthQuery = query(
      eventsRef,
      where('createdAt', '>=', Timestamp.fromDate(lastMonthStart)),
      where('createdAt', '<=', Timestamp.fromDate(lastMonthEnd))
    );

    const [
      totalEventsSnap,
      totalUsersSnap,
      totalDepartmentsSnap,
      currentMonthEventsSnap,
      lastMonthEventsSnap
    ] = await Promise.all([
      getDocs(eventsRef),
      getDocs(usersRef),
      getDocs(departmentsRef),
      getDocs(currentMonthQuery),
      getDocs(lastMonthQuery)
    ]);

    const currentMonthEvents = currentMonthEventsSnap.size;
    const lastMonthEvents = lastMonthEventsSnap.size;
    const monthlyGrowth = lastMonthEvents === 0 
      ? 100 
      : Number((((currentMonthEvents - lastMonthEvents) / lastMonthEvents) * 100).toFixed(1));

    return {
      totalEvents: totalEventsSnap.size,
      totalUsers: totalUsersSnap.size,
      totalDepartments: totalDepartmentsSnap.size,
      monthlyGrowth
    };
  } catch (error) {
    console.error('Error getting total counts:', error);
    throw error;
  }
};
