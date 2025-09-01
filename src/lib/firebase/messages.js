import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  onSnapshot, 
  orderBy, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from './firebase';

// Get tagged departments for a user
export const getTaggedDepartments = async (userEmail) => {
  try {
    const eventsRef = collection(db, "eventRequests");
    const departments = new Set();
    const usersWhoTaggedMe = new Set();

    // Get events where user is the creator
    const userEventsQuery = query(eventsRef, where("userEmail", "==", userEmail));
    const userEventsSnapshot = await getDocs(userEventsQuery);
    
    // Get user's department from their events
    let userDepartment = null;
    userEventsSnapshot.docs.forEach(doc => {
      const event = doc.data();
      // The current user's department is in the 'department' field
      if (event.department && !userDepartment) {
        userDepartment = event.department;
      }
      // Add departments that the current user has tagged
      if (event.departmentRequirements) {
        event.departmentRequirements.forEach(dept => {
          if (dept.departmentName) {
            departments.add(dept.departmentName);
          }
        });
      }
    });

    // If user has no events, try to get their department from the users collection
    if (!userDepartment) {
      try {
        const usersRef = collection(db, "users");
        const userQuery = query(usersRef, where("email", "==", userEmail));
        const userSnapshot = await getDocs(userQuery);
        if (!userSnapshot.empty) {
          const userData = userSnapshot.docs[0].data();
          userDepartment = userData.department;
        }
      } catch (error) {
        console.error('Error fetching user department:', error);
      }
    }

    if (userDepartment) {
      // Add the current user's own department to the list so they can see users from their department
      departments.add(userDepartment);
      
      // Get all events to find where user's department is tagged
      const allEventsQuery = query(eventsRef);
      const allEventsSnapshot = await getDocs(allEventsQuery);
      
      allEventsSnapshot.docs.forEach(doc => {
        const event = doc.data();
        if (event.userEmail !== userEmail && event.departmentRequirements) {
          const isTagged = event.departmentRequirements.some(
            dept => dept.departmentName === userDepartment
          );
          if (isTagged && event.department) {
            departments.add(event.department);
            // Add the user who tagged me
            usersWhoTaggedMe.add(event.userEmail);
          }
        }
      });
    }

    return { 
      success: true, 
      departments: Array.from(departments),
      usersWhoTaggedMe: Array.from(usersWhoTaggedMe)
    };
  } catch (error) {
    console.error('Error fetching tagged departments:', error);
    return { success: false, error: 'Error fetching departments' };
  }
};

