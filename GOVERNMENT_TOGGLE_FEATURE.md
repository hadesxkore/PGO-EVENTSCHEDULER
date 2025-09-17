# Gov Involvement Checkbox Feature

## Overview
Added a compact checkbox in the Event Details card of the Request Event page to allow users to specify whether their event requires governor involvement or not.

## Features

### Checkbox Design
- **Location**: Event Details card, positioned after VIP/VVIP fields
- **Option**: 
  - "With Gov" (checked by default)
  - Unchecked means "Without Gov"
- **Visual Design**: Compact checkbox with shield icon
- **Icon**: Shield icon to represent governor involvement

### Visual Design
- **Compact Layout**: Single row with checkbox and label
- **Background**: Subtle gray background for the container
- **Icon**: Shield icon next to "With Gov" label
- **Space Efficient**: Minimal vertical space usage

### Form Integration
- **State Management**: Added `withGov` field to formData state
- **Validation**: Included in form completion validation
- **Submission**: Automatically included in event data submission
- **Default Value**: `true` (With Government)

## Implementation Details

### State Management
```javascript
const [formData, setFormData] = useState({
  // ... existing fields
  withGov: true, // Default to true (with gov)
});
```

### Checkbox Component
- Compact single-row design
- Accessible checkbox element
- Clear visual feedback for checked/unchecked state
- Minimal space consumption

### Form Validation
```javascript
const isEventDetailsComplete = 
  formData.title && 
  formData.requestor && 
  formData.location && 
  formData.participants &&
  formData.vip &&
  formData.classifications &&
  formData.withGov !== undefined;
```

### Data Submission
The `withGov` field is automatically included in the event submission through the existing `formData` spread operator in `eventDataWithUser`.

## User Experience

### Visual Design
- Clean, modern toggle interface
- Consistent with existing form styling
- Dark mode support
- Responsive layout

### User Flow
1. User fills out basic event details
2. User checks/unchecks "With Gov" checkbox
3. Visual feedback shows current state
4. Form validation includes the selection
5. Data is submitted with the preference

### Accessibility
- Clear labels and descriptions
- Keyboard navigation support
- Screen reader friendly
- Visual indicators for current state

## Testing
- Unit tests for toggle functionality
- State management testing
- Form validation testing
- Visual state testing

## Benefits
- **Clear Communication**: Users can explicitly state governor involvement needs
- **Process Clarity**: Helps administrators understand event requirements
- **Better Organization**: Events can be categorized by governor involvement
- **Improved Workflow**: Streamlines approval process based on requirements
- **Space Efficient**: Compact design saves vertical space in the form

## Future Enhancements
- Different approval workflows based on governor involvement
- Filtering events by governor involvement status
- Reporting on governor vs non-governor events
- Integration with approval processes
