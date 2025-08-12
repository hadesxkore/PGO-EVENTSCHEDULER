import { db } from './firebase';
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  orderBy
} from 'firebase/firestore';



// Create a new event request
export const createEventRequest = async (eventData) => {
  try {
    const eventRequestsRef = collection(db, 'eventRequests');
    const docRef = await addDoc(eventRequestsRef, {
      ...eventData,
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error creating event request:', error);
    return { success: false, error: error.message };
  }
};

// Get event requests for a specific user
export const getUserEventRequests = async (userId) => {
  try {
    const eventRequestsRef = collection(db, 'eventRequests');
    // First get all events for this user
    const q = query(
      eventRequestsRef, 
      where('userId', '==', userId)
    );
    console.log("Querying events for userId:", userId);
    const querySnapshot = await getDocs(q);
    const requests = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      console.log("Found event:", { id: doc.id, ...data });
      requests.push({ id: doc.id, ...data });
    });
    return { success: true, requests };
  } catch (error) {
    console.error('Error getting user event requests:', error);
    return { success: false, error: error.message };
  }
};

// Get all event requests (for admin)
export const getAllEventRequests = async () => {
  try {
    const eventRequestsRef = collection(db, 'eventRequests');
    const q = query(eventRequestsRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    const requests = [];
    querySnapshot.forEach((doc) => {
      requests.push({ id: doc.id, ...doc.data() });
    });
    return { success: true, requests };
  } catch (error) {
    console.error('Error getting all event requests:', error);
    return { success: false, error: error.message };
  }
};

// Update event request status
export const updateEventRequestStatus = async (requestId, status, adminId) => {
  try {
    const requestRef = doc(db, 'eventRequests', requestId);
    await updateDoc(requestRef, {
      status,
      updatedAt: serverTimestamp(),
      adminId,
      actionDate: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating event request status:', error);
    return { success: false, error: error.message };
  }
};

// Get event requests by status
export const getEventRequestsByStatus = async (status) => {
  try {
    const eventRequestsRef = collection(db, 'eventRequests');
    const q = query(
      eventRequestsRef, 
      where('status', '==', status),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    const requests = [];
    querySnapshot.forEach((doc) => {
      requests.push({ id: doc.id, ...doc.data() });
    });
    return { success: true, requests };
  } catch (error) {
    console.error('Error getting event requests by status:', error);
    return { success: false, error: error.message };
  }
};

// Delete event request
export const deleteEventRequest = async (eventId) => {
  try {
    const eventRef = doc(db, 'eventRequests', eventId);
    await deleteDoc(eventRef);
    return { success: true };
  } catch (error) {
    console.error('Error deleting event request:', error);
    return { success: false, error: error.message };
  }
};