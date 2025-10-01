import { db } from './firebase';
import { 
  collection, 
  getDocs,
  doc,
  updateDoc,
  query,
  orderBy,
  where,
  serverTimestamp
} from 'firebase/firestore';

export const getAllUsers = async () => {
  try {
    const usersRef = collection(db, 'users');
    // Remove orderBy to avoid issues with missing createdAt fields
    const querySnapshot = await getDocs(usersRef);
    const users = [];
    
    console.log('Firestore query returned', querySnapshot.size, 'documents');
    
    querySnapshot.forEach((doc) => {
      const userData = doc.data();
      const generatedName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim();
      
      // Debug logging for users with missing lastName
      if (!userData.lastName && userData.firstName) {
        console.log('User with missing lastName:', {
          id: doc.id,
          firstName: userData.firstName,
          lastName: userData.lastName,
          generatedName: generatedName,
          role: userData.role
        });
      }
      
      const userObj = { 
        id: doc.id,
        ...userData,
        // Add computed fields
        name: generatedName,
        initials: `${(userData.firstName?.[0] || '').toUpperCase()}${(userData.lastName?.[0] || '').toUpperCase()}`,
        status: userData.status || 'active', // Default to active if status is not set
      };
      
      // Debug logging for admin/superadmin roles
      if (userData.role === 'Admin' || userData.role === 'SuperAdmin') {
        console.log('Found admin/superadmin user:', {
          id: doc.id,
          role: userData.role,
          firstName: userData.firstName,
          email: userData.email,
          generatedName: generatedName
        });
      }
      
      users.push(userObj);
    });

    return { success: true, users };
  } catch (error) {
    console.error('Error getting users:', error);
    return { success: false, error: error.message };
  }
};

export const getActiveUsers = async () => {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('status', '==', 'active'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.size;
  } catch (error) {
    console.error('Error getting active users count:', error);
    return 0;
  }
};

export const getAdminUsers = async () => {
  try {
    const usersRef = collection(db, 'users');
    
    // Query for admin users
    const adminQuery = query(usersRef, where('role', '==', 'admin'));
    const adminSnapshot = await getDocs(adminQuery);
    
    // Query for superadmin users
    const superAdminQuery = query(usersRef, where('role', '==', 'superadmin'));
    const superAdminSnapshot = await getDocs(superAdminQuery);
    
    // Return combined count
    return adminSnapshot.size + superAdminSnapshot.size;
  } catch (error) {
    console.error('Error getting admin users count:', error);
    return 0;
  }
};

export const updateUser = async (userId, userData) => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      ...userData,
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating user:', error);
    return { success: false, error: error.message };
  }
};