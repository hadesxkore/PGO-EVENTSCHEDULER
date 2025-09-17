import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';

const ModernCalendar = ({ 
  selectedDate, 
  onDateSelect, 
  disabledDates = [], 
  isDarkMode = false 
}) => {
  const [currentMonth, setCurrentMonth] = React.useState(selectedDate || new Date());
  
  const today = new Date();
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  
  // Get first day of month and number of days
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const startingDayOfWeek = firstDayOfMonth.getDay();
  
  // Generate calendar days
  const calendarDays = [];
  
  // Previous month's trailing days
  const prevMonth = new Date(year, month - 1, 0);
  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    calendarDays.push({
      date: prevMonth.getDate() - i,
      isCurrentMonth: false,
      isToday: false,
      isSelected: false,
      isDisabled: false
    });
  }
  
  // Current month's days
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const isToday = date.toDateString() === today.toDateString();
    const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();
    const isBooked = disabledDates.some(disabledDate => {
      if (!disabledDate) return false;
      const disabledDateObj = disabledDate instanceof Date ? disabledDate : new Date(disabledDate);
      const isBookedDate = disabledDateObj.toDateString() === date.toDateString();
      if (isBookedDate) {
        console.log(`Date ${day} is booked:`, disabledDateObj.toDateString());
      }
      return isBookedDate;
    });
    const isDisabled = date < today || isBooked;
    
    calendarDays.push({
      date: day,
      isCurrentMonth: true,
      isToday,
      isSelected,
      isDisabled,
      isBooked
    });
  }
  
  // Next month's leading days
  const totalCells = 42; // 6 weeks * 7 days
  const remainingDays = totalCells - calendarDays.length;
  for (let day = 1; day <= remainingDays; day++) {
    calendarDays.push({
      date: day,
      isCurrentMonth: false,
      isToday: false,
      isSelected: false,
      isDisabled: false
    });
  }
  
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  const handleDateClick = (day) => {
    if (day.isCurrentMonth && !day.isDisabled && !day.isBooked) {
      const selectedDate = new Date(year, month, day.date);
      onDateSelect(selectedDate);
    }
  };
  
  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(year, month - 1));
  };
  
  const goToNextMonth = () => {
    setCurrentMonth(new Date(year, month + 1));
  };
  
  return (
    <div className={cn(
      "w-[280px] bg-white rounded-lg shadow-lg p-4",
      isDarkMode && "bg-gray-800"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={goToPreviousMonth}
          className={cn(
            "p-2 rounded-lg hover:bg-gray-100 transition-colors",
            isDarkMode && "hover:bg-gray-700"
          )}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        
        <h3 className={cn(
          "text-lg font-semibold",
          isDarkMode ? "text-white" : "text-gray-900"
        )}>
          {monthNames[month]} {year}
        </h3>
        
        <button
          onClick={goToNextMonth}
          className={cn(
            "p-2 rounded-lg hover:bg-gray-100 transition-colors",
            isDarkMode && "hover:bg-gray-700"
          )}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      
      {/* Day names */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayNames.map((day) => (
          <div
            key={day}
            className={cn(
              "h-8 flex items-center justify-center text-xs font-medium",
              isDarkMode ? "text-gray-400" : "text-gray-500"
            )}
          >
            {day}
          </div>
        ))}
      </div>
      
      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day, index) => (
          <button
            key={index}
            onClick={() => handleDateClick(day)}
            disabled={!day.isCurrentMonth || day.isDisabled || day.isBooked}
            className={cn(
              "h-8 w-8 rounded-lg text-sm font-medium transition-all duration-200",
              "flex items-center justify-center",
              
              // BOOKED STYLING - HIGHEST PRIORITY
              day.isBooked && (
                isDarkMode
                  ? "bg-red-600 text-white cursor-not-allowed hover:bg-red-600"
                  : "bg-red-500 text-white cursor-not-allowed hover:bg-red-500"
              ),
              
              // SELECTED STYLING - SECOND PRIORITY
              !day.isBooked && day.isSelected && (
                isDarkMode
                  ? "bg-blue-600 text-white"
                  : "bg-blue-600 text-white"
              ),
              
              // TODAY STYLING - THIRD PRIORITY
              !day.isBooked && !day.isSelected && day.isToday && (
                isDarkMode 
                  ? "bg-blue-600 text-white" 
                  : "bg-blue-100 text-blue-900"
              ),
              
              // NORMAL STYLING - LOWEST PRIORITY
              !day.isBooked && !day.isSelected && !day.isToday && day.isCurrentMonth && (
                isDarkMode ? "text-white hover:bg-gray-700" : "text-gray-900 hover:bg-gray-100"
              ),
              
              // OUTSIDE MONTH STYLING
              !day.isCurrentMonth && (
                isDarkMode ? "text-gray-600" : "text-gray-400"
              ),
              
              // DISABLED STYLING (past dates only)
              !day.isBooked && day.isDisabled && (
                isDarkMode
                  ? "text-gray-600 cursor-not-allowed opacity-50"
                  : "text-gray-400 cursor-not-allowed opacity-50"
              )
            )}
          >
            {day.date}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ModernCalendar;
