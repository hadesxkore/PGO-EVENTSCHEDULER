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
    // Error handled in return
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
    const querySnapshot = await getDocs(q);
    const requests = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      requests.push({ id: doc.id, ...data });
    });
    return { success: true, requests };
  } catch (error) {
    // Error handled in return
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
    // Error handled in return
    return { success: false, error: error.message };
  }
};

// Update event request status
export const updateEventRequestStatus = async (requestId, status, adminId, disapprovalReason = null) => {
  try {
    const requestRef = doc(db, 'eventRequests', requestId);
    const updateData = {
      status,
      updatedAt: serverTimestamp(),
      adminId,
      actionDate: serverTimestamp()
    };

    // Only add disapprovalReason if status is 'disapproved' and reason is provided
    if (status === 'disapproved' && disapprovalReason) {
      updateData.disapprovalReason = disapprovalReason;
    }

    await updateDoc(requestRef, updateData);
    return { success: true };
  } catch (error) {
    // Error handled in return
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
    // Error handled in return
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
    // Error handled in return
    return { success: false, error: error.message };
  }
};