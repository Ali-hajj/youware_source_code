import React from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday } from 'date-fns';
import { useEventStore } from '../store/eventStore';
import { EventCard } from './EventCard';

interface CalendarProps {
  currentDate: Date;
  onDateClick?: (date: string) => void;
  onEventClick?: (eventId: string) => void;
}

export const Calendar: React.FC<CalendarProps> = ({ 
  currentDate, 
  onDateClick,
  onEventClick 
}) => {
  const { getEventsForDate, events } = useEventStore();

  console.log(`📅 Calendar rendering for month: ${format(currentDate, 'MMMM yyyy')}`);
  console.log(`📊 Total events in store: ${events.length}`, events);

  // Get calendar grid dates - only show current month days
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  
  const calendarDays = eachDayOfInterval({
    start: monthStart,
    end: monthEnd,
  });

  const handleDateClick = (date: Date) => {
    if (onDateClick) {
      onDateClick(format(date, 'yyyy-MM-dd'));
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Calendar Header */}
      <div className="grid grid-cols-7 border-b border-gray-200">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div
            key={day}
            className="px-4 py-3 text-sm font-medium text-gray-500 text-center border-r border-gray-100 last:border-r-0"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7">
        {/* Fill empty cells at the start if month doesn't start on Sunday */}
        {Array.from({ length: monthStart.getDay() }, (_, index) => (
          <div key={`empty-start-${index}`} className="min-h-[120px] border-r border-b border-gray-100 bg-gray-50/30"></div>
        ))}
        
        {calendarDays.map((date, index) => {
          const dateString = format(date, 'yyyy-MM-dd');
          const dayEvents = getEventsForDate(dateString);
          const isCurrentDay = isToday(date);
          
          if (dayEvents.length > 0) {
            console.log(`📌 ${dateString}: ${dayEvents.length} event(s)`, dayEvents.map(e => e.title));
          }

          return (
            <div
              key={index}
              className={`
                min-h-[120px] border-r border-b border-gray-100 last:border-r-0 p-2 cursor-pointer hover:bg-gray-50 transition-colors
                ${isCurrentDay ? 'bg-blue-50' : ''}
              `}
              onClick={() => handleDateClick(date)}
            >
              {/* Date Number */}
              <div className={`
                text-sm font-medium mb-2 
                ${isCurrentDay ? 'text-blue-600 font-bold' : 'text-gray-900'}
              `}>
                {format(date, 'd')}
              </div>

              {/* Events */}
              <div className="space-y-1">
                {dayEvents.slice(0, 3).map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    compact={true}
                    onClick={() => onEventClick?.(event.id)}
                  />
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-xs text-gray-500 text-center py-1">
                    +{dayEvents.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
        
        {/* Fill empty cells at the end to complete the grid */}
        {Array.from({ length: 6 - monthEnd.getDay() }, (_, index) => (
          <div key={`empty-end-${index}`} className="min-h-[120px] border-r border-b border-gray-100 bg-gray-50/30 last:border-r-0"></div>
        ))}
      </div>
    </div>
  );
};