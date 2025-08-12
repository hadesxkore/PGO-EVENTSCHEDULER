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
    const q = query(usersRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    const users = [];
    
    querySnapshot.forEach((doc) => {
      users.push({ 
        id: doc.id,
        ...doc.data(),
        // Add computed fields
        name: `${doc.data().firstName || ''} ${doc.data().lastName || ''}`.trim(),
        initials: `${(doc.data().firstName?.[0] || '').toUpperCase()}${(doc.data().lastName?.[0] || '').toUpperCase()}`,
        status: doc.data().status || 'active', // Default to active if status is not set
      });
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
    const q = query(usersRef, where('role', '==', 'admin'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.size;
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