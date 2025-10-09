import React from 'react';
import { format, parse } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, Calendar } from 'lucide-react';
import { useEventStore } from '../store/eventStore';
import { EventCard } from './EventCard';

interface DailyViewProps {
  selectedDate: string; // YYYY-MM-DD format
  onDateChange: (date: string) => void;
  onBackToMonth: () => void;
  onNewEvent: (date?: string) => void;
  onEventClick: (eventId: string) => void;
}

export const DailyView: React.FC<DailyViewProps> = ({
  selectedDate,
  onDateChange,
  onBackToMonth,
  onNewEvent,
  onEventClick
}) => {
  const { getEventsForDate } = useEventStore();
  
  const date = parse(selectedDate, 'yyyy-MM-dd', new Date());
  const dayEvents = getEventsForDate(selectedDate);

  const handlePreviousDay = () => {
    const prevDay = new Date(date);
    prevDay.setDate(prevDay.getDate() - 1);
    onDateChange(format(prevDay, 'yyyy-MM-dd'));
  };

  const handleNextDay = () => {
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);
    onDateChange(format(nextDay, 'yyyy-MM-dd'));
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-full flex flex-col">
      {/* Daily View Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <div className="flex items-center gap-4">
          <button
            onClick={onBackToMonth}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
          >
            <Calendar className="h-4 w-4" />
            Back to Month
          </button>
          
          <div className="w-px h-6 bg-gray-300"></div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={handlePreviousDay}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            
            <h2 className="text-xl font-semibold text-gray-900">
              {format(date, 'EEEE, MMMM d, yyyy')}
            </h2>
            
            <button
              onClick={handleNextDay}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        <button
          onClick={() => onNewEvent(selectedDate)}
          className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" />
          New Event
        </button>
      </div>

      {/* Daily Events Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {dayEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Calendar className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No events scheduled</h3>
            <p className="text-gray-500 mb-6">
              No events are scheduled for {format(date, 'MMMM d, yyyy')}
            </p>
            <button
              onClick={() => onNewEvent(selectedDate)}
              className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Schedule Event
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">
                {dayEvents.length} {dayEvents.length === 1 ? 'Event' : 'Events'} Scheduled
              </h3>
            </div>
            
            {/* Sort events by start time */}
            {dayEvents
              .sort((a, b) => a.startTime.localeCompare(b.startTime))
              .map((event) => (
                <div key={event.id} className="border border-gray-200 rounded-lg overflow-hidden">
                  <EventCard
                    event={event}
                    compact={false}
                    onClick={() => onEventClick(event.id)}
                    showFullDetails={true}
                  />
                </div>
              ))
            }
          </div>
        )}
      </div>
    </div>
  );
};