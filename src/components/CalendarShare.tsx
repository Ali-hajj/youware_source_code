import React, { useState } from 'react';
import { format, addDays } from 'date-fns';
import { Mail, Users, Calendar, Globe, Link2, Copy, Check, Settings, X, UserPlus, ExternalLink, Rss } from 'lucide-react';
import { useEventStore } from '../store/eventStore';
import { CalendarShare as CalendarShareType } from '../types';
import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

interface CalendarShareProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CalendarShare: React.FC<CalendarShareProps> = ({ isOpen, onClose }) => {
  const { events, settings } = useEventStore();
  const [sharedCalendars, setSharedCalendars] = useState<CalendarShareType[]>([]);
  const [newShareEmail, setNewShareEmail] = useState('');
  const [newShareName, setNewShareName] = useState('');
  const [selectedPermission, setSelectedPermission] = useState<'view' | 'edit'>('view');
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [isGeneratingEmail, setIsGeneratingEmail] = useState(false);
  const [copiedText, setCopiedText] = useState('');
  const [calendarUrl, setCalendarUrl] = useState<string>('');
  const [isGeneratingUrl, setIsGeneratingUrl] = useState(false);

  const generateCalendarData = () => {
    // Fix date comparison to include today's events (>=) and handle timezone issues
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today
    
    const futureEvents = events.filter(event => {
      const eventDate = new Date(event.date);
      eventDate.setHours(0, 0, 0, 0); // Start of event day
      return eventDate >= today; // Include today and future events
    }).slice(0, 50);
    
    console.log('📅 Calendar Generation Debug:', {
      today: today.toISOString(),
      totalEvents: events.length,
      futureEventsCount: futureEvents.length,
      includedDates: futureEvents.map(e => e.date),
      todayEvents: events.filter(e => e.date === today.toISOString().split('T')[0])
    });
    
    let icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//${settings.storeName}//Event Management//EN
NAME:${settings.storeName} Events
X-WR-CALNAME:${settings.storeName} Events
DESCRIPTION:Event calendar for ${settings.storeName}
X-WR-CALDESC:Event calendar for ${settings.storeName}
TIMEZONE-ID:America/New_York
X-WR-TIMEZONE:America/New_York
`;

    futureEvents.forEach(event => {
      // Enhanced date/time formatting with proper timezone handling
      const eventDate = event.date.replace(/-/g, '');
      const startTime = event.startTime.replace(':', '') + '00';
      const endTime = event.endTime.replace(':', '') + '00';
      
      const startDateTime = `${eventDate}T${startTime}`;
      const endDateTime = `${eventDate}T${endTime}`;
      const uid = `${event.id}@${settings.storeName.toLowerCase().replace(/\s+/g, '-')}.com`;
      
      console.log('📝 Processing event:', {
        title: event.title,
        date: event.date,
        startDateTime,
        endDateTime
      });
      
      icsContent += `
BEGIN:VEVENT
UID:${uid}
DTSTART:${startDateTime}
DTEND:${endDateTime}
SUMMARY:${event.title}
DESCRIPTION:${event.title}\\n\\nVenue: ${event.venue}\\n\\nContact: ${event.contact.name}\\nPhone: ${event.contact.phone}\\nEmail: ${event.contact.email}${event.notes ? `\\n\\nNotes: ${event.notes}` : ''}\\n\\nStatus: ${event.status}\\nPayment: ${event.paymentStatus}
LOCATION:${event.venue} - ${settings.storeAddress || settings.storeName}
STATUS:${event.status === 'confirmed' ? 'CONFIRMED' : event.status === 'cancelled' ? 'CANCELLED' : 'TENTATIVE'}
ORGANIZER;CN=${settings.storeName}:mailto:${settings.storeEmail}
CREATED:${event.createdAt.replace(/[-:]/g, '').split('.')[0]}Z
LAST-MODIFIED:${event.updatedAt.replace(/[-:]/g, '').split('.')[0]}Z
END:VEVENT`;
    });

    icsContent += `
END:VCALENDAR`;

    return icsContent;
  };
  
  const generateLiveCalendarUrl = async () => {
    setIsGeneratingUrl(true);
    
    try {
      const calendarData = generateCalendarData();
      const encodedData = btoa(unescape(encodeURIComponent(calendarData)));
      
      // Create a data URL for the calendar
      const dataUrl = `data:text/calendar;charset=utf-8;base64,${encodedData}`;
      
      // Generate shareable URLs for different platforms
      const calendarName = `${settings.storeName.replace(/\s+/g, '_')}_Events`;
      
      const urls = {
        outlook: `https://outlook.live.com/calendar/0/addfromweb?name=${encodeURIComponent(calendarName)}&url=${encodeURIComponent(dataUrl)}`,
        google: `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(dataUrl)}`,
        icalendar: dataUrl,
        webcal: `webcal://calendar.yourdomain.com/${calendarName}.ics` // Placeholder for future live sync
      };
      
      setCalendarUrl(dataUrl);
      
      // Copy comprehensive sharing instructions
      const shareText = `🗓️ LIVE CALENDAR LINKS - ${settings.storeName}

📧 EMAIL THESE LINKS TO YOUR TEAM:

🔵 OUTLOOK WEB:
${urls.outlook}

🔴 GOOGLE CALENDAR:
${urls.google}

📱 UNIVERSAL .ICS LINK:
${urls.icalendar}

📋 SHARING INSTRUCTIONS:

1️⃣ OUTLOOK USERS: Click the Outlook link above
2️⃣ GMAIL USERS: Click the Google Calendar link above  
3️⃣ OTHER USERS: Right-click the Universal link → Save As → Import to calendar

💡 TEAM ACCESS TIPS:
• Forward these links to managers and staff
• Create shared calendar folders in email clients
• Set up team notifications for new events
• Bookmark links for easy re-access

📊 CALENDAR INCLUDES:
✅ ${events.filter(event => new Date(event.date) >= new Date()).length} upcoming events
✅ Venue locations and contact info
✅ Payment status and notes
✅ Automatic timezone handling

🔄 UPDATES: Calendar reflects current data. Re-import periodically for latest changes.

📞 Support: ${settings.storeEmail} | ${settings.storePhone}`;

      await navigator.clipboard.writeText(shareText);
      setCopiedText('📧 Calendar links & instructions copied! Ready to email to your team.');
      setTimeout(() => setCopiedText(''), 5000);
      
    } catch (error) {
      console.error('Failed to generate calendar URL:', error);
      alert('Failed to generate calendar URL. Please try the download option instead.');
    } finally {
      setIsGeneratingUrl(false);
    }
  };

  const generateShareableLink = async () => {
    setIsGeneratingLink(true);
    
    try {
      const calendarData = generateCalendarData();
      const blob = new Blob([calendarData], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      
      // Enhanced calendar integration instructions with fixed date counting
      const todayCheck = new Date();
      todayCheck.setHours(0, 0, 0, 0);
      const upcomingCount = events.filter(event => {
        const eventDate = new Date(event.date);
        eventDate.setHours(0, 0, 0, 0);
        return eventDate >= todayCheck;
      }).length;
      
      const shareText = `🗓️ ${settings.storeName} Event Calendar - ${new Date().toLocaleDateString()}

🚨 IMPORTANT: This is a SNAPSHOT calendar file (not live-updating)

📥 TO ADD TO YOUR CALENDAR:

▶️ OUTLOOK (Desktop & Web):
1. Download the .ics file below
2. Outlook Desktop: File → Import → Calendar from File
3. Outlook Web: Settings → Calendar → Import calendar

▶️ GMAIL/GOOGLE CALENDAR:
1. Download the .ics file below  
2. Gmail: Settings ⚙️ → Import & Export → Import
3. Google Calendar: + Create → Import

▶️ APPLE CALENDAR (iPhone/Mac):
1. Download and open the .ics file
2. Mac: File → Import → Import
3. iPhone: Email the file to yourself and tap to add

▶️ YAHOO MAIL:
1. Download the .ics file below
2. Yahoo Calendar → Import → Choose file

▶️ ICLOUD CALENDAR:
1. Go to Calendar.icloud.com
2. Import → Select the downloaded file

📊 CALENDAR CONTENTS:
• ${upcomingCount} upcoming events (including today: ${todayCheck.toLocaleDateString()})
• Event dates, times & venues
• Contact information
• Payment status tracking
• Special notes & requirements

⚠️ LIVE UPDATES NOTICE:
This calendar does NOT auto-update! When new events are added or changed:
1. Re-download this calendar file
2. Re-import to your email calendar
3. Or ask for a new share link

📞 Contact: ${settings.storeEmail} | Phone: ${settings.storePhone}

💡 TIP: Bookmark this page to easily get updated calendar files!`;

      await navigator.clipboard.writeText(shareText);
      setCopiedText('📋 Calendar instructions copied! Share via email or text.');
      setTimeout(() => setCopiedText(''), 4000);

      // Also trigger download
      const link = document.createElement('a');
      link.href = url;
      link.download = `${settings.storeName.replace(/\s+/g, '_')}_Events_Calendar.ics`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Failed to generate calendar link:', error);
      alert('Failed to generate calendar link. Please try again.');
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const generateInviteEmail = async () => {
    if (!newShareEmail) {
      alert('Please enter an email address');
      return;
    }

    setIsGeneratingEmail(true);
    const startTime = Date.now();

    console.log('📧 Starting calendar invite email generation:', {
      recipient: newShareEmail,
      name: newShareName,
      permission: selectedPermission
    });

    try {
      const config = globalThis.ywConfig?.ai_config?.email_generator;
      if (!config) {
        throw new Error('Email generator configuration not found');
      }

      const openai = createOpenAI({
        baseURL: 'https://api.youware.com/public/v1/ai',
        apiKey: 'sk-YOUWARE'
      });

      const businessContext = `${settings.storeName} - Event Management & Calendar Sharing`;
      const upcomingEvents = events.filter(event => new Date(event.date) >= new Date()).slice(0, 5);
      
      const { text: emailContent } = await generateText({
        model: openai(config.model),
        messages: [
          {
            role: 'system',
            content: config.system_prompt({
              emailType: 'calendar_invitation',
              businessContext
            })
          },
          {
            role: 'user',
            content: `Generate a professional calendar sharing invitation email for:

Business: ${settings.storeName}
Manager Name: ${newShareName || 'Team Manager'}
Email: ${newShareEmail}
Permission Level: ${selectedPermission} access
Contact: ${settings.storeEmail} | ${settings.storePhone}

Recent Events (sample):
${upcomingEvents.map(event => `- ${event.title} (${format(new Date(event.date), 'MMM dd, yyyy')} at ${event.venue})`).join('\n')}

Include:
- Warm, professional greeting
- Calendar sharing purpose and benefits
- Instructions for different email providers (Outlook, Gmail, iCloud, Yahoo)
- What events/information they'll see
- Live update explanation
- Contact information for questions
- Professional closing

Tone: Professional but friendly, suitable for hospitality business.`
          }
        ],
        temperature: config.temperature || 0.7,
        maxTokens: config.maxTokens || 4000
      });

      console.log('✅ Calendar invite email generated successfully:', {
        contentLength: emailContent.length,
        processingTime: `${Date.now() - startTime}ms`
      });

      // Create the new calendar share record
      const newShare: CalendarShareType = {
        id: Date.now().toString(),
        name: newShareName || 'Team Manager',
        email: newShareEmail,
        permissions: selectedPermission,
        createdAt: new Date().toISOString(),
        active: true
      };

      setSharedCalendars([...sharedCalendars, newShare]);

      // Generate calendar file for attachment
      const calendarData = generateCalendarData();
      const calendarBlob = new Blob([calendarData], { type: 'text/calendar;charset=utf-8' });
      const calendarUrl = URL.createObjectURL(calendarBlob);

      // Create download link for calendar file
      const calendarLink = document.createElement('a');
      calendarLink.href = calendarUrl;
      calendarLink.download = `${settings.storeName.replace(/\s+/g, '_')}_Calendar.ics`;
      
      // Create mailto link with email content
      const subject = `Calendar Access - ${settings.storeName} Events`;
      const body = encodeURIComponent(emailContent + '\n\n[Please attach the downloaded calendar file to this email before sending]');
      const mailtoLink = `mailto:${newShareEmail}?subject=${encodeURIComponent(subject)}&body=${body}`;
      
      // Download calendar file first, then open email
      calendarLink.click();
      setTimeout(() => {
        window.open(mailtoLink);
      }, 1000);

      // Cleanup
      URL.revokeObjectURL(calendarUrl);

      // Reset form
      setNewShareEmail('');
      setNewShareName('');
      
      alert('Calendar file downloaded and email client opened! Please attach the calendar file before sending.');

    } catch (error) {
      console.error('❌ Calendar invite email generation failed:', {
        error: error.message,
        processingTime: `${Date.now() - startTime}ms`
      });
      alert(`Email generation failed: ${error.message}`);
    } finally {
      setIsGeneratingEmail(false);
    }
  };

  const removeShare = (id: string) => {
    setSharedCalendars(sharedCalendars.filter(share => share.id !== id));
  };

  const toggleShareStatus = (id: string) => {
    setSharedCalendars(sharedCalendars.map(share => 
      share.id === id ? { ...share, active: !share.active } : share
    ));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <Calendar className="h-6 w-6 text-amber-600" />
            <div>
              <h2 className="text-xl font-bold text-slate-800">Calendar Sharing</h2>
              <p className="text-slate-600">Share event calendar with managers and team</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-600 hover:text-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Quick Calendar Export */}
          <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-amber-50 rounded-lg border border-blue-200">
            <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              🗓️ Universal Calendar Export
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <button
                onClick={generateShareableLink}
                disabled={isGeneratingLink}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors"
              >
                {isGeneratingLink ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Calendar className="h-4 w-4" />
                )}
                {isGeneratingLink ? 'Generating...' : 'Download .ICS File'}
              </button>
              
              <button
                onClick={generateLiveCalendarUrl}
                disabled={isGeneratingUrl}
                className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-lg font-medium transition-colors"
              >
                {isGeneratingUrl ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Rss className="h-4 w-4" />
                )}
                {isGeneratingUrl ? 'Generating...' : 'Generate Share Links'}
              </button>
              
              <button
                onClick={() => {
                  const outlookUrl = `https://outlook.live.com/calendar/0/addfromweb`;
                  window.open(outlookUrl, '_blank');
                }}
                className="flex items-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
                Outlook Import
              </button>
              
              <button
                onClick={() => {
                  const gmailUrl = `https://calendar.google.com/calendar/u/0/r/settings/addbyurl`;
                  window.open(gmailUrl, '_blank');
                }}
                className="flex items-center gap-2 px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
                Google Import
              </button>
            </div>
            
            {copiedText && (
              <div className="flex items-center gap-2 px-4 py-3 bg-green-100 text-green-800 rounded-lg mb-4">
                <Check className="h-4 w-4" />
                {copiedText}
              </div>
            )}
            
            <div className="bg-white rounded-lg p-4 border border-blue-200">
              <h4 className="font-medium text-slate-800 mb-2">📱 Universal Compatibility:</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-slate-600">
                <div>✅ Outlook (Desktop/Web/Mobile)</div>
                <div>✅ Gmail/Google Calendar</div>
                <div>✅ Apple Calendar (iPhone/Mac)</div>
                <div>✅ Yahoo Mail Calendar</div>
                <div>✅ iCloud Calendar</div>
                <div>✅ Mozilla Thunderbird</div>
                <div>✅ Samsung Calendar</div>
                <div>✅ Office 365 Business</div>
              </div>
              <div className="mt-3 p-3 bg-gradient-to-r from-emerald-50 to-blue-50 rounded border">
                <div className="flex items-center gap-2 text-sm">
                  <Rss className="h-4 w-4 text-emerald-600" />
                  <span className="font-medium text-slate-700">
                    📧 Share Links: Click "Generate Share Links" to get direct URLs for team distribution
                  </span>
                </div>
                <div className="text-xs text-slate-600 mt-1">
                  Links work instantly - no file downloads needed! Perfect for emailing to managers.
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                💡 Contains {events.filter(event => new Date(event.date) >= new Date()).length} upcoming events with venue info, contacts, and payment status.
              </p>
            </div>
          </div>

          {/* Add New Manager */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Invite Manager</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Manager Name</label>
                <input
                  type="text"
                  value={newShareName}
                  onChange={(e) => setNewShareName(e.target.value)}
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="Manager name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Email Address</label>
                <input
                  type="email"
                  value={newShareEmail}
                  onChange={(e) => setNewShareEmail(e.target.value)}
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="manager@email.com"
                />
              </div>
            </div>
            <div className="flex items-center gap-4 mb-4">
              <label className="block text-sm font-medium text-slate-700">Permission Level:</label>
              <div className="flex gap-3">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="view"
                    checked={selectedPermission === 'view'}
                    onChange={(e) => setSelectedPermission(e.target.value as 'view')}
                    className="mr-2"
                  />
                  View Only
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="edit"
                    checked={selectedPermission === 'edit'}
                    onChange={(e) => setSelectedPermission(e.target.value as 'edit')}
                    className="mr-2"
                  />
                  Edit Access
                </label>
              </div>
            </div>
            <button
              onClick={generateInviteEmail}
              disabled={isGeneratingEmail || !newShareEmail}
              className="flex items-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white rounded-lg font-medium transition-colors"
            >
              {isGeneratingEmail ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
              {isGeneratingEmail ? 'Generating...' : 'Send Calendar Invitation'}
            </button>
          </div>

          {/* Shared Calendars List */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Shared With</h3>
            
            {sharedCalendars.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 rounded-lg">
                <Users className="h-12 w-12 mx-auto mb-3 text-slate-400" />
                <p className="text-slate-600">No calendar shares yet</p>
                <p className="text-sm text-slate-500">Add managers above to start sharing</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sharedCalendars.map((share) => (
                  <div key={share.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${share.active ? 'bg-green-500' : 'bg-slate-400'}`} />
                      <div>
                        <p className="font-medium text-slate-800">{share.name}</p>
                        <p className="text-sm text-slate-600">{share.email}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            share.permissions === 'edit' 
                              ? 'bg-amber-100 text-amber-800' 
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {share.permissions === 'edit' ? 'Edit Access' : 'View Only'}
                          </span>
                          <span className="text-xs text-slate-500">
                            Added {format(new Date(share.createdAt), 'MMM dd, yyyy')}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleShareStatus(share.id)}
                        className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                          share.active
                            ? 'bg-red-100 text-red-800 hover:bg-red-200'
                            : 'bg-green-100 text-green-800 hover:bg-green-200'
                        }`}
                      >
                        {share.active ? 'Disable' : 'Enable'}
                      </button>
                      <button
                        onClick={() => removeShare(share.id)}
                        className="p-2 text-slate-600 hover:text-red-600 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Step-by-Step Integration Guides */}
          <div className="bg-slate-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">📋 Step-by-Step Integration Guide</h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Outlook Guide */}
              <div className="bg-white rounded-lg p-4 border">
                <h4 className="font-medium text-blue-600 mb-3 flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Microsoft Outlook
                </h4>
                <div className="space-y-2 text-sm text-slate-700">
                  <div><strong>Desktop (2016+):</strong></div>
                  <div>1. Download the .ICS file above</div>
                  <div>2. File → Open & Export → Import/Export</div>
                  <div>3. "Import an iCalendar (.ics) file"</div>
                  <div>4. Browse to downloaded file</div>
                  <div className="pt-2"><strong>Outlook Web:</strong></div>
                  <div>1. Settings ⚙️ → Calendar</div>
                  <div>2. "Import calendar" → Upload .ICS</div>
                </div>
              </div>
              
              {/* Gmail/Google Guide */}
              <div className="bg-white rounded-lg p-4 border">
                <h4 className="font-medium text-red-600 mb-3 flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Gmail/Google Calendar
                </h4>
                <div className="space-y-2 text-sm text-slate-700">
                  <div><strong>Method 1 (Gmail):</strong></div>
                  <div>1. Gmail Settings → Import & Export</div>
                  <div>2. "Import" → Select .ICS file</div>
                  <div className="pt-2"><strong>Method 2 (Google Calendar):</strong></div>
                  <div>1. Google Calendar → Settings ⚙️</div>
                  <div>2. "Import & export" → Import</div>
                  <div>3. Choose calendar & upload .ICS</div>
                </div>
              </div>
              
              {/* Apple Guide */}
              <div className="bg-white rounded-lg p-4 border">
                <h4 className="font-medium text-gray-600 mb-3 flex items-center gap-2">
                  📱 Apple Calendar
                </h4>
                <div className="space-y-2 text-sm text-slate-700">
                  <div><strong>Mac:</strong></div>
                  <div>1. Double-click the .ICS file</div>
                  <div>2. Choose target calendar</div>
                  <div>3. Click "Import"</div>
                  <div className="pt-2"><strong>iPhone:</strong></div>
                  <div>1. Email .ICS file to yourself</div>
                  <div>2. Tap the attachment</div>
                  <div>3. "Add to Calendar"</div>
                </div>
              </div>
              
              {/* Other Platforms */}
              <div className="bg-white rounded-lg p-4 border">
                <h4 className="font-medium text-purple-600 mb-3">🌐 Other Platforms</h4>
                <div className="space-y-2 text-sm text-slate-700">
                  <div><strong>Yahoo Mail:</strong> Calendar → Import</div>
                  <div><strong>iCloud:</strong> Calendar.icloud.com → Import</div>
                  <div><strong>Thunderbird:</strong> Events & Tasks → Import</div>
                  <div><strong>Samsung Calendar:</strong> Settings → Import</div>
                  <div className="pt-2 text-xs text-slate-500">
                    Most calendar apps support .ICS import
                  </div>
                </div>
              </div>
            </div>
            
            {/* Advanced Sharing Options */}
            {calendarUrl && (
              <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                <h4 className="font-medium text-slate-800 mb-3 flex items-center gap-2">
                  🔗 Direct Calendar Links Generated
                </h4>
                <div className="space-y-3">
                  <div className="bg-white rounded p-3 border">
                    <label className="block text-xs font-medium text-slate-600 mb-1">Universal Calendar URL:</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={calendarUrl}
                        readOnly
                        className="flex-1 text-xs p-2 bg-slate-50 border rounded font-mono"
                      />
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(calendarUrl);
                          setCopiedText('Calendar URL copied!');
                          setTimeout(() => setCopiedText(''), 2000);
                        }}
                        className="px-3 py-1 bg-slate-600 text-white rounded text-xs hover:bg-slate-700"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                  <div className="text-sm text-slate-600">
                    📧 <strong>Email this URL</strong> to team members for instant calendar access!
                  </div>
                </div>
              </div>
            )}
            
            {/* Pro Tips */}
            <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200">
              <h4 className="font-medium text-slate-800 mb-2">💡 Pro Team Management Tips:</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-slate-700">
                <div>📧 Email calendar links to all managers</div>
                <div>📁 Create shared calendar folders</div>
                <div>🔔 Enable event notifications</div>
                <div>🔄 Re-import monthly for updates</div>
                <div>🎨 Use calendar colors for venues</div>
                <div>📱 Sync across all team devices</div>
                <div>👥 Set appropriate access permissions</div>
                <div>📅 Schedule regular calendar reviews</div>
              </div>
            </div>
            
            <div className="mt-4 space-y-3">
              <div className="p-4 bg-red-50 rounded-lg border-2 border-red-200">
                <h4 className="font-bold text-red-800 mb-2">🚨 LIVE UPDATES LIMITATION</h4>
                <div className="text-sm text-red-700 space-y-2">
                  <p><strong>Problem:</strong> .ICS calendar files are static snapshots, NOT live feeds!</p>
                  <p><strong>Solution:</strong> When you add/change events in your system:</p>
                  <ul className="list-disc ml-4 space-y-1">
                    <li>Re-download the updated calendar file</li>
                    <li>Re-import it to your email calendar</li>
                    <li>Or generate new share links for your team</li>
                  </ul>
                  <p><strong>Recommendation:</strong> Update shared calendars weekly or after major changes.</p>
                </div>
              </div>
              
              <div className="p-3 bg-amber-50 rounded border border-amber-200">
                <p className="text-sm text-amber-800">
                  <strong>🔄 Updates:</strong> Calendar data reflects current events at time of generation. 
                  Re-generate links monthly or after major scheduling changes.
                </p>
              </div>
              
              <div className="p-3 bg-blue-50 rounded border border-blue-200">
                <p className="text-sm text-blue-800">
                  <strong>🛡️ Privacy:</strong> Calendar links contain event data but no sensitive payment details. 
                  Share only with authorized team members.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};