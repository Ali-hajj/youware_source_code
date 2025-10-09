import { Event, EventStatus, PaymentStatus, VenueType } from '../types';

interface CSVRow {
  Title: string;
  Venue: string;
  Date: string;
  'Start Time': string;
  'End Time': string;
  Status: string;
  'Payment Status': string;
  'Contact Name': string;
  'Contact Phone': string;
  'Contact Email': string;
  Notes: string;
}

// Parse CSV content into array of objects
export function parseCSV(csvContent: string): CSVRow[] {
  const lines = csvContent.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  const rows: CSVRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    // Simple CSV parsing (handles basic cases)
    const values = line.split(',').map(v => v.trim());
    const row: any = {};
    
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    
    rows.push(row as CSVRow);
  }

  return rows;
}

// Convert date from M/D/YYYY to YYYY-MM-DD format
function convertDate(dateStr: string): string {
  const [month, day, year] = dateStr.split('/');
  const paddedMonth = month.padStart(2, '0');
  const paddedDay = day.padStart(2, '0');
  return `${year}-${paddedMonth}-${paddedDay}`;
}

// Convert time from H:MM to HH:MM format
function convertTime(timeStr: string): string {
  const [hours, minutes] = timeStr.split(':');
  const paddedHours = hours.padStart(2, '0');
  return `${paddedHours}:${minutes}`;
}

// Map venue strings to VenueType
function mapVenue(venue: string): VenueType {
  const venueMap: Record<string, VenueType> = {
    'Bar': 'bar',
    'bar': 'bar',
    'Restaurant': 'restaurant',
    'restaurant': 'restaurant',
    'Banquet': 'banquet',
    'banquet': 'banquet'
  };
  
  return venueMap[venue] || 'restaurant';
}

// Map status strings to EventStatus
function mapStatus(status: string): EventStatus {
  const statusMap: Record<string, EventStatus> = {
    'confirmed': 'confirmed',
    'pending': 'pending',
    'cancelled': 'cancelled',
    'closed': 'closed'
  };
  
  return statusMap[status.toLowerCase()] || 'pending';
}

// Map payment status strings to PaymentStatus
function mapPaymentStatus(paymentStatus: string): PaymentStatus {
  const paymentMap: Record<string, PaymentStatus> = {
    'paid': 'paid',
    'unpaid': 'unpaid'
  };
  
  return paymentMap[paymentStatus.toLowerCase()] || 'unpaid';
}

// Convert CSV row to Event object
export function convertCSVRowToEvent(row: CSVRow): Omit<Event, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    title: row.Title.trim(),
    venue: mapVenue(row.Venue.trim()),
    date: convertDate(row.Date.trim()),
    startTime: convertTime(row['Start Time'].trim()),
    endTime: convertTime(row['End Time'].trim()),
    status: mapStatus(row.Status.trim()),
    paymentStatus: mapPaymentStatus(row['Payment Status'].trim()),
    contact: {
      name: row['Contact Name'].trim(),
      phone: row['Contact Phone'].trim(),
      email: row['Contact Email'].trim(),
    },
    notes: row.Notes.trim() || undefined,
  };
}

// Main function to import events from CSV content
export function importEventsFromCSV(csvContent: string): Omit<Event, 'id' | 'createdAt' | 'updatedAt'>[] {
  try {
    const rows = parseCSV(csvContent);
    const events = rows
      .filter(row => row.Title && row.Date) // Filter out invalid rows
      .map(row => convertCSVRowToEvent(row));
    
    return events;
  } catch (error) {
    console.error('Error importing events from CSV:', error);
    throw new Error('Failed to parse CSV file. Please check the file format.');
  }
}