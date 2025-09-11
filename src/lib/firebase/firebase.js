import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  setPersistence, 
  browserLocalPersistence,
  sendEmailVerification
} from "firebase/auth";
import { getFirestore, doc, setDoc, collection, query, where, getDocs, serverTimestamp } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyBlGubNYUGDbivxCCZp-ZqMpgFzSgw96bg",
  authDomain: "pgo-eventscheduler.firebaseapp.com",
  projectId: "pgo-eventscheduler",
  storageBucket: "pgo-eventscheduler.firebasestorage.app",
  messagingSenderId: "992759133564",
  appId: "1:992759133564:web:80ee443de3b99f4196e0f9",
  measurementId: "G-80548L3VNW"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const analytics = getAnalytics(app);

// Configure auth persistence
setPersistence(auth, browserLocalPersistence)
  .then(() => {
    console.log("Firebase persistence set to LOCAL");
  })
  .catch((error) => {
    console.error("Error setting persistence:", error);
  });

// Auth functions
// Helper function to send verification email
export const sendVerificationEmail = async (user) => {
  try {
    await sendEmailVerification(user);
    return { success: true };
  } catch (error) {
    console.error("Error sending verification email:", error);
    throw error;
  }
};

export const registerUser = async (email, password, userData) => {
  try {
    // Create auth user
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Send email verification
    await sendVerificationEmail(user);

    // Store additional user data in Firestore
    await setDoc(doc(db, "users", user.uid), {
      ...userData,
      status: 'pending',  // Set status as pending until email is verified
      emailVerified: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    return { success: true, user };
  } catch (error) {
    console.error("Error in registerUser:", error);
    throw error;
  }
};

export const loginUser = async (username, password) => {
  try {
    // First, find the user with the given username in Firestore
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("username", "==", username));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      throw new Error("Username not found");
    }

    // Get the user's email from the document
    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data();
    const email = userData.email;

    // Now login with the email and password
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    
    // Always set user as active and verified when logging in
    await setDoc(doc(db, "users", userCredential.user.uid), {
      ...userData,
      emailVerified: true,
      status: 'active',
      updatedAt: serverTimestamp()
    }, { merge: true });
    
    return { 
      success: true, 
      user: userCredential.user,
      userData: { ...userData, emailVerified: true, status: 'active' }
    };
  } catch (error) {
    console.error("Error in loginUser:", error);
    if (error.message === "Username not found") {
      throw new Error("Invalid username or password");
    }
    if (error.code === "auth/wrong-password") {
      throw new Error("Invalid username or password");
    }
    if (error.message === "Please verify your email before logging in") {
      throw error;
    }
    throw error;
  }
};