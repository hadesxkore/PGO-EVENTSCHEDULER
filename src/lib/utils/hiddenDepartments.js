/**
 * Utility functions for managing hidden departments
 */

// Custom event for notifying when hidden departments change
const HIDDEN_DEPARTMENTS_CHANGED_EVENT = 'hiddenDepartmentsChanged';

/**
 * Dispatch event when hidden departments change
 */
const dispatchHiddenDepartmentsChanged = () => {
  window.dispatchEvent(new CustomEvent(HIDDEN_DEPARTMENTS_CHANGED_EVENT));
};

/**
 * Get the list of hidden department IDs from localStorage
 * @returns {Set<string>} Set of hidden department IDs
 */
export const getHiddenDepartments = () => {
  try {
    const saved = localStorage.getItem('hiddenDepartments');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  } catch (error) {
    console.error('Error loading hidden departments from localStorage:', error);
    return new Set();
  }
};

/**
 * Check if a department is hidden
 * @param {string} departmentId - The department ID to check
 * @returns {boolean} True if the department is hidden
 */
export const isDepartmentHidden = (departmentId) => {
  const hiddenDepartments = getHiddenDepartments();
  return hiddenDepartments.has(departmentId);
};

/**
 * Filter out hidden departments from a list of departments
 * @param {Array} departments - Array of department objects
 * @returns {Array} Filtered array without hidden departments
 */
export const filterVisibleDepartments = (departments) => {
  const hiddenDepartments = getHiddenDepartments();
  return departments.filter(dept => !hiddenDepartments.has(dept.id));
};

/**
 * Save hidden departments to localStorage and notify listeners
 * @param {Set<string>} hiddenDepartments - Set of hidden department IDs
 */
export const saveHiddenDepartments = (hiddenDepartments) => {
  try {
    localStorage.setItem('hiddenDepartments', JSON.stringify([...hiddenDepartments]));
    dispatchHiddenDepartmentsChanged();
  } catch (error) {
    console.error('Error saving hidden departments to localStorage:', error);
  }
};

/**
 * Add event listener for hidden departments changes
 * @param {Function} callback - Function to call when hidden departments change
 * @returns {Function} Cleanup function to remove the listener
 */
export const addHiddenDepartmentsListener = (callback) => {
  window.addEventListener(HIDDEN_DEPARTMENTS_CHANGED_EVENT, callback);
  return () => {
    window.removeEventListener(HIDDEN_DEPARTMENTS_CHANGED_EVENT, callback);
  };
};

// Export the event name for direct use if needed
export { HIDDEN_DEPARTMENTS_CHANGED_EVENT };
