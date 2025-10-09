import React from 'react';
import { Search, Filter } from 'lucide-react';
import { useEventStore } from '../store/eventStore';
import { VenueType, EventStatus, PaymentStatus } from '../types';

export const SearchAndFilter: React.FC = () => {
  const { filters, setFilters } = useEventStore();

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters({ searchQuery: e.target.value });
  };

  const handleVenueFilter = (venue: VenueType | undefined) => {
    setFilters({ venue });
  };

  const handleStatusFilter = (status: EventStatus | undefined) => {
    setFilters({ status });
  };

  const handlePaymentFilter = (paymentStatus: PaymentStatus | undefined) => {
    setFilters({ paymentStatus });
  };

  const clearFilters = () => {
    setFilters({
      venue: undefined,
      status: undefined,
      paymentStatus: undefined,
      searchQuery: ''
    });
  };

  const hasActiveFilters = Boolean(
    filters.venue || filters.status || filters.paymentStatus || filters.searchQuery
  );

  return (
    <div className="bg-white rounded-lg shadow-lg border border-slate-200 p-6">
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Search events by name, phone (313-938-6666 or 3139386666), or email..."
            className="w-full pl-10 pr-20 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent shadow-sm"
            value={filters.searchQuery || ''}
            onChange={handleSearchChange}
            onKeyPress={(e) => e.key === 'Enter' && e.preventDefault()}
          />
          <button
            type="button"
            className="absolute right-2 top-1/2 transform -translate-y-1/2 px-3 py-1 bg-amber-600 text-white text-sm rounded-md hover:bg-amber-700 transition-colors"
            onClick={() => {
              // Search is already triggered by onChange, this button provides visual feedback
              const input = document.querySelector('input[placeholder*="Search events"]') as HTMLInputElement;
              if (input) input.focus();
            }}
          >
            Search
          </button>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-700 font-medium">Filters:</span>
          </div>

          {/* Venue Filter */}
          <select
            value={filters.venue || ''}
            onChange={(e) => handleVenueFilter(e.target.value as VenueType || undefined)}
            className="px-3 py-1.5 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent shadow-sm"
          >
            <option value="">All Venues</option>
            <option value="restaurant">Restaurant</option>
            <option value="bar">Bar</option>
            <option value="banquet">Banquet</option>
          </select>

          {/* Status Filter */}
          <select
            value={filters.status || ''}
            onChange={(e) => handleStatusFilter(e.target.value as EventStatus || undefined)}
            className="px-3 py-1.5 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent shadow-sm"
          >
            <option value="">All Status</option>
            <option value="confirmed">Confirmed</option>
            <option value="pending">Pending</option>
            <option value="cancelled">Cancelled</option>
            <option value="closed">Closed</option>
          </select>

          {/* Payment Filter */}
          <select
            value={filters.paymentStatus || ''}
            onChange={(e) => handlePaymentFilter(e.target.value as PaymentStatus || undefined)}
            className="px-3 py-1.5 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent shadow-sm"
          >
            <option value="">All Payments</option>
            <option value="paid">Paid</option>
            <option value="unpaid">Unpaid</option>
          </select>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="px-3 py-1.5 text-sm text-slate-600 hover:text-amber-700 underline transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  );
};