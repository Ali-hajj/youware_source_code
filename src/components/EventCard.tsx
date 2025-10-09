import React from 'react';
import { format } from 'date-fns';
import { Event, VenueType, EventStatus } from '../types';
import { useEventStore } from '../store/eventStore';

interface EventCardProps {
  event: Event;
  compact?: boolean;
  onClick?: () => void;
  showFullDetails?: boolean;
}

const venueColors: Record<VenueType, string> = {
  restaurant: 'bg-emerald-500',
  bar: 'bg-amber-500',
  banquet: 'bg-indigo-500',
};

const statusColors: Record<EventStatus, string> = {
  confirmed: 'bg-blue-50 text-blue-700 border-blue-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  cancelled: 'bg-red-50 text-red-700 border-red-200',
  closed: 'bg-slate-50 text-slate-700 border-slate-200',
};

const formatTime = (time: string): string => {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
};

export const EventCard: React.FC<EventCardProps> = ({ event, compact = false, onClick, showFullDetails = false }) => {
  const { getEventColor, getVenueById } = useEventStore();
  const startTime = formatTime(event.startTime);
  const endTime = formatTime(event.endTime);
  const eventColor = getEventColor(event);
  const venue = getVenueById(event.venueId || event.venue);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick?.();
  };

  if (compact) {
    return (
      <div
        className={`
          px-2 py-1 rounded text-xs cursor-pointer hover:shadow-sm transition-all border-2
          ${event.status === 'cancelled' ? 'opacity-60' : ''}
          ${event.status === 'closed' ? 'opacity-80' : ''}
        `}
        style={{
          backgroundColor: `${eventColor}15`, // Light background with event color
          borderColor: eventColor,
          color: '#1f2937' // Dark text for readability
        }}
        onClick={handleClick}
      >
        <div className="flex items-center gap-1 mb-0.5">
          <span className={`font-medium truncate ${event.status === 'closed' ? 'line-through' : ''}`}>
            {event.title} ({startTime} - {endTime})
            {event.status === 'cancelled' && ' (Cancelled)'}
          </span>
        </div>
        <div className="opacity-70 text-xs mt-0.5">
          <div className="font-medium">{event.contact.name} ({event.contact.phone})</div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`
        bg-white rounded-lg shadow-lg border border-slate-200 p-4 cursor-pointer 
        hover:shadow-xl hover:border-slate-300 hover:scale-[1.02] transition-all duration-200
        ${event.status === 'cancelled' ? 'opacity-60' : ''}
        ${event.status === 'closed' ? 'opacity-80' : ''}
      `}
      onClick={handleClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: eventColor }}
          />
          <span className="text-lg">{venue?.icon || '📅'}</span>
          <h3 className={`font-semibold text-gray-900 ${event.status === 'closed' ? 'line-through' : ''}`}>
            {event.title}
            {event.status === 'cancelled' && ' (Cancelled)'}
          </h3>
        </div>
        <div className="flex gap-2">
          <span className={`px-2 py-1 rounded-md text-xs font-medium border ${statusColors[event.status]}`}>
            {event.status}
          </span>
          <span className={`px-2 py-1 rounded-md text-xs font-medium border ${
            event.paymentStatus === 'paid' 
              ? 'bg-green-50 text-green-700 border-green-200'
              : 'bg-orange-50 text-orange-700 border-orange-200'
          }`}>
            {event.paymentStatus}
          </span>
        </div>
      </div>

      {/* Time */}
      <div className="text-sm text-gray-600 mb-2">
        {startTime} – {endTime}
      </div>

      {/* Contact Info */}
      <div className="text-sm text-gray-600 space-y-1">
        <div className="font-medium">{event.contact.name}</div>
        <div>{event.contact.phone}</div>
        {showFullDetails && event.contact.email && (
          <div>{event.contact.email}</div>
        )}
        {event.createdBy && (
          <div className="text-xs text-gray-500">
            Added by <span className="font-medium text-gray-700">{event.createdBy.displayName || event.createdBy.userId}</span>
            {event.createdBy.role && ` (${event.createdBy.role})`}
          </div>
        )}
      </div>

      {/* Full Details for Daily View */}
      {showFullDetails && (
        <>
          {/* Venue Info */}
          <div className="mt-3 text-sm text-gray-600">
            <div className="font-medium">Venue: {venue?.name || event.venue}</div>
          </div>
          
          {/* Payment Info */}
          <div className="mt-3 text-sm text-gray-600">
            <div className="flex items-center gap-4">
              <span className="font-medium">Payment:</span>
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                event.paymentStatus === 'paid' 
                  ? 'bg-green-100 text-green-700'
                  : 'bg-orange-100 text-orange-700'
              }`}>
                {event.paymentStatus}
              </span>
              {event.paymentMethod && event.paymentStatus === 'paid' && (
                <span className="text-gray-500">via {event.paymentMethod.replace('_', ' ')}</span>
              )}
            </div>
          </div>
        </>
      )}

      {/* Notes Preview */}
      {event.notes && (
        <div className={`mt-2 text-xs text-gray-500 italic ${showFullDetails ? '' : 'truncate'}`}>
          {event.notes}
        </div>
      )}
    </div>
  );
};