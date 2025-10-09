import { create } from 'zustand';
import { Event, EventFilters, EventStats, Venue, AppSettings, ColorPreset } from '../types';
import { API_ENDPOINTS, API_CONFIG, apiCall, isScreenshotEnvironment } from '../config/api';
import { useAuthStore } from './authStore';

interface EventStore {
  events: Event[];
  filters: EventFilters;
  selectedEvent: Event | null;
  isEventDialogOpen: boolean;
  venues: Venue[];
  settings: AppSettings;
  colorPresets: ColorPreset[];
  
  addEvent: (event: Omit<Event, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  addMultipleEvents: (events: Omit<Event, 'id' | 'createdAt' | 'updatedAt'>[]) => Promise<void>;
  updateEvent: (id: string, updates: Partial<Event>) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  clearAllEvents: () => Promise<void>;
  loadEventsFromDatabase: () => Promise<void>;
  setFilters: (filters: Partial<EventFilters>) => void;
  setSelectedEvent: (event: Event | null) => void;
  setEventDialogOpen: (isOpen: boolean) => void;
  
  addVenue: (venue: Omit<Venue, 'id'>) => void;
  updateVenue: (id: string, updates: Partial<Venue>) => void;
  deleteVenue: (id: string) => void;
  
  updateSettings: (settings: Partial<AppSettings>) => void;
  uploadLogo: (file: File) => Promise<void>;
  resetToDefaults: () => void;
  
  getFilteredEvents: () => Event[];
  getEventStats: () => EventStats;
  getEventsForDate: (date: string) => Event[];
  getVenueById: (id: string) => Venue | undefined;
  getEventColor: (event: Event) => string;
}

const defaultVenues: Venue[] = [
  { id: 'restaurant', name: 'Restaurant', type: 'restaurant', color: '#10b981', icon: '🍽️' },
  { id: 'bar', name: 'Bar', type: 'bar', color: '#f59e0b', icon: '🍺' },
  { id: 'banquet', name: 'Banquet Hall', type: 'banquet', color: '#6366f1', icon: '🎉' },
];

const defaultSettings: AppSettings = {
  storeName: 'My Restaurant',
  storeEmail: 'Mikeakanan@gmail.com',
  storePhone: '313.938.6666',
  storeAddress: '0000 Street Name, Farmington Hills Mi 48336',
  applicationTitle: 'Event Manager',
  applicationSubtitle: 'Professional Hospitality Event Management',
  logo: '/assets/default-logo.png',
  themeColor: '#f59e0b',
  backgroundColor: '#0f172a',
  textColor: '#ffffff',
  highlightTextColor: '#f59e0b',
  dbHost: '',
  dbUser: '',
  dbPassword: '',
  dbName: '',
};

const defaultColorPresets: ColorPreset[] = [
  { id: '1', name: 'Red', color: '#ef4444' },
  { id: '2', name: 'Orange', color: '#f97316' },
  { id: '3', name: 'Amber', color: '#f59e0b' },
  { id: '4', name: 'Yellow', color: '#eab308' },
  { id: '5', name: 'Lime', color: '#84cc16' },
  { id: '6', name: 'Green', color: '#22c55e' },
  { id: '7', name: 'Emerald', color: '#10b981' },
  { id: '8', name: 'Teal', color: '#14b8a6' },
  { id: '9', name: 'Cyan', color: '#06b6d4' },
  { id: '10', name: 'Sky', color: '#0ea5e9' },
  { id: '11', name: 'Blue', color: '#3b82f6' },
  { id: '12', name: 'Indigo', color: '#6366f1' },
  { id: '13', name: 'Violet', color: '#8b5cf6' },
  { id: '14', name: 'Purple', color: '#a855f7' },
  { id: '15', name: 'Fuchsia', color: '#d946ef' },
  { id: '16', name: 'Pink', color: '#ec4899' },
  { id: '17', name: 'Rose', color: '#f43f5e' },
  { id: '18', name: 'White', color: '#ffffff' },
  { id: '19', name: 'Black', color: '#000000' },
  { id: '20', name: 'Dark Navy', color: '#1e3a8a' },
];

export const useEventStore = create<EventStore>((set, get) => ({
  events: [],
  filters: {},
  selectedEvent: null,
  isEventDialogOpen: false,
  venues: defaultVenues,
  settings: defaultSettings,
  colorPresets: defaultColorPresets,

  addMultipleEvents: async (eventsData) => {
    const apiUrl = API_ENDPOINTS.eventsBulk;

    if (isScreenshotEnvironment()) {
      const timestamp = Date.now();
      const newEvents: Event[] = eventsData.map((eventData, index) => ({
        ...eventData,
        id: `event-${timestamp}-${index}-${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
      console.log('🖼️ Screenshot environment detected - using in-memory events only.');
      set((state) => ({ events: [...state.events, ...newEvents] }));
      return;
    }

    const response = await apiCall(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: eventsData }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Could not read error response');
      throw new Error(`Failed to import events: ${errorText}`);
    }

    const payload = await response.json();
    set({ events: payload.events ?? [] });
  },

  addEvent: async (eventData) => {
    const apiUrl = API_ENDPOINTS.events;

    if (isScreenshotEnvironment()) {
      const newEvent: Event = {
        ...eventData,
        id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      console.log('🖼️ Screenshot environment detected - skipping network request.');
      set((state) => ({ events: [...state.events, newEvent] }));
      return;
    }

    const response = await apiCall(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eventData),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Could not read error response');
      throw new Error(`Failed to create event: ${errorText}`);
    }

    const created = await response.json();

    if (created.event) {
      set((state) => ({ events: [...state.events, created.event] }));
    }
  },

  updateEvent: async (id, updates) => {
    const apiUrl = API_ENDPOINTS.eventsById(id);

    if (isScreenshotEnvironment()) {
      console.log('🖼️ Screenshot environment detected - skipping network request.');
      set((state) => ({
        events: state.events.map((event) =>
          event.id === id ? { ...event, ...updates, updatedAt: new Date().toISOString() } : event
        ),
      }));
      return;
    }

    const response = await apiCall(apiUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Could not read error response');
      throw new Error(`Failed to update event: ${errorText}`);
    }

    const payload = await response.json();

    if (payload.event) {
      set((state) => ({
        events: state.events.map((event) => (event.id === id ? payload.event : event)),
      }));
    }
  },

  deleteEvent: async (id) => {
    const apiUrl = API_ENDPOINTS.eventsById(id);

    if (isScreenshotEnvironment()) {
      console.log('🖼️ Screenshot environment detected - skipping network request.');
      set((state) => ({ events: state.events.filter((event) => event.id !== id) }));
      return;
    }

    const response = await apiCall(apiUrl, { method: 'DELETE' });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Could not read error response');
      throw new Error(`Failed to delete event: ${errorText}`);
    }

    set((state) => ({ events: state.events.filter((event) => event.id !== id) }));
  },

  clearAllEvents: async () => {
    const apiUrl = API_ENDPOINTS.events;

    if (isScreenshotEnvironment()) {
      console.log('🖼️ Screenshot environment detected - skipping network request.');
      set({ events: [] });
      return;
    }

    const response = await apiCall(apiUrl, { method: 'DELETE' });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Could not read error response');
      throw new Error(`Failed to clear events: ${errorText}`);
    }

    set({ events: [] });
  },

  loadEventsFromDatabase: async () => {
    const apiUrl = API_ENDPOINTS.events;

    if (isScreenshotEnvironment()) {
      console.log('🖼️ Screenshot environment detected - skipping network request.');
      return;
    }

    console.log('📥 Loading events from database...');
    console.log('🔗 API URL:', apiUrl);
    console.log('🔑 Using API base:', API_CONFIG.base || 'same-origin');
  
    const response = await apiCall(apiUrl);

    console.log('📡 Response status:', response.status);
    console.log('📡 Response ok:', response.ok);
    console.log('📡 Response URL:', response.url);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Could not read error response');
      console.error('❌ Failed to load events:', errorText);
      console.error('❌ Response status:', response.status, response.statusText);
      throw new Error(`Failed to load events: ${errorText}`);
    }

    const data = await response.json();
    console.log(`✅ Loaded ${data.events?.length || 0} events from database:`, data.events);
  
    // Log before and after state update
    const prevEvents = get().events;
    console.log('🔄 Previous events count:', prevEvents.length);
    set({ events: data.events || [] });
    console.log('🔄 New events count after set:', get().events.length);
    console.log('🔄 Store state updated with events:', get().events);
  },

  setFilters: (filters) => {
    set((state) => ({ filters: { ...state.filters, ...filters } }));
  },

  setSelectedEvent: (event) => {
    set({ selectedEvent: event });
  },

  setEventDialogOpen: (isOpen) => {
    set({ isEventDialogOpen: isOpen });
  },

  addVenue: (venueData) => {
    const newVenue: Venue = {
      ...venueData,
      id: `venue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
    set((state) => ({ venues: [...state.venues, newVenue] }));
  },

  updateVenue: (id, updates) => {
    set((state) => ({
      venues: state.venues.map((venue) => (venue.id === id ? { ...venue, ...updates } : venue)),
    }));
  },

  deleteVenue: (id) => {
    set((state) => ({ venues: state.venues.filter((venue) => venue.id !== id) }));
  },

  updateSettings: (updates) => {
    set((state) => ({ settings: { ...state.settings, ...updates } }));
  },

  resetToDefaults: () => {
    set({ settings: { ...defaultSettings } });
  },

  uploadLogo: async (file) => {
    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        set((state) => ({ settings: { ...state.settings, logo: base64 } }));
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading logo:', error);
    }
  },

  getFilteredEvents: () => {
    const { events, filters } = get();
    return events.filter((event) => {
      if (filters.venue && event.venue !== filters.venue && event.venueId !== filters.venue) {
        return false;
      }
      if (filters.status && event.status !== filters.status) {
        return false;
      }
      if (filters.paymentStatus && event.paymentStatus !== filters.paymentStatus) {
        return false;
      }
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        const normalizePhone = (phone: string) => phone.replace(/[\s\-\(\)\.]/g, '');
        const normalizedQuery = normalizePhone(query);
        const normalizedEventPhone = normalizePhone(event.contact.phone);
        return (
          event.title.toLowerCase().includes(query) ||
          event.contact.name.toLowerCase().includes(query) ||
          event.contact.phone.includes(query) ||
          normalizedEventPhone.includes(normalizedQuery) ||
          event.contact.email.toLowerCase().includes(query)
        );
      }
      return true;
    });
  },

  getEventStats: () => {
    const events = get().getFilteredEvents();
    return events.reduce((stats, event) => {
      stats[event.status]++;
      stats[event.paymentStatus]++;
      const total = event.pricing?.total || 0;
      const paid = event.pricing?.amountPaid || 0;
      const balance = event.pricing?.remainingBalance || 0;
      if (event.paymentStatus === 'paid') {
        stats.totalRevenue += total;
      } else {
        stats.totalRevenue += paid;
        stats.totalOutstanding += balance;
      }
      return stats;
    }, {
      confirmed: 0,
      pending: 0,
      cancelled: 0,
      closed: 0,
      paid: 0,
      unpaid: 0,
      totalRevenue: 0,
      totalOutstanding: 0,
    } as EventStats);
  },

  getEventsForDate: (date) => {
    const filteredEvents = get().getFilteredEvents();
    return filteredEvents.filter((event) => event.date === date);
  },

  getVenueById: (id) => {
    const venues = get().venues;
    return venues.find((venue) => venue.id === id);
  },

  getEventColor: (event) => {
    if (event.color) {
      return event.color;
    }
    const venue = get().getVenueById(event.venueId || event.venue);
    return venue?.color || '#6b7280';
  },
}));

if (typeof window !== 'undefined') {
  useEventStore.getState().loadEventsFromDatabase().catch((error) => {
    console.warn('⚠️ Failed to load events:', error);
  });
}