// Get users from specific departments
export const getUsersFromDepartments = async (departments, excludeEmail = null, excludeUid = null, usersWhoTaggedMe = [], usersWhoMessagedMe = []) => {
  try {
    const usersRef = collection(db, "users");
    const eventsRef = collection(db, "eventRequests");
    const messagesRef = collection(db, "messages");
    const usersSnapshot = await getDocs(usersRef);
    
    // Get all events first
    const eventsSnapshot = await getDocs(eventsRef);
    const eventsMap = new Map();
    const userDepartmentMap = new Map(); // Map to store user's department
    const taggedByMap = new Map(); // Map to store who tagged whom
    
    // Get all messages to find users who have messaged the current user
    const messagesSnapshot = await getDocs(messagesRef);
    const usersWhoMessagedMe = new Set();
    const usersIMessaged = new Set();
    
    messagesSnapshot.docs.forEach(doc => {
      const message = doc.data();
      if (message.participants && message.participants.length === 2) {
        const [user1, user2] = message.participants;
        if (user1 === excludeEmail) {
          usersWhoMessagedMe.add(user2);
        } else if (user2 === excludeEmail) {
          usersWhoMessagedMe.add(user1);
        }
      }
    });
    
    // Also get all events to find users who have tagged the current user's department
    const allEventsSnapshot = await getDocs(eventsRef);
    const usersWhoTaggedMyDepartment = new Set();
    
    // Get the current user's department from their events
    let currentUserDepartment = null;
    if (excludeEmail) {
      const userEventsQuery = query(eventsRef, where("userEmail", "==", excludeEmail));
      const userEventsSnapshot = await getDocs(userEventsQuery);
      
      userEventsSnapshot.docs.forEach(doc => {
        const event = doc.data();
        if (event.department && !currentUserDepartment) {
          currentUserDepartment = event.department;
        }
      });
    }
    
    if (currentUserDepartment) {
      allEventsSnapshot.docs.forEach(doc => {
        const event = doc.data();
        if (event.userEmail !== excludeEmail && event.departmentRequirements) {
          // Check if this event tags the current user's department
          const isTaggingMyDepartment = event.departmentRequirements.some(
            dept => dept.departmentName && dept.departmentName === currentUserDepartment
          );
          if (isTaggingMyDepartment) {
            usersWhoTaggedMyDepartment.add(event.userEmail);
          }
        }
      });
    }
    
    // Also find users whose departments have been tagged by the current user
    const usersWhoseDepartmentsITagged = new Set();
    allEventsSnapshot.docs.forEach(doc => {
      const event = doc.data();
      if (event.userEmail === excludeEmail && event.departmentRequirements) {
        // This event was created by the current user and tags other departments
        event.departmentRequirements.forEach(dept => {
          if (dept.departmentName) {
            usersWhoseDepartmentsITagged.add(dept.departmentName);
          }
        });
      }
    });
    
    // First, build a map of user emails to their departments
    eventsSnapshot.docs.forEach(doc => {
      const event = doc.data();
      if (event.userEmail && event.department) {
        userDepartmentMap.set(event.userEmail, event.department);
      }
    });

    // Build a map of events and tagging relationships
    eventsSnapshot.docs.forEach(doc => {
      const event = doc.data();
      const eventId = doc.id;
      
      if (event.departmentRequirements && event.departmentRequirements.length > 0) {
        // For each department requirement, record the tagging relationship
        event.departmentRequirements.forEach(dept => {
          if (dept.departmentName && departments.includes(dept.departmentName)) {
            // Store who tagged this department
            const key = `${event.userEmail}_${dept.departmentName}`;
            taggedByMap.set(key, {
              taggerEmail: event.userEmail,
              taggerDepartment: event.department,
              taggedDepartment: dept.departmentName,
              eventId: eventId,
              eventTitle: event.title || event.eventTitle,
              timestamp: event.timestamp
            });
          }
        });
      }
    });
    
    const usersData = usersSnapshot.docs
      .map(doc => {
        const userData = { id: doc.id, ...doc.data() };
        
        // Find events where this user was tagged or did the tagging
        const userTaggingEvents = [];
        const userTaggedEvents = [];
        
        taggedByMap.forEach((tagInfo, key) => {
          // If this user tagged someone
          if (tagInfo.taggerEmail === userData.email) {
            userTaggingEvents.push({
              eventId: tagInfo.eventId,
              eventTitle: tagInfo.eventTitle,
              taggedDepartment: tagInfo.taggedDepartment,
              timestamp: tagInfo.timestamp
            });
          }
          
          // If this user's department was tagged by someone
          if (tagInfo.taggedDepartment === userData.department) {
            userTaggedEvents.push({
              eventId: tagInfo.eventId,
              eventTitle: tagInfo.eventTitle,
              taggerDepartment: tagInfo.taggerDepartment,
              taggerEmail: tagInfo.taggerEmail,
              timestamp: tagInfo.timestamp
            });
          }
        });

        return {
          ...userData,
          taggingEvents: userTaggingEvents,
          taggedEvents: userTaggedEvents,
          // Add a flag to show if this user has tagged others or been tagged
          hasTaggingRelation: userTaggingEvents.length > 0 || userTaggedEvents.length > 0
        };
      })
      .filter(user => {
        if (!user.email || !user.department || user.role === "Admin") {
          return false;
        }
        if (excludeEmail && user.email === excludeEmail) {
          return false;
        }
        if (excludeUid && user.id === excludeUid) {
          return false;
        }
        // Include users who either:
        // 1. Are in the departments list OR
        // 2. Have a tagging relationship (tagged or been tagged) OR
        // 3. Are users who tagged the current user OR
        // 4. Are users who have messaged the current user OR
        // 5. Are users the current user has messaged OR
        // 6. Are users who have tagged the current user's department OR
        // 7. Are users from departments that the current user has tagged
        return departments.includes(user.department) || 
               user.hasTaggingRelation || 
               usersWhoTaggedMe.includes(user.email) ||
               usersWhoMessagedMe.has(user.email) ||
               usersIMessaged.has(user.email) ||
               usersWhoTaggedMyDepartment.has(user.email) ||
               usersWhoseDepartmentsITagged.has(user.department);
      });

    return { success: true, users: usersData };
  } catch (error) {
    console.error('Error fetching users:', error);
    return { success: false, error: 'Error fetching users' };
  }
};

// Subscribe to last messages for all chats
export const subscribeToLastMessages = (userEmail, callback) => {
  if (!userEmail) return null;

  const messagesRef = collection(db, "messages");
  const q = query(
    messagesRef,
    where("participants", "array-contains", userEmail),
    orderBy("timestamp", "desc")
  );

  return onSnapshot(q, callback);
};

// Load messages for a specific chat
export const loadChatMessages = async (chatId) => {
  try {
    const messagesRef = collection(db, "messages");
    const q = query(
      messagesRef,
      where("chatId", "==", chatId),
      orderBy("timestamp", "asc")
    );

    const snapshot = await getDocs(q);
    const messagesData = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return { success: true, messages: messagesData };
  } catch (error) {
    console.error('Error loading messages:', error);
    return { success: false, error: 'Error loading messages' };
  }
};

// Subscribe to messages for real-time updates
export const subscribeToChatMessages = (chatId, callback) => {
  if (!chatId) return null;

  const messagesRef = collection(db, "messages");
  const q = query(
    messagesRef,
    where("chatId", "==", chatId),
    orderBy("timestamp", "asc")
  );

  return onSnapshot(q, callback);
};

// Send a new message
export const sendNewMessage = async (messageData) => {
  try {
    const messagesRef = collection(db, "messages");
    const docRef = await addDoc(messagesRef, {
      ...messageData,
      timestamp: serverTimestamp()
    });

    return { success: true, messageId: docRef.id };
  } catch (error) {
    console.error('Error sending message:', error);
    return { success: false, error: 'Error sending message' };
  }
};