import React from 'react';
import { Plus, Calendar, Users, DollarSign, CheckCircle, Clock, XCircle, Archive, Shield } from 'lucide-react';
import { useEventStore } from '../store/eventStore';
import { VenueType, EventStatus, PaymentStatus, AppUser } from '../types';

interface SidebarProps {
  onNewEvent: () => void;
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onNavigateToHistory?: (statusFilter?: EventStatus, paymentFilter?: PaymentStatus) => void;
  currentUser?: AppUser | null;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onNewEvent, currentDate, onDateChange, onNavigateToHistory, currentUser, onLogout }) => {
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
  const roleLabel = activeUser.role ? activeUser.role.toUpperCase() : 'GUEST';
  const { getEventStats, filters, setFilters, settings, venues, events } = useEventStore();
  const stats = getEventStats();

  const handleVenueFilter = (venue: VenueType | undefined) => {
    setFilters({ venue });
  };

  const handleMonthChange = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    onDateChange(newDate);
  };

  return (
    <div className="w-80 min-w-80 bg-gradient-to-b from-slate-800 to-slate-900 border-r border-slate-700 min-h-0 flex flex-col shadow-xl flex-shrink-0 overflow-hidden">
      {/* Header - Fixed */}
      <div className="p-6 border-b border-slate-700 flex-shrink-0">
        <div className="mb-4 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-300 to-amber-500 bg-clip-text text-transparent">
              Event Manager
            </h1>
            <div className="flex items-center gap-2">
              <div className={`px-3 py-1 rounded-full border text-xs ${activeUser.id === 'BOOTSTRAP' ? 'bg-amber-100 border-amber-400 text-amber-700' : 'bg-slate-800/60 border-slate-600 text-slate-200'}`}>
                {activeUser.id === 'BOOTSTRAP' ? 'SETUP MODE' : roleLabel}
              </div>
              <button
                onClick={onLogout}
                className="px-3 py-1 text-xs font-semibold text-white bg-red-500 hover:bg-red-600 rounded-md transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
          <div className="text-xs text-slate-300">
            <div className="font-medium text-slate-200">Signed in as</div>
            <div className={`font-semibold ${activeUser.id === 'BOOTSTRAP' ? 'text-amber-300' : 'text-amber-300'}`}>
              {activeUser.id === 'BOOTSTRAP' ? 'Bootstrap Session' : `${activeUser.firstName} ${activeUser.lastName}`}
            </div>
            <div className="text-slate-400 font-mono text-[11px]">
              {activeUser.id}
            </div>
            <p className="mt-2 text-slate-400">
              Manage bookings, license verification, and performance insights from one control center.
            </p>
          </div>
        </div>
        
        <button
          onClick={onNewEvent}
          className="w-full text-slate-900 px-4 py-2 rounded-lg font-medium transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
          style={{
            background: `linear-gradient(to right, ${settings.themeColor}, ${settings.themeColor}dd)`,
            filter: 'hover:brightness(110%)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.filter = 'brightness(110%)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.filter = 'brightness(100%)';
          }}
        >
          <Plus className="h-4 w-4" />
          New Event
        </button>
      </div>

      {/* Calendar Navigation - Fixed */}
      <div className="p-6 border-b border-slate-700 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-100">
            {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h2>
          <div className="flex gap-1">
            <button
              onClick={() => handleMonthChange('prev')}
              className="p-1 hover:bg-slate-700 text-slate-300 hover:text-slate-100 rounded transition-colors"
            >
              ←
            </button>
            <button
              onClick={() => handleMonthChange('next')}
              className="p-1 hover:bg-slate-700 text-slate-300 hover:text-slate-100 rounded transition-colors"
            >
              →
            </button>
          </div>
        </div>
        
        <button
          onClick={() => onDateChange(new Date())}
          className="text-sm font-medium hover:opacity-80 transition-opacity"
          style={{ color: settings.themeColor }}
        >
          Go to Today
        </button>


      </div>

      {/* Scrollable Content Area - Takes remaining space */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {/* Venue Filters */}
        <div className="p-6 border-b border-slate-700">
          <h3 className="font-semibold text-slate-100 mb-3">Venue Type</h3>
          <div className="space-y-2">
            <button
              onClick={() => handleVenueFilter(undefined)}
              className={`
                w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center justify-between
                ${!filters.venue 
                  ? 'border text-slate-100' 
                  : 'hover:bg-slate-700 text-slate-300'
                }
              `}
              style={{
                backgroundColor: !filters.venue ? `${settings.themeColor}20` : undefined,
                borderColor: !filters.venue ? settings.themeColor : undefined,
                color: !filters.venue ? settings.themeColor : undefined
              }}
            >
              <span>All Venues</span>
            </button>
            
            {venues.map((venue) => (
              <button
                key={venue.id}
                onClick={() => handleVenueFilter(venue.id as VenueType)}
                className={`
                  w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center justify-between
                  ${filters.venue === venue.id 
                    ? 'border' 
                    : 'hover:bg-slate-700 text-slate-300'
                  }
                `}
                style={{
                  backgroundColor: filters.venue === venue.id ? `${settings.themeColor}20` : undefined,
                  borderColor: filters.venue === venue.id ? settings.themeColor : undefined,
                  color: filters.venue === venue.id ? settings.themeColor : undefined
                }}
              >
                <span className="flex items-center gap-2">
                  <span>{venue.icon}</span>
                  {venue.name}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Event Statistics */}
        <div className="p-6 border-b border-slate-700">
          <h3 className="font-semibold text-slate-100 mb-3 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-amber-400" />
            Event Status
          </h3>
          <div className="space-y-2">
            <button
              onClick={() => onNavigateToHistory && onNavigateToHistory()}
              className="w-full flex items-center justify-between p-3 rounded-lg bg-slate-700/50 hover:bg-slate-700 transition-colors group min-h-0"
            >
              <div className="flex items-center gap-3 text-sm text-slate-300 group-hover:text-slate-100 min-w-0">
                <Users className="h-4 w-4 text-slate-400 flex-shrink-0" />
                <span className="truncate">All Status</span>
              </div>
              <span className="font-medium text-slate-100 flex-shrink-0 ml-2">{stats.confirmed + stats.pending + stats.cancelled + stats.closed}</span>
            </button>
            <button
              onClick={() => onNavigateToHistory && onNavigateToHistory('confirmed')}
              className="w-full flex items-center justify-between p-3 rounded-lg bg-slate-700/50 hover:bg-slate-700 transition-colors group min-h-0"
            >
              <div className="flex items-center gap-3 text-sm text-slate-300 group-hover:text-slate-100 min-w-0">
                <CheckCircle className="h-4 w-4 text-blue-400 flex-shrink-0" />
                <span className="truncate">Confirmed</span>
              </div>
              <span className="font-medium text-slate-100 flex-shrink-0 ml-2">{stats.confirmed}</span>
            </button>
            <button
              onClick={() => onNavigateToHistory && onNavigateToHistory('pending')}
              className="w-full flex items-center justify-between p-3 rounded-lg bg-slate-700/50 hover:bg-slate-700 transition-colors group min-h-0"
            >
              <div className="flex items-center gap-3 text-sm text-slate-300 group-hover:text-slate-100 min-w-0">
                <Clock className="h-4 w-4 text-yellow-400 flex-shrink-0" />
                <span className="truncate">Pending</span>
              </div>
              <span className="font-medium text-slate-100 flex-shrink-0 ml-2">{stats.pending}</span>
            </button>
            <button
              onClick={() => onNavigateToHistory && onNavigateToHistory('cancelled')}
              className="w-full flex items-center justify-between p-3 rounded-lg bg-slate-700/50 hover:bg-slate-700 transition-colors group min-h-0"
            >
              <div className="flex items-center gap-3 text-sm text-slate-300 group-hover:text-slate-100 min-w-0">
                <XCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
                <span className="truncate">Cancelled</span>
              </div>
              <span className="font-medium text-slate-100 flex-shrink-0 ml-2">{stats.cancelled}</span>
            </button>
            <button
              onClick={() => onNavigateToHistory && onNavigateToHistory('closed')}
              className="w-full flex items-center justify-between p-3 rounded-lg bg-slate-700/50 hover:bg-slate-700 transition-colors group min-h-0"
            >
              <div className="flex items-center gap-3 text-sm text-slate-300 group-hover:text-slate-100 min-w-0">
                <Archive className="h-4 w-4 text-slate-400 flex-shrink-0" />
                <span className="truncate">Closed</span>
              </div>
              <span className="font-medium text-slate-100 flex-shrink-0 ml-2">{stats.closed}</span>
            </button>
          </div>
        </div>

        {/* Payment Statistics */}
        <div className="p-6 pb-8">
          <h3 className="font-semibold text-slate-100 mb-3 flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-amber-400" />
            Payment Status
          </h3>
          <div className="space-y-2">
            <button
              onClick={() => onNavigateToHistory && onNavigateToHistory(undefined, 'paid')}
              className="w-full flex items-center justify-between p-3 rounded-lg bg-slate-700/50 hover:bg-slate-700 transition-colors group min-h-0"
            >
              <div className="flex items-center gap-3 text-sm text-slate-300 group-hover:text-slate-100 min-w-0">
                <div className="w-3 h-3 rounded-full bg-green-400 flex-shrink-0"></div>
                <span className="truncate">Paid</span>
              </div>
              <span className="font-medium text-green-400 flex-shrink-0 ml-2">{stats.paid}</span>
            </button>
            <button
              onClick={() => onNavigateToHistory && onNavigateToHistory(undefined, 'unpaid')}
              className="w-full flex items-center justify-between p-3 rounded-lg bg-slate-700/50 hover:bg-slate-700 transition-colors group min-h-0"
            >
              <div className="flex items-center gap-3 text-sm text-slate-300 group-hover:text-slate-100 min-w-0">
                <div className="w-3 h-3 rounded-full bg-orange-400 flex-shrink-0"></div>
                <span className="truncate">Unpaid</span>
              </div>
              <span className="font-medium text-orange-400 flex-shrink-0 ml-2">{stats.unpaid}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};