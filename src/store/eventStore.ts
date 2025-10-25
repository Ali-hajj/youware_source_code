import { create } from 'zustand';
import { Event, EventFilters, EventStats, Venue, AppSettings, ColorPreset } from '../types';
import { API_ENDPOINTS, API_CONFIG, apiCall, isScreenshotEnvironment } from '../config/api';
import { useAuthStore } from './authStore';
// ctrl z
interface EventStore {
  events: Event[];
  filters: EventFilters;
  selectedEvent: Event | null;
  isEventDialogOpen: boolean;
  venues: Venue[];
  settings: AppSettings;
  colorPresets: ColorPreset[];
  loadSettingsFromDatabase: () => Promise<void>;
  loadVenuesFromDatabase: () => Promise<void>;
  saveSettingsToDatabase: (updatedSettings: Partial<AppSettings>) => Promise<void>;
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

  const defaultSettings: AppSettings = {
    id: null,
    storeName: '',
    storeEmail: '',
    storePhone: '',
    storeAddress: '',
    applicationTitle: '',
    applicationSubtitle: '',
    logo: '',
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
  // venues: defaultVenues,
  venues: [],
  settings: defaultSettings,
  colorPresets: defaultColorPresets,


  loadVenuesFromDatabase: async () => {
  const apiUrl = API_ENDPOINTS.venues;

  try {
    const response = await apiCall(apiUrl);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Could not read error response');
      throw new Error(`Failed to load venues: ${errorText}`);
    }

    const data = await response.json();

    // Assuming the API response is { venues: [...] } or just [...] 
    // Adjust accordingly:
    // If your API returns { venues: [...] }:
    // const venuesList = data.venues;

    // If your API returns an array directly:
    const venuesList = data; 

    set({ venues: venuesList });

    console.log('✅ Venues loaded:', venuesList);
  } catch (error) {
    console.error('❌ Error loading venues:', error);
  }
},

addVenue: async (venue) => {
  if (isScreenshotEnvironment()) {
    const newVenue = {
      ...venue,
      id: `venue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    console.log('🖼️ Screenshot environment detected - skipping network request.', newVenue);
    set((state) => ({ venues: [...state.venues, newVenue] }));
    return;
  }

  // Transform payload if your backend requires it (optional)
  const payload = {
    ...venue,
    // e.g. rename keys if needed
    // color_code: venue.color,
    // icon_symbol: venue.icon,
  };

  const response = await apiCall(API_ENDPOINTS.venues, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Could not read error response');
    throw new Error(`Failed to add venue: ${errorText}`);
  }

  const created = await response.json();

  if (created.id) {
    set((state) => ({ venues: [...state.venues, { ...venue, id: String(created.id) }] }));
  }
},

updateVenue: async (id, updates) => {
  const apiUrl = API_ENDPOINTS.venueById(id);

  const response = await apiCall(apiUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Could not read error response');
    throw new Error(`Failed to update venue: ${errorText}`);
  }

  const payload = await response.json();

  if (payload.venue) {
    set((state) => ({
      venues: state.venues.map((venue) => (venue.id === id ? payload.venue : venue)),
    }));
  }
},

deleteVenue: async (id) => {
  if (isScreenshotEnvironment()) {
    console.log('🖼️ Screenshot environment detected - skipping network request for delete.', id);
    set((state) => ({ venues: state.venues.filter((venue) => venue.id !== id) }));
    return;
  }

  const response = await apiCall(API_ENDPOINTS.venueById(id), {
    method: 'DELETE',
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Could not read error response');
    throw new Error(`Failed to delete venue: ${errorText}`);
  }

  set((state) => ({ venues: state.venues.filter((venue) => venue.id !== id) }));
},


loadSettingsFromDatabase: async () => {
  const apiUrl = API_ENDPOINTS.settings;

  if (isScreenshotEnvironment()) {
    console.log('🖼️ Screenshot environment detected - skipping loadSettingsFromDatabase');
    return;
  }

  try {
    const response = await apiCall(apiUrl);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Could not read error response');
      throw new Error(`Failed to load settings: ${errorText}`);
    }

    const data = await response.json();

    // Map snake_case API response to camelCase frontend interface
    const mappedSettings = {
      id: data.settings.id,
      storeName: data.settings.store_name,
      storeEmail: data.settings.store_email,
      storePhone: data.settings.store_phone,
      storeAddress: data.settings.store_address,
      applicationTitle: data.settings.application_title,
      applicationSubtitle: data.settings.application_subtitle,
      logo: data.settings.logo,
      themeColor: data.settings.theme_color,
      backgroundColor: data.settings.background_color,
      textColor: data.settings.text_color,
      highlightTextColor: data.settings.highlight_text_color,
      selectedVenue: data.settings.selected_venue, // Optional, if your backend has this
    };

    set({ settings: { ...get().settings, ...mappedSettings } });

    console.log('✅ Settings loaded:', mappedSettings);
  } catch (error) {
    console.error('❌ Error loading settings:', error);
  }
},


saveSettingsToDatabase: async (updatedSettings: Partial<AppSettings>) => {
  const apiUrl = API_ENDPOINTS.updateSettings;

  if (isScreenshotEnvironment()) {
    console.log('🖼️ Screenshot environment detected - skipping saveSettingsToDatabase');
    set((state) => ({ settings: { ...state.settings, ...updatedSettings } }));
    return;
  }

  try {
    const response = await apiCall(apiUrl, {
      method: 'PUT', // or POST depending on your API design
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedSettings),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Could not read error response');
      throw new Error(`Failed to save settings: ${errorText}`);
    }

    const data = await response.json();

    set({ settings: { ...get().settings, ...data.settings } });
    console.log('✅ Settings saved:', data.settings);
  } catch (error) {
    console.error('❌ Error saving settings:', error);
  }
},

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
      console.log('newEvent',newEvent);
      console.log('🖼️ Screenshot environment detected - skipping network request.');
      set((state) => ({ events: [...state.events, newEvent] }));
      return;
    }

    // Transform payload for PHP backend compatibility
    const transformedPayload = {
      ...eventData,
      // Convert camelCase time fields to snake_case
      start_time: eventData.startTime,
      end_time: eventData.endTime,
      // Flatten contact object to root level fields
      contact_name: eventData.contact?.name || '',
      contact_phone: eventData.contact?.phone || '',
      contact_email: eventData.contact?.email || '',
      // Remove the original nested fields to avoid confusion
      startTime: undefined,
      endTime: undefined,
      contact: undefined,
    };
    
    const response = await apiCall(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(transformedPayload),
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

    // Check if user is offline - if so, skip API call
    const authState = useAuthStore.getState();
    if (authState.user && authState.user.id.startsWith('offline-')) {
      console.log('👤 Offline user detected in loadEventsFromDatabase - skipping API call');
      // For offline users, we can optionally load some sample events
      // For now, just return without making API call
      return;
    }

    console.log('📥 Loading events from database...');
    console.log('🔗 API URL:', apiUrl);
    // console.log('🔑 Using API base:', API_CONFIG.base || 'same-origin');
  
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
  
    // Transform PHP backend field names to match frontend expectations
    const transformedEvents = (data.events || []).map((event: any) => {
  const pricing = event.pricing_data ? JSON.parse(event.pricing_data) : {};

  // Transform menu items
  const menuItems = (pricing.menuItems || []).map((item: any) => ({
    id: item.id || '',
    name: item.name || '', // Make sure name exists here
    price: item.price || 0,
    quantity: item.quantity || 0,
    total: item.total || (item.price && item.quantity ? item.price * item.quantity : 0),
  }));

  return {
    ...event,
    startTime: event.start_time || event.startTime || '',
    endTime: event.end_time || event.endTime || '',

    contact: {
      name: event.contact_name || event.contact?.name || '',
      phone: event.contact_phone || event.contact?.phone || '',
      email: event.contact_email || event.contact?.email || '',
    },

    pricing: pricing,
    menuItems: menuItems,  // <-- Correctly mapped
    customPlatters: pricing.customPlatters || [],
    personCount: pricing.personCount || 0,
    pricePerPerson: pricing.pricePerPerson || 0,
    subtotal: pricing.subtotal || 0,
    discount: pricing.discount || { type: 'percentage', value: 0, amount: 0 },
    taxRate: pricing.taxRate || 0,
    taxAmount: pricing.taxAmount || 0,
    includeTax: pricing.includeTax ?? true,
    total: pricing.total || 0,
    deposits: pricing.deposits || [],
    amountPaid: pricing.amountPaid || 0,
    remainingBalance: pricing.remainingBalance || 0,

    start_time: undefined,
    end_time: undefined,
    contact_name: undefined,
    contact_phone: undefined,
    contact_email: undefined,
    pricing_data: undefined,
  };
});

  
    // Log before and after state update
    const prevEvents = get().events;
    console.log('🔄 Previous events count:', prevEvents.length);
    set({ events: transformedEvents });
    console.log('🔄 New events count after set:', get().events.length);
    console.log('🔄 Store state updated with transformed events:', get().events);
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
      if (filters.venue && event.venue !== filters.venue && event['venue_id'] !== filters.venue) {
        return false;
      }
      if (filters.status && event.status !== filters.status) {
        return false;
      }
      if (filters['payment_status'] && event['payment_status'] !== filters['payment_status']) {
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
      stats[event['payment_status']]++;
      const total = event.pricing?.total || 0;
      const paid = event.pricing?.amountPaid || 0;
      const balance = event.pricing?.remainingBalance || 0;
      if (event['payment_status'] === 'paid') {
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
    const venue = get().getVenueById(event['venue_id'] || event.venue);
    return venue?.color || '#6b7280';
  },
}));

if (typeof window !== 'undefined') {
  useEventStore.getState().loadEventsFromDatabase().catch((error) => {
    console.warn('⚠️ Failed to load events:', error);
  });
}
