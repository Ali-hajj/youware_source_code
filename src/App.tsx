import { useEffect, useState } from 'react';
import { Calendar, Archive, Settings, Share2, ChevronDown, ChevronRight } from 'lucide-react';
import { Calendar as CalendarComponent } from './components/Calendar';
import { DailyView } from './components/DailyView';
import { Sidebar } from './components/Sidebar';
import { SearchAndFilter } from './components/SearchAndFilter';
import { EventDialog } from './components/EventDialog';
import { HistoryTab } from './components/HistoryTab';
import { SettingsDialog } from './components/SettingsDialog';
import { CalendarShare } from './components/CalendarShare';
import { ExcelImportExport } from './components/ExcelImportExport';
import { CSVImportDialog } from './components/CSVImportDialog';
import { LoginScreen } from './components/LoginScreen';
import { useEventStore } from './store/eventStore';
import { useAuthStore } from './store/authStore';
import { EventStatus, PaymentStatus } from './types';

type TabType = 'calendar' | 'history' | 'daily';

function App() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateForNewEvent, setSelectedDateForNewEvent] = useState<string | undefined>();
  const [activeTab, setActiveTab] = useState<TabType>('calendar');
  const [selectedDailyDate, setSelectedDailyDate] = useState<string>('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCalendarShareOpen, setIsCalendarShareOpen] = useState(false);
  const [historyStatusFilter, setHistoryStatusFilter] = useState<EventStatus | undefined>();
  const [historyPaymentFilter, setHistoryPaymentFilter] = useState<PaymentStatus | undefined>();
  const [isCSVImportOpen, setIsCSVImportOpen] = useState(false);
  const [isDataManagementOpen, setIsDataManagementOpen] = useState(false);
  
  const { user, token, refreshProfile, logout } = useAuthStore();
  const safeUser = user ?? {
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
  const isGuest = safeUser.id === 'GUEST';

  const { 
    selectedEvent, 
    isEventDialogOpen, 
    setSelectedEvent, 
    setEventDialogOpen,
    events,
    settings,
    getVenueById,
    loadEventsFromDatabase
  } = useEventStore();

  useEffect(() => {
    if (token && !user) {
      refreshProfile().catch(() => undefined);
    }
  }, [token, user, refreshProfile]);

  // Load events from database after user is authenticated
  useEffect(() => {
    if (user && user.id !== 'GUEST') {
      console.log('👤 User authenticated, loading events...');
      loadEventsFromDatabase().catch((error) => {
        console.error('Failed to load events from database:', error);
      });
    }
  }, [user, loadEventsFromDatabase]);

  const handleNewEvent = (date?: string) => {
    setSelectedDateForNewEvent(date);
    setSelectedEvent(null);
    setEventDialogOpen(true);
  };

  const handleDateClick = (date: string) => {
    // Switch to daily view when clicking on a date
    setSelectedDailyDate(date);
    setActiveTab('daily');
  };

  const handleBackToMonthView = () => {
    setActiveTab('calendar');
    setSelectedDailyDate('');
  };

  const handleDailyDateChange = (date: string) => {
    setSelectedDailyDate(date);
  };

  const handleEventClick = (eventId: string) => {
    const event = events.find(e => e.id === eventId);
    if (event) {
      setSelectedEvent(event);
      setSelectedDateForNewEvent(undefined);
      setEventDialogOpen(true);
    }
  };

  const handleEditEvent = (event: any) => {
    setSelectedEvent(event);
    setSelectedDateForNewEvent(undefined);
    setEventDialogOpen(true);
  };

  const handleNavigateToHistory = (statusFilter?: EventStatus, paymentFilter?: PaymentStatus) => {
    // Clear filters when no specific filter is provided (All Status clicked)
    setHistoryStatusFilter(statusFilter || undefined);
    setHistoryPaymentFilter(paymentFilter || undefined);
    setActiveTab('history');
  };

  const handleNavigateToDate = (date: string) => {
    const targetDate = new Date(date);
    setCurrentDate(targetDate);
    setActiveTab('calendar');
    setSelectedDailyDate('');
    // Clear any history filters when going back to calendar
    setHistoryStatusFilter(undefined);
    setHistoryPaymentFilter(undefined);
  };

  const handleCloseDialog = () => {
    setEventDialogOpen(false);
    setSelectedEvent(null);
    setSelectedDateForNewEvent(undefined);
  };

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <div 
      className="h-screen transition-colors duration-300 flex flex-col"
      style={{ backgroundColor: settings.backgroundColor }}
    >
      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <Sidebar
          onNewEvent={() => handleNewEvent()}
          currentDate={currentDate}
          onDateChange={setCurrentDate}
          onNavigateToHistory={handleNavigateToHistory}
          currentUser={safeUser}
          onLogout={logout}
        />

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 shadow-lg border-b border-slate-600">
            <div className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {settings.logo && (
                    <img
                      src={settings.logo}
                      alt="Logo"
                      className="w-12 h-12 object-contain rounded-lg bg-white/10 p-1"
                    />
                  )}
                  <div>
                    <h1 
                      className="text-2xl font-bold"
                      style={{ color: settings.textColor }}
                    >
                      {settings.selectedVenue ? (
                        `${getVenueById(settings.selectedVenue)?.name || 'Venue'} - ${settings.storeName}`
                      ) : (
                        settings.storeName ? `${settings.storeName} ${settings.applicationTitle}` : settings.applicationTitle
                      )}
                    </h1>
                    <div 
                      className="text-sm mt-1 opacity-80"
                      style={{ color: settings.textColor }}
                    >
                      {settings.applicationSubtitle}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {/* Tab Navigation */}
                  <div className="flex bg-slate-700/50 rounded-lg p-1">
                    <button
                      onClick={() => {
                        setActiveTab('calendar');
                        setSelectedDailyDate('');
                      }}
                      className={`
                        px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2
                        ${(activeTab === 'calendar' || activeTab === 'daily')
                          ? 'text-slate-900 shadow-md' 
                          : 'text-slate-300 hover:text-slate-100 hover:bg-slate-600'
                        }
                      `}
                      style={{
                        backgroundColor: (activeTab === 'calendar' || activeTab === 'daily') ? settings.themeColor : undefined
                      }}
                    >
                      <Calendar className="h-4 w-4" />
                      Calendar
                    </button>
                    <button
                      onClick={() => setActiveTab('history')}
                      className={`
                        px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2
                        ${activeTab === 'history' 
                          ? 'text-slate-900 shadow-md' 
                          : 'text-slate-300 hover:text-slate-100 hover:bg-slate-600'
                        }
                      `}
                      style={{
                        backgroundColor: activeTab === 'history' ? settings.themeColor : undefined
                      }}
                    >
                      <Archive className="h-4 w-4" />
                      History
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setIsCalendarShareOpen(true)}
                      className="p-2 text-slate-300 hover:text-slate-100 hover:bg-slate-600 rounded-lg transition-colors"
                      title="Share Calendar"
                    >
                      <Share2 className="h-5 w-5" />
                    </button>
                    
                    <button
                      onClick={() => setIsSettingsOpen(true)}
                      className="p-2 text-slate-300 hover:text-slate-100 hover:bg-slate-600 rounded-lg transition-colors"
                      title="Settings"
                    >
                      <Settings className="h-5 w-5" />
                    </button>
                    
                    <div className="text-right">
                      <div className="text-slate-300 text-sm">
                        {currentDate.toLocaleDateString('en-US', { 
                          weekday: 'long',
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-hidden p-6">
            <div className="h-full flex flex-col space-y-6">
              {/* Search and Filter - only show for calendar tab */}
              {activeTab === 'calendar' && <SearchAndFilter />}
              
              {/* Excel Import/Export - show for history tab */}
              {activeTab === 'history' && (
                <div className="bg-white rounded-lg shadow-lg">
                  <button
                    onClick={() => setIsDataManagementOpen(prev => !prev)}
                    className="w-full flex items-center justify-between px-6 py-4 text-left border-b border-slate-200 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {isDataManagementOpen ? (
                        <ChevronDown className="h-5 w-5 text-slate-500" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-slate-500" />
                      )}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Data Management</h3>
                        <p className="text-sm text-slate-500">Importa o exporta tus eventos con seguridad</p>
                      </div>
                    </div>
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        setIsCSVImportOpen(true);
                      }}
                      className="px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 transition-colors flex items-center gap-2"
                    >
                      Import CSV
                    </button>
                  </button>

                  {isDataManagementOpen && (
                    <div className="p-6 border-t border-slate-200">
                      <ExcelImportExport />
                    </div>
                  )}
                </div>
              )}

              {/* Tab Content */}
              <div className="flex-1 overflow-hidden">
                {activeTab === 'calendar' ? (
                  <CalendarComponent
                    currentDate={currentDate}
                    onDateClick={handleDateClick}
                    onEventClick={handleEventClick}
                  />
                ) : activeTab === 'daily' ? (
                  <DailyView
                    selectedDate={selectedDailyDate}
                    onDateChange={handleDailyDateChange}
                    onBackToMonth={handleBackToMonthView}
                    onNewEvent={handleNewEvent}
                    onEventClick={handleEventClick}
                  />
                ) : (
                  <HistoryTab 
                    onEditEvent={handleEditEvent}
                    onNavigateToDate={handleNavigateToDate}
                    statusFilter={historyStatusFilter}
                    paymentFilter={historyPaymentFilter}
                    currentUser={safeUser}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Event Dialog */}
      <EventDialog
        isOpen={isEventDialogOpen}
        onClose={handleCloseDialog}
        event={selectedEvent}
        defaultDate={selectedDateForNewEvent}
      />

      {/* Settings Dialog */}
      <SettingsDialog
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      {/* Calendar Share Dialog */}
      <CalendarShare
        isOpen={isCalendarShareOpen}
        onClose={() => setIsCalendarShareOpen(false)}
      />

      {/* CSV Import Dialog */}
      <CSVImportDialog
        isOpen={isCSVImportOpen}
        onClose={() => setIsCSVImportOpen(false)}
      />
    </div>
  );
}

export default App;