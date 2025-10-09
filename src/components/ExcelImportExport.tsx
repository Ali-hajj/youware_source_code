import React, { useState } from 'react';
import { Download, Upload, FileSpreadsheet, AlertCircle } from 'lucide-react';
import { useEventStore } from '../store/eventStore';

export const ExcelImportExport: React.FC = () => {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const { addEvent } = useEventStore();

  // Download CSV template
  const downloadTemplate = () => {
    const template = [
      'Title,Venue,Date,Start Time,End Time,Status,Payment Status,Contact Name,Contact Phone,Contact Email,Notes',
      'Sample Birthday Party,restaurant,2025-10-01,18:00,22:00,pending,unpaid,John Doe,313-555-0123,john@example.com,Birthday celebration',
      'Corporate Meeting,banquet,2025-10-05,12:00,15:00,confirmed,paid,Jane Smith,313-555-0124,jane@company.com,Quarterly meeting'
    ].join('\n');

    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'events_template.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  // Export events to CSV
  const exportEvents = async () => {
    setIsExporting(true);
    const exportUrl = API_ENDPOINTS.eventsExport;
    
    // Environment detection
    const isScreenshotEnv = window.location.hostname.includes('paintress') || 
                           window.location.hostname.includes('preview') ||
                           navigator.userAgent.includes('HeadlessChrome');
    
    if (isScreenshotEnv) {
      console.log('🖼️ Screenshot environment detected - export not available');
      alert('Export functionality is not available in preview mode.\nPlease use this feature in the live application.');
      setIsExporting(false);
      return;
    }
    
    try {
      console.log('📦 Starting CSV export...');
      console.log('📍 Target URL:', exportUrl);
      
      const response = await fetch(exportUrl, {
        method: 'GET',
        headers: {
          Accept: 'text/csv,application/json,*/*',
        },
        signal: AbortSignal.timeout(15000),
      });
      
      console.log('📡 Export response:', {
        status: response.status,
        statusText: response.statusText,
        url: response.url,
        ok: response.ok
      });
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Could not read error response');
        console.error('❌ Export failed:', {
          status: response.status,
          statusText: response.statusText,
          errorBody: errorText
        });

        throw new Error(`Export failed: ${response.status} ${response.statusText}`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `events_export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      console.log('✅ Export completed successfully');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const isNetworkError = message.includes('Failed to fetch') || message.includes('NetworkError');

      console.error('❌ Export error:', {
        targetUrl: exportUrl,
        error: message,
        isNetworkError,
        timestamp: new Date().toISOString()
      });

      if (isNetworkError) {
        alert('Export failed: Network issue while contacting the server. Please try again later.');
      } else if (message.includes('timeout')) {
        alert('Export failed: Request timed out. Please try again.');
      } else {
        alert(`Export failed: ${message}`);
      }
    } finally {
      setIsExporting(false);
    }
  };

  // Utility functions for data validation
  const validateDate = (dateString: string): string | null => {
    if (!dateString || typeof dateString !== 'string') {
      return null;
    }
    
    // Clean the date string
    const cleanDate = dateString.trim();
    
    // Try multiple date formats
    const dateFormats = [
      /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
      /^\d{2}\/\d{2}\/\d{4}$/, // MM/DD/YYYY
      /^\d{1,2}\/\d{1,2}\/\d{4}$/, // M/D/YYYY
      /^\d{4}\/\d{2}\/\d{2}$/, // YYYY/MM/DD
    ];
    
    // Check if date matches any valid format
    const matchesFormat = dateFormats.some(format => format.test(cleanDate));
    if (!matchesFormat) {
      return null;
    }
    
    // Try to parse and validate the date
    let parsedDate: Date;
    try {
      if (cleanDate.includes('/')) {
        // Handle MM/DD/YYYY or M/D/YYYY format
        const [month, day, year] = cleanDate.split('/').map(num => parseInt(num, 10));
        parsedDate = new Date(year, month - 1, day); // Month is 0-indexed
        
        // Verify the date is valid and matches input
        if (parsedDate.getFullYear() !== year || 
            parsedDate.getMonth() !== month - 1 || 
            parsedDate.getDate() !== day) {
          return null;
        }
      } else {
        // Handle YYYY-MM-DD format
        parsedDate = new Date(cleanDate + 'T00:00:00');
        if (isNaN(parsedDate.getTime())) {
          return null;
        }
      }
      
      // Convert to YYYY-MM-DD format
      const year = parsedDate.getFullYear();
      const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
      const day = String(parsedDate.getDate()).padStart(2, '0');
      
      return `${year}-${month}-${day}`;
    } catch (error) {
      console.warn('Date parsing error:', error, 'for date:', cleanDate);
      return null;
    }
  };
  
  const validateTime = (timeString: string): string | null => {
    if (!timeString || typeof timeString !== 'string') {
      return null;
    }
    
    const cleanTime = timeString.trim();
    
    // Support both HH:MM and H:MM formats, with optional AM/PM
    const timeRegex = /^(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?$/;
    const match = cleanTime.match(timeRegex);
    
    if (!match) {
      return null;
    }
    
    let [, hourStr, minuteStr, period] = match;
    let hour = parseInt(hourStr, 10);
    const minute = parseInt(minuteStr, 10);
    
    // Validate minute
    if (minute < 0 || minute > 59) {
      return null;
    }
    
    // Handle AM/PM conversion
    if (period) {
      const isPM = period.toUpperCase() === 'PM';
      if (hour === 12) {
        hour = isPM ? 12 : 0;
      } else if (isPM) {
        hour += 12;
      }
    }
    
    // Validate hour
    if (hour < 0 || hour > 23) {
      return null;
    }
    
    // Return in HH:MM format
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  };
  
  const validateAndCleanData = (rowData: any, rowIndex: number): any | null => {
    try {
      // Validate and clean required fields
      const title = rowData['Title']?.toString().trim();
      const venue = rowData['Venue']?.toString().trim().toLowerCase();
      const contactName = rowData['Contact Name']?.toString().trim();
      
      if (!title || !venue || !contactName) {
        console.warn(`Row ${rowIndex}: Missing required fields`);
        return null;
      }
      
      // Validate date
      const validDate = validateDate(rowData['Date']);
      if (!validDate) {
        console.warn(`Row ${rowIndex}: Invalid date format:`, rowData['Date']);
        return null;
      }
      
      // Validate times
      const validStartTime = validateTime(rowData['Start Time']);
      const validEndTime = validateTime(rowData['End Time']);
      
      if (!validStartTime || !validEndTime) {
        console.warn(`Row ${rowIndex}: Invalid time format:`, {
          startTime: rowData['Start Time'],
          endTime: rowData['End Time']
        });
        return null;
      }
      
      // Validate venue type
      const validVenues = ['restaurant', 'bar', 'banquet'];
      if (!validVenues.includes(venue)) {
        console.warn(`Row ${rowIndex}: Invalid venue type:`, venue);
        return null;
      }
      
      // Validate status
      const status = rowData['Status']?.toString().trim().toLowerCase() || 'pending';
      const validStatuses = ['pending', 'confirmed', 'cancelled', 'closed'];
      const finalStatus = validStatuses.includes(status) ? status : 'pending';
      
      // Validate payment status
      const paymentStatus = rowData['Payment Status']?.toString().trim().toLowerCase() || 'unpaid';
      const validPaymentStatuses = ['paid', 'unpaid'];
      const finalPaymentStatus = validPaymentStatuses.includes(paymentStatus) ? paymentStatus : 'unpaid';
      
      // Clean contact information
      const phone = rowData['Contact Phone']?.toString().trim() || '';
      const email = rowData['Contact Email']?.toString().trim() || '';
      
      return {
        title,
        venue,
        venueId: venue,
        date: validDate,
        startTime: validStartTime,
        endTime: validEndTime,
        status: finalStatus,
        paymentStatus: finalPaymentStatus,
        paymentMethod: finalPaymentStatus === 'paid' ? 'cash' : undefined,
        contact: {
          name: contactName,
          phone: phone,
          email: email
        },
        notes: rowData['Notes']?.toString().trim() || ''
      };
    } catch (error) {
      console.error(`Row ${rowIndex} validation error:`, error);
      return null;
    }
  };

  // Import events from CSV
  const importEvents = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        console.log('📥 Starting CSV import...');
        const csv = e.target?.result as string;
        const lines = csv.split('\n').filter(line => line.trim()); // Remove empty lines
        
        if (lines.length < 2) {
          setImportError('CSV file appears to be empty or only contains headers.');
          setIsImporting(false);
          return;
        }
        
        const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        console.log('📋 Headers found:', headers);
        
        // Validate headers
        const requiredHeaders = ['Title', 'Venue', 'Date', 'Start Time', 'End Time', 'Status', 'Payment Status', 'Contact Name', 'Contact Phone', 'Contact Email'];
        const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
        
        if (missingHeaders.length > 0) {
          setImportError(`Missing required columns: ${missingHeaders.join(', ')}`);
          setIsImporting(false);
          return;
        }

        let successCount = 0;
        let errorCount = 0;
        const errorDetails: string[] = [];

        // Process each row
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          try {
            console.log(`🔍 Processing row ${i + 1}:`, line);
            
            // Parse CSV row (handle quoted fields)
            const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
            
            const rowData: any = {};
            headers.forEach((header, index) => {
              rowData[header] = values[index] || '';
            });

            // Validate and clean the data
            const cleanedData = validateAndCleanData(rowData, i + 1);
            
            if (!cleanedData) {
              errorCount++;
              errorDetails.push(`Row ${i + 1}: Invalid data format`);
              continue;
            }

            console.log(`✅ Row ${i + 1} validated:`, cleanedData);

            // Add event to store
            addEvent(cleanedData);
            successCount++;
          } catch (rowError) {
            errorCount++;
            const errorMsg = rowError instanceof Error ? rowError.message : 'Unknown error';
            errorDetails.push(`Row ${i + 1}: ${errorMsg}`);
            console.error(`❌ Error processing row ${i + 1}:`, rowError);
          }
        }

        // Show results
        if (successCount > 0) {
          let message = `Successfully imported ${successCount} events`;
          if (errorCount > 0) {
            message += ` (${errorCount} rows had errors)`;
            console.warn('Import errors:', errorDetails);
          }
          alert(message);
          console.log(`🎉 Import completed: ${successCount} success, ${errorCount} errors`);
        } else {
          setImportError('No valid events found in the file. Please check the data format.');
          if (errorDetails.length > 0) {
            console.error('All import errors:', errorDetails);
          }
        }
      } catch (error) {
        console.error('💥 Import error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        setImportError(`Failed to parse CSV file: ${errorMessage}. Please check the file format.`);
      } finally {
        setIsImporting(false);
        // Reset file input
        event.target.value = '';
      }
    };

    reader.readAsText(file);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2 mb-4">
        <FileSpreadsheet className="w-5 h-5 text-gray-600" />
        <h3 className="text-lg font-semibold text-gray-900">Excel Import/Export</h3>
      </div>

      {importError && (
        <div className="flex items-start space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">Import Error</p>
            <p className="text-sm text-red-600">{importError}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Download Template */}
        <button
          onClick={downloadTemplate}
          className="flex items-center justify-center space-x-2 p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition-colors"
        >
          <Download className="w-5 h-5 text-gray-500" />
          <div className="text-left">
            <div className="text-sm font-medium text-gray-900">Download Template</div>
            <div className="text-xs text-gray-500">Get CSV template with sample data</div>
          </div>
        </button>

        {/* Import Events */}
        <label className="flex items-center justify-center space-x-2 p-4 border-2 border-dashed border-blue-300 rounded-lg hover:border-blue-400 transition-colors cursor-pointer">
          <Upload className="w-5 h-5 text-blue-500" />
          <div className="text-left">
            <div className="text-sm font-medium text-gray-900">
              {isImporting ? 'Importing...' : 'Import Events'}
            </div>
            <div className="text-xs text-gray-500">Upload CSV file with events</div>
          </div>
          <input
            type="file"
            accept=".csv"
            onChange={importEvents}
            disabled={isImporting}
            className="hidden"
          />
        </label>

        {/* Export Events */}
        <button
          onClick={exportEvents}
          disabled={isExporting}
          className="flex items-center justify-center space-x-2 p-4 border-2 border-dashed border-green-300 rounded-lg hover:border-green-400 transition-colors disabled:opacity-50"
        >
          <Download className="w-5 h-5 text-green-500" />
          <div className="text-left">
            <div className="text-sm font-medium text-gray-900">
              {isExporting ? 'Exporting...' : 'Export Events'}
            </div>
            <div className="text-xs text-gray-500">Download all events as CSV</div>
          </div>
        </button>
      </div>

      <div className="p-4 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Instructions:</h4>
        <ul className="text-xs text-gray-600 space-y-1">
          <li>• Download the template to see the correct format</li>
          <li>• Required columns: Title, Venue, Date, Start Time, End Time, Status, Payment Status, Contact Name, Contact Phone, Contact Email</li>
          <li>• Date format: YYYY-MM-DD (e.g., 2025-10-01)</li>
          <li>• Time format: HH:MM (e.g., 18:00)</li>
          <li>• Venue options: restaurant, bar, banquet</li>
          <li>• Status options: pending, confirmed, cancelled, closed</li>
          <li>• Payment Status: paid, unpaid</li>
        </ul>
      </div>
    </div>
  );
};