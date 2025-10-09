import React, { useState } from 'react';
import { Upload, FileText, X, AlertCircle, CheckCircle } from 'lucide-react';
import { useEventStore } from '../store/eventStore';
import { importEventsFromCSV } from '../utils/csvImport';

interface CSVImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CSVImportDialog: React.FC<CSVImportDialogProps> = ({ isOpen, onClose }) => {
  const { addMultipleEvents } = useEventStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [importMessage, setImportMessage] = useState('');
  const [previewEvents, setPreviewEvents] = useState<any[]>([]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setImportStatus('error');
      setImportMessage('Please select a CSV file.');
      return;
    }

    setIsProcessing(true);
    setImportStatus('idle');

    try {
      const fileContent = await file.text();
      const events = importEventsFromCSV(fileContent);
      
      if (events.length === 0) {
        setImportStatus('error');
        setImportMessage('No valid events found in the CSV file.');
        setIsProcessing(false);
        return;
      }

      setPreviewEvents(events);
      setImportMessage(`Found ${events.length} events to import.`);
      setIsProcessing(false);
    } catch (error) {
      setImportStatus('error');
      setImportMessage(error instanceof Error ? error.message : 'Failed to parse CSV file.');
      setIsProcessing(false);
    }
  };

  const handleImport = async () => {
    if (previewEvents.length === 0) return;

    setIsProcessing(true);
    
    try {
      await addMultipleEvents(previewEvents);
      setImportStatus('success');
      setImportMessage(`Successfully imported ${previewEvents.length} events!`);
      
      // Close dialog after a short delay
      setTimeout(() => {
        onClose();
        setPreviewEvents([]);
        setImportStatus('idle');
        setImportMessage('');
      }, 2000);
    } catch (error) {
      setImportStatus('error');
      setImportMessage('Failed to import events. Please try again.');
    }
    
    setIsProcessing(false);
  };

  const handleClose = () => {
    setPreviewEvents([]);
    setImportStatus('idle');
    setImportMessage('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Upload className="h-6 w-6 text-amber-600" />
            <h2 className="text-xl font-semibold text-gray-900">Import Events from CSV</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto">
          {/* File Upload */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select CSV File
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-amber-400 transition-colors">
              <FileText className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600 mb-3">
                Choose a CSV file with event data
              </p>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
                id="csv-file-input"
                disabled={isProcessing}
              />
              <label
                htmlFor="csv-file-input"
                className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white transition-colors cursor-pointer ${
                  isProcessing 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                {isProcessing ? 'Processing...' : 'Choose File'}
              </label>
            </div>
          </div>

          {/* Status Message */}
          {importMessage && (
            <div className={`p-4 rounded-md mb-4 flex items-center gap-3 ${
              importStatus === 'success' 
                ? 'bg-green-50 text-green-700 border border-green-200'
                : importStatus === 'error'
                ? 'bg-red-50 text-red-700 border border-red-200'
                : 'bg-blue-50 text-blue-700 border border-blue-200'
            }`}>
              {importStatus === 'success' && <CheckCircle className="h-5 w-5" />}
              {importStatus === 'error' && <AlertCircle className="h-5 w-5" />}
              {importStatus === 'idle' && <FileText className="h-5 w-5" />}
              <span>{importMessage}</span>
            </div>
          )}

          {/* Preview */}
          {previewEvents.length > 0 && importStatus !== 'success' && (
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-3">Preview Events</h3>
              <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
                <div className="divide-y divide-gray-200">
                  {previewEvents.slice(0, 5).map((event, index) => (
                    <div key={index} className="p-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">{event.title}</h4>
                          <p className="text-sm text-gray-600">
                            {event.date} • {event.startTime} - {event.endTime} • {event.venue}
                          </p>
                          <p className="text-sm text-gray-500">{event.contact.name} - {event.contact.phone}</p>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-md ${
                          event.status === 'confirmed' 
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {event.status}
                        </span>
                      </div>
                    </div>
                  ))}
                  {previewEvents.length > 5 && (
                    <div className="p-3 text-center text-sm text-gray-500">
                      ... and {previewEvents.length - 5} more events
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* CSV Format Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Expected CSV Format:</h4>
            <p className="text-sm text-gray-600 mb-2">
              Your CSV file should include these columns:
            </p>
            <div className="text-xs text-gray-500 font-mono bg-white p-2 rounded border">
              Title, Venue, Date, Start Time, End Time, Status, Payment Status, Contact Name, Contact Phone, Contact Email, Notes
            </div>
            <p className="text-xs text-gray-500 mt-2">
              • Date format: M/D/YYYY (e.g., 9/24/2025)<br />
              • Time format: H:MM (24-hour, e.g., 20:00)<br />
              • Venue: restaurant, bar, or banquet<br />
              • Status: confirmed, pending, cancelled, or closed
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            disabled={isProcessing}
          >
            Cancel
          </button>
          {previewEvents.length > 0 && importStatus !== 'success' && (
            <button
              onClick={handleImport}
              disabled={isProcessing}
              className={`px-4 py-2 text-white rounded-md transition-colors ${
                isProcessing
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-amber-600 hover:bg-amber-700'
              }`}
            >
              {isProcessing ? 'Importing...' : `Import ${previewEvents.length} Events`}
            </button>
          )}
        </div>
      </div>
    </div>  
  );
};