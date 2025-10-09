import React, { useState } from 'react';
import { format } from 'date-fns';
import { Edit, Trash2, Archive, DollarSign, Calendar, CheckSquare, Square, Filter, ExternalLink, FileText, BarChart3 } from 'lucide-react';
import { useEventStore } from '../store/eventStore';
import { Event, EventStatus, PaymentStatus, AppUser } from '../types';
import { InvoiceDialog } from './InvoiceDialog';
import { PaymentAnalytics } from './PaymentAnalytics';

interface HistoryTabProps {
  onEditEvent: (event: Event) => void;
  onNavigateToDate?: (date: string) => void;
  statusFilter?: EventStatus;
  paymentFilter?: PaymentStatus;
  currentUser?: AppUser | null;
}

export const HistoryTab: React.FC<HistoryTabProps> = ({ 
  onEditEvent, 
  onNavigateToDate,
  statusFilter,
  paymentFilter,
  currentUser,
}) => {
  const activeUser = currentUser ?? {
    id: 'GUEST',
    username: 'guest',
    role: 'guest',
    firstName: 'Guest',
    lastName: 'User',
    phone: '',
    email: '',
    createdAt: '',
    updatedAt: '',
  };

  const { events, deleteEvent, clearAllEvents } = useEventStore();
  const canDeleteEvents = activeUser.role === 'admin' || activeUser.role === 'manager';
  const [selectedEvents, setSelectedEvents] = useState<Set<string>>(new Set());
  const [localStatusFilter, setLocalStatusFilter] = useState<EventStatus | 'all'>('all');
  const [localPaymentFilter, setLocalPaymentFilter] = useState<PaymentStatus | 'all'>('all');
  const [selectedEventForInvoice, setSelectedEventForInvoice] = useState<Event | null>(null);
  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);

  // Sync local filters with external filters from sidebar
  React.useEffect(() => {
    if (statusFilter) {
      setLocalStatusFilter(statusFilter);
    } else if (statusFilter === undefined && localStatusFilter !== 'all') {
      // Reset local filter when external filter is cleared
      setLocalStatusFilter('all');
    }
  }, [statusFilter]);

  React.useEffect(() => {
    if (paymentFilter) {
      setLocalPaymentFilter(paymentFilter);
    } else if (paymentFilter === undefined && localPaymentFilter !== 'all') {
      // Reset local filter when external filter is cleared
      setLocalPaymentFilter('all');
    }
  }, [paymentFilter]);

  // Filter events based on criteria (no longer limited to just closed & paid)
  const historyEvents = events.filter(event => {
    // Apply local filters (which now sync with external filters)
    if (localStatusFilter !== 'all' && event.status !== localStatusFilter) return false;
    if (localPaymentFilter !== 'all' && event.paymentStatus !== localPaymentFilter) return false;
    
    return true; // Show all events when filters are 'all'
  });

  const handleSelectEvent = (eventId: string) => {
    const newSelected = new Set(selectedEvents);
    if (newSelected.has(eventId)) {
      newSelected.delete(eventId);
    } else {
      newSelected.add(eventId);
    }
    setSelectedEvents(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedEvents.size === historyEvents.length) {
      setSelectedEvents(new Set());
    } else {
      setSelectedEvents(new Set(historyEvents.map(event => event.id)));
    }
  };

  const handleDeleteSelected = () => {
    if (!canDeleteEvents) {
      window.alert('Only administrators and managers can delete events.');
      return;
    }

    if (selectedEvents.size === 0) {
      window.alert('Please select at least one event to delete.');
      return;
    }

    if (window.confirm(`Are you sure you want to delete ${selectedEvents.size} selected event(s)? This action cannot be undone.`)) {
      selectedEvents.forEach(eventId => {
        deleteEvent(eventId);
      });
      setSelectedEvents(new Set());
    }
  };

  const handleClearAllData = () => {
    if (!canDeleteEvents) {
      window.alert('Only administrators and managers can delete events.');
      return;
    }

    if (historyEvents.length === 0) {
      window.alert('There are no events to clear.');
      return;
    }

    if (window.confirm(`Are you sure you want to clear ALL filtered events? This will permanently delete ${historyEvents.length} event(s) and cannot be undone.`)) {
      clearAllEvents().catch((error) => {
        console.error('Failed to clear events:', error);
        window.alert('Failed to clear events. Please try again.');
      });
      setSelectedEvents(new Set());
    }
  };

  const formatTime = (time: string): string => {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const getVenueColor = (venue: string) => {
    switch (venue) {
      case 'restaurant': return 'bg-emerald-500';
      case 'bar': return 'bg-amber-500';
      case 'banquet': return 'bg-indigo-500';
      default: return 'bg-gray-500';
    }
  };

  const getVenueIcon = (venue: string) => {
    switch (venue) {
      case 'restaurant': return '🍽️';
      case 'bar': return '🍺';
      case 'banquet': return '🎉';
      default: return '📅';
    }
  };

  const handleNavigateToDate = (date: string) => {
    if (onNavigateToDate) {
      onNavigateToDate(date);
    }
  };

  if (historyEvents.length === 0) {
    return (
      <div className="flex-1 flex flex-col">
        {/* Filter Controls */}
        <div className="bg-white border-b border-slate-200 p-6">
          <div className="flex items-center gap-4">
            <Filter className="h-5 w-5 text-slate-500" />
            <select
              value={localStatusFilter}
              onChange={(e) => {
                const value = e.target.value as EventStatus | 'all';
                setLocalStatusFilter(value);
              }}
              className="px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="confirmed">Confirmed</option>
              <option value="pending">Pending</option>
              <option value="cancelled">Cancelled</option>
              <option value="closed">Closed</option>
            </select>
            <select
              value={localPaymentFilter}
              onChange={(e) => {
                const value = e.target.value as PaymentStatus | 'all';
                setLocalPaymentFilter(value);
              }}
              className="px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            >
              <option value="all">All Payments</option>
              <option value="paid">Paid</option>
              <option value="unpaid">Unpaid</option>
            </select>
          </div>
        </div>
        
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center py-12">
            <Archive className="h-16 w-16 text-slate-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-600 mb-2">No Events Found</h3>
            <p className="text-slate-500">
              No events match your current filter criteria.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header with filters and bulk actions */}
      <div className="bg-white border-b border-slate-200 px-6 py-5">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-col gap-1 mr-auto min-w-[220px]">
            <h2 className="text-[20px] font-semibold text-slate-900">Event History</h2>
            <span className="text-[13px] text-slate-500">
              {historyEvents.length} event{historyEvents.length !== 1 ? 's' : ''} found
            </span>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
            <Filter className="h-4 w-4 text-slate-500" />
            <select
              value={localStatusFilter}
              onChange={(e) => {
                const value = e.target.value as EventStatus | 'all';
                setLocalStatusFilter(value);
              }}
              className="text-sm px-3 py-1.5 border border-slate-200 rounded-md bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="confirmed">Confirmed</option>
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="cancelled">Cancelled</option>
              <option value="closed">Closed</option>
            </select>
            <select
              value={localPaymentFilter}
              onChange={(e) => setLocalPaymentFilter(e.target.value as PaymentStatus | 'all')}
              className="text-sm px-3 py-1.5 border border-slate-200 rounded-md bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="all">All Payments</option>
              <option value="paid">Paid</option>
              <option value="unpaid">Unpaid</option>
            </select>
            {(statusFilter || paymentFilter) && (
              <span className="text-xs text-slate-500 bg-white border border-slate-200 rounded-md px-2 py-1">
                {statusFilter && `Status: ${statusFilter}`}
                {statusFilter && paymentFilter && ' • '}
                {paymentFilter && `Payment: ${paymentFilter}`}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAnalyticsOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium shadow-sm transition-colors"
            >
              <BarChart3 className="h-4 w-4" />
              Analytics
            </button>
            {canDeleteEvents && (
              <button
                onClick={handleClearAllData}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-slate-700 hover:bg-slate-800 text-white text-sm font-medium shadow-sm transition-colors disabled:opacity-50"
                disabled={historyEvents.length === 0}
              >
                Clear All Data
              </button>
            )}
          </div>
        </div>

        {historyEvents.length > 0 && (
          <div className="flex items-center gap-3 mt-4 text-sm text-slate-600">
            <button
              onClick={handleSelectAll}
              className="flex items-center gap-2 text-slate-600 hover:text-blue-600 transition-colors"
            >
              {selectedEvents.size === historyEvents.length ? (
                <CheckSquare className="h-4 w-4" />
              ) : (
                <Square className="h-4 w-4" />
              )}
              Select All
            </button>
            <span className="text-xs text-slate-400">
              {selectedEvents.size} of {historyEvents.length} selected
            </span>
          </div>
        )}
      </div>

      {/* Events List */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid gap-4">
          {historyEvents.map((event) => (
            <div
              key={event.id}
              className={`
                bg-white rounded-lg shadow-lg border-2 p-6 transition-all duration-200
                ${selectedEvents.has(event.id) 
                  ? 'border-amber-400 shadow-amber-100' 
                  : 'border-slate-200 hover:border-slate-300 hover:shadow-xl'
                }
              `}
            >
              <div className="flex items-start justify-between">
                {/* Event Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    {/* Selection Checkbox */}
                    <button
                      onClick={() => handleSelectEvent(event.id)}
                      className="text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {selectedEvents.has(event.id) ? (
                        <CheckSquare className="h-5 w-5 text-amber-600" />
                      ) : (
                        <Square className="h-5 w-5" />
                      )}
                    </button>

                    {/* Venue Indicator */}
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${getVenueColor(event.venue)}`} />
                      <span className="text-lg">{getVenueIcon(event.venue)}</span>
                    </div>

                    {/* Event Title */}
                    <h3 className={`text-lg font-semibold text-slate-800 ${
                      event.status === 'closed' ? 'line-through' : ''
                    }`}>
                      {event.title}
                      {event.status === 'cancelled' && (
                        <span className="text-red-600 text-sm font-normal ml-2">(Cancelled)</span>
                      )}
                    </h3>

                    {/* Status Badges */}
                    <div className="flex gap-2">
                      <span className={`px-2 py-1 rounded-md text-xs font-medium border ${
                        event.status === 'confirmed' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        event.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        event.status === 'cancelled' ? 'bg-red-50 text-red-700 border-red-200' :
                        'bg-slate-50 text-slate-700 border-slate-200'
                      }`}>
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

                  {/* Event Details Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    {/* Date & Time with Navigation */}
                    <div className="flex items-center gap-2 text-slate-600">
                      <Calendar className="h-4 w-4" />
                      <div className="flex-1">
                        <button
                          onClick={() => handleNavigateToDate(event.date)}
                          className="font-medium text-left hover:text-blue-600 hover:underline transition-colors flex items-center gap-1"
                          title="Go to calendar date"
                        >
                          {format(new Date(event.date + 'T00:00:00'), 'MMM dd, yyyy')}
                          <ExternalLink className="h-3 w-3" />
                        </button>
                        <div className="text-slate-500">
                          {formatTime(event.startTime)} – {formatTime(event.endTime)}
                        </div>
                      </div>
                    </div>

                    {/* Contact Info */}
                    <div className="text-slate-600 space-y-1">
                      <div className="font-medium">{event.contact.name}</div>
                      <div className="text-slate-500">{event.contact.phone}</div>
                      <div className="text-slate-500">{event.contact.email}</div>
                      {event.createdBy && (
                        <div className="text-xs text-slate-500">
                          Added by <span className="font-semibold text-slate-700">{event.createdBy.displayName || event.createdBy.userId}</span>
                          {event.createdBy.role && ` (${event.createdBy.role})`}
                        </div>
                      )}
                      {event.updatedBy && event.updatedBy.userId !== event.createdBy?.userId && (
                        <div className="text-xs text-slate-500">
                          Last edit by <span className="font-semibold text-slate-700">{event.updatedBy.displayName || event.updatedBy.userId}</span>
                          {event.updatedBy.role && ` (${event.updatedBy.role})`}
                        </div>
                      )}
                    </div>

                    {/* Payment Info */}
                    <div className="flex items-center gap-2 text-slate-600">
                      <DollarSign className="h-4 w-4" />
                      <div>
                        <div className={`font-medium ${
                          event.paymentStatus === 'paid' ? 'text-green-700' : 'text-orange-700'
                        }`}>
                          {event.paymentStatus === 'paid' ? 'Paid' : 'Unpaid'}
                        </div>
                        {event.paymentMethod && event.paymentStatus === 'paid' && (
                          <div className="text-slate-500 capitalize">
                            {event.paymentMethod.replace('_', ' ')}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  {event.notes && (
                    <div className="mt-3 p-3 bg-slate-50 rounded-md">
                      <div className="text-sm text-slate-600">
                        <span className="font-medium">Notes: </span>
                        {event.notes}
                      </div>
                    </div>
                  )}

                  {/* Venue & Timestamps */}
                  <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                    <div className="capitalize">
                      {event.venue} venue
                    </div>
                    <div>
                      Updated: {format(new Date(event.updatedAt), 'MMM dd, yyyy HH:mm')}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-2 ml-4">
                  <button
                    onClick={() => {
                      setSelectedEventForInvoice(event);
                      setIsInvoiceDialogOpen(true);
                    }}
                    className="p-2 text-slate-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                    title="View Invoice"
                  >
                    <FileText className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onEditEvent(event)}
                    className="p-2 text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                    title="Edit Event"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm(`Are you sure you want to delete "${event.title}"? This action cannot be undone.`)) {
                        deleteEvent(event.id);
                      }
                    }}
                    className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete Event"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Invoice Dialog */}
      {selectedEventForInvoice && (
        <InvoiceDialog
          event={selectedEventForInvoice}
          isOpen={isInvoiceDialogOpen}
          onClose={() => {
            setIsInvoiceDialogOpen(false);
            setSelectedEventForInvoice(null);
          }}
        />
      )}
      
      {/* Payment Analytics */}
      <PaymentAnalytics
        isOpen={isAnalyticsOpen}
        onClose={() => setIsAnalyticsOpen(false)}
      />
    </div>
  );
};