import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

export function DatePicker({
  date,
  onSelect,
  disabled,
  existingBookings,
  loadingBookings,
  isDarkMode
}) {
  return (
    <>
      {loadingBookings ? (
        <div className={cn(
          "flex items-center justify-center p-4",
          isDarkMode ? "text-slate-400" : "text-gray-500"
        )}>
          <div className="w-6 h-6 border-2 border-current rounded-full animate-spin border-t-transparent" />
        </div>
      ) : (
        <Calendar
          mode="single"
          selected={date}
          onSelect={onSelect}
          disabled={disabled}
          initialFocus
          showOutsideDays={false}
          className={cn(
            "rounded-md shadow-none",
            isDarkMode && "dark"
          )}
          modifiers={{
            booked: (date) => {
              if (!existingBookings?.length) return false;

              return existingBookings.some(booking => {
                const checkDateStr = date.toISOString().split('T')[0];
                const startDateStr = new Date(booking.startDate).toISOString().split('T')[0];
                const endDateStr = new Date(booking.endDate).toISOString().split('T')[0];
                return checkDateStr >= startDateStr && checkDateStr <= endDateStr;
              });
            }
          }}
          modifiersStyles={{
            booked: {
              backgroundColor: '#ef4444',
              color: 'white',
              fontWeight: 'bold',
              cursor: 'not-allowed',
              opacity: '0.7',
              textDecoration: 'line-through'
            }
          }}
        />
      )}
    </>
  );
}
