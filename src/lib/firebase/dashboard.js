import { collection, getDocs, query, where, orderBy, limit } from "firebase/firestore";
import { db } from "./firebase";

export const getDashboardStats = async () => {
  try {
    // Get total events count
    const eventsRef = collection(db, "eventRequests");
    const eventsSnapshot = await getDocs(eventsRef);
    const totalEvents = eventsSnapshot.size;

    // Get total users count
    const usersRef = collection(db, "users");
    const usersSnapshot = await getDocs(usersRef);
    const totalUsers = usersSnapshot.size;

    // Get total departments
    const departmentsRef = collection(db, "departments");
    const departmentsSnapshot = await getDocs(departmentsRef);
    const totalDepartments = departmentsSnapshot.size;

    // Get recent events (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentEventsQuery = query(
      eventsRef,
      where("createdAt", ">=", thirtyDaysAgo),
      orderBy("createdAt", "desc")
    );
    const recentEventsSnapshot = await getDocs(recentEventsQuery);
    const recentEventsCount = recentEventsSnapshot.size;

    // Get recent users (last 30 days)
    const recentUsersCount = usersSnapshot.docs.filter(doc => {
      const createdAt = doc.data().createdAt;
      if (!createdAt) return false;
      const createdDate = new Date(createdAt);
      return createdDate >= thirtyDaysAgo;
    }).length;

    // Get recent departments (last 30 days)
    const recentDepartmentsQuery = query(
      departmentsRef,
      where("createdAt", ">=", thirtyDaysAgo),
      orderBy("createdAt", "desc")
    );
    const recentDepartmentsSnapshot = await getDocs(recentDepartmentsQuery);
    const recentDepartmentsCount = recentDepartmentsSnapshot.size;

    // Get most active departments (by event count)
    const departmentEventCounts = {};
    eventsSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.userDepartment) {
        departmentEventCounts[data.userDepartment] = (departmentEventCounts[data.userDepartment] || 0) + 1;
      }
    });

    const topDepartments = Object.entries(departmentEventCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([dept, count]) => ({ name: dept, count }));

    return {
      success: true,
      stats: {
        totalEvents,
        totalUsers,
        totalDepartments,
        recentEvents: recentEventsCount,
        recentUsers: recentUsersCount,
        recentDepartments: recentDepartmentsCount,
        topDepartments
      }
    };
  } catch (error) {
    console.error("Error getting dashboard stats:", error);
    return { success: false, error: error.message };
  }
};
