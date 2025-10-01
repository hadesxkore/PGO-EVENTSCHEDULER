import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

export async function getAllDepartments() {
  try {
    const departmentsRef = collection(db, "departments");
    const querySnapshot = await getDocs(departmentsRef);
    
    const departments = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return {
      success: true,
      departments
    };
  } catch (error) {
    console.error("Error fetching departments:", error);
    return {
      success: false,
      error: error.message
    };
  }
}

export async function addDepartment(departmentData) {
  try {
    const departmentsRef = collection(db, "departments");
    const docRef = await addDoc(departmentsRef, {
      ...departmentData,
      defaultRequirements: [],
      isHidden: false, // New departments are visible by default
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    return {
      success: true,
      id: docRef.id
    };
  } catch (error) {
    console.error("Error adding department:", error);
    return {
      success: false,
      error: error.message
    };
  }
}

export async function updateDepartmentRequirements(departmentId, requirements) {
  try {
    const departmentRef = doc(db, "departments", departmentId);
    await updateDoc(departmentRef, {
      defaultRequirements: requirements,
      updatedAt: serverTimestamp()
    });

    return {
      success: true
    };
  } catch (error) {
    console.error("Error updating department requirements:", error);
    return {
      success: false,
      error: error.message
    };
  }
}

export async function updateDepartment(departmentId, departmentData) {
  try {
    const departmentRef = doc(db, "departments", departmentId);
    await updateDoc(departmentRef, {
      ...departmentData,
      updatedAt: serverTimestamp()
    });

    return {
      success: true
    };
  } catch (error) {
    console.error("Error updating department:", error);
    return {
      success: false,
      error: error.message
    };
  }
}

export async function toggleDepartmentVisibility(departmentId, isHidden) {
  try {
    const departmentRef = doc(db, "departments", departmentId);
    await updateDoc(departmentRef, {
      isHidden: isHidden,
      updatedAt: serverTimestamp()
    });

    return {
      success: true
    };
  } catch (error) {
    console.error("Error toggling department visibility:", error);
    return {
      success: false,
      error: error.message
    };
  }
}

export async function deleteDepartment(departmentId) {
  try {
    const departmentRef = doc(db, "departments", departmentId);
    await deleteDoc(departmentRef);

    return {
      success: true
    };
  } catch (error) {
    console.error("Error deleting department:", error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get only visible departments (not hidden)
 * @returns {Object} Result object with success status and departments array
 */
export async function getVisibleDepartments() {
  try {
    const departmentsRef = collection(db, "departments");
    const querySnapshot = await getDocs(departmentsRef);
    
    const departments = querySnapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      .filter(dept => !dept.isHidden); // Filter out hidden departments

    return {
      success: true,
      departments
    };
  } catch (error) {
    console.error("Error fetching visible departments:", error);
    return {
      success: false,
      error: error.message
    };
  }
}
