import React, { useState, useEffect } from 'react';
import { X, Save, Palette, Plus, Trash2, Mail, FileText, Calculator, Users, Eye, Printer, Download } from 'lucide-react';
import { useEventStore } from '../store/eventStore';
import { Event, VenueType, EventStatus, PaymentMethod, PricingDetails, MenuItem, DiscountType, PricingMode, PaymentRecord } from '../types';

interface EventDialogProps {
  isOpen: boolean;
  onClose: () => void;
  event?: Event | null;
  defaultDate?: string;
}

interface EventFormData {
  title: string;
  venue: VenueType;
  venueId?: string;
  color?: string;
  date: string;
  startTime: string;
  endTime: string;
  status: EventStatus;
  paymentStatus: 'paid' | 'unpaid';
  paymentMethod?: PaymentMethod;
  contact: {
    name: string;
    phone: string;
    email: string;
  };
  pricing?: PricingDetails;
  notes: string;
}

const initialPricingData: PricingDetails = {
  mode: 'person' as PricingMode,
  menuItems: [],
  personCount: 1,
  pricePerPerson: 0,
  customPlatters: [],
  subtotal: 0,
  discount: {
    type: 'percentage' as DiscountType,
    value: 0,
    amount: 0,
  },
  taxRate: 0.06, // 6% Michigan tax
  taxAmount: 0,
  includeTax: true,
  total: 0,
  deposits: [],
  amountPaid: 0,
  remainingBalance: 0,
};

const initialFormData: EventFormData = {
  title: '',
  venue: 'restaurant',
  venueId: 'restaurant',
  color: undefined,
  date: '',
  startTime: '18:00',
  endTime: '21:00',
  status: 'pending',
  paymentStatus: 'unpaid',
  paymentMethod: undefined,
  contact: {
    name: '',
    phone: '',
    email: '',
  },
  pricing: initialPricingData,
  notes: '',
};

export const EventDialog: React.FC<EventDialogProps> = ({
  isOpen,
  onClose,
  event,
  defaultDate,
}) => {
  const { addEvent, updateEvent, venues, colorPresets, settings } = useEventStore();
  const [formData, setFormData] = useState<EventFormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'guests' | 'menu' | 'invoice'>('details');

  const isEditMode = Boolean(event);

  useEffect(() => {
    if (isOpen) {
      if (event) {
        
        // Edit mode - populate with existing event data
        setFormData({
          title: event.title,
          venue: event.venue,
          venueId: event.venueId || event.venue,
          color: event.color,
          date: event.date,
          startTime: event.startTime,
          endTime: event.endTime,
          status: event.status,
          paymentStatus: event.paymentStatus,
          paymentMethod: event.paymentMethod,
          contact: event.contact,
          pricing: event.pricing || initialPricingData,
          notes: event.notes || '',
        });
      } else {
        // New event mode
        setFormData({
          ...initialFormData,
          date: defaultDate || new Date().toISOString().split('T')[0],
        });
      }
      setErrors({});
    }
  }, [isOpen, event, defaultDate]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Event title is required';
    }

    if (!formData.date) {
      newErrors.date = 'Date is required';
    }

    if (!formData.startTime) {
      newErrors.startTime = 'Start time is required';
    }

    if (!formData.endTime) {
      newErrors.endTime = 'End time is required';
    }

    if (formData.startTime && formData.endTime && formData.startTime >= formData.endTime) {
      newErrors.endTime = 'End time must be after start time';
    }

    if (!formData.contact.name.trim()) {
      newErrors['contact.name'] = 'Contact name is required';
    }

    if (!formData.contact.phone.trim()) {
      newErrors['contact.phone'] = 'Contact phone is required';
    }

    if (!formData.contact.email.trim()) {
      newErrors['contact.email'] = 'Contact email is required';
    } else if (!/^[^@]+@[^@]+\.[^@]+$/.test(formData.contact.email)) {
      newErrors['contact.email'] = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    if (isEditMode && event) {
      await updateEvent(event.id, formData);
    } else {
      await addEvent(formData);
    }

    onClose();
  };

  const handleInputChange = (field: string, value: string) => {
    if (field.startsWith('contact.')) {
      const contactField = field.split('.')[1];
      setFormData(prev => ({
        ...prev,
        contact: {
          ...prev.contact,
          [contactField]: value,
        },
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value,
      }));
    }

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  const calculatePricing = (pricing: PricingDetails): PricingDetails => {
    const menuSubtotal = pricing.menuItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const customPlattersSubtotal = pricing.customPlatters.reduce((sum, platter) => sum + (platter.price * platter.quantity), 0);
    
    // Calculate subtotal - ALWAYS include menu items and guest pricing
    let subtotal = 0;
    
    // Always include menu items in the calculation
    subtotal += menuSubtotal;
    
    // Always include guest pricing if specified
    if (pricing.personCount > 0 && pricing.pricePerPerson > 0) {
      subtotal += pricing.personCount * pricing.pricePerPerson;
    }
    
    // Include custom platters if in custom mode
    if (pricing.mode === 'custom') {
      subtotal += customPlattersSubtotal;
    }
    
    let discountAmount = 0;
    if (pricing.discount.value > 0) {
      if (pricing.discount.type === 'percentage') {
        discountAmount = subtotal * (pricing.discount.value / 100);
      } else {
        discountAmount = pricing.discount.value;
      }
    }
    
    const afterDiscount = subtotal - discountAmount;
    const taxAmount = pricing.includeTax ? afterDiscount * pricing.taxRate : 0;
    const total = afterDiscount + taxAmount;
    
    // Recalculate deposit-related amounts
    const totalDeposits = pricing.deposits.reduce((sum, deposit) => sum + deposit.amount, 0);
    const remainingBalance = total - totalDeposits;
    
    return {
      ...pricing,
      subtotal,
      discount: {
        ...pricing.discount,
        amount: discountAmount,
      },
      taxAmount,
      total,
      amountPaid: totalDeposits,
      remainingBalance,
    };
  };

  const updatePricing = (updates: Partial<PricingDetails>) => {
    const newPricing = { ...formData.pricing!, ...updates };
    const calculatedPricing = calculatePricing(newPricing);
    setFormData(prev => ({
      ...prev,
      pricing: calculatedPricing,
    }));
  };

  const addMenuItem = () => {
    const newItem: MenuItem = {
      id: crypto.randomUUID(),
      name: '',
      price: 0,
      quantity: 1,
      description: '',
    };
    updatePricing({
      menuItems: [...formData.pricing!.menuItems, newItem],
    });
  };

  const updateMenuItem = (id: string, updates: Partial<MenuItem>) => {
    const updatedItems = formData.pricing!.menuItems.map(item =>
      item.id === id ? { ...item, ...updates } : item
    );
    updatePricing({ menuItems: updatedItems });
  };

  const removeMenuItem = (id: string) => {
    const filteredItems = formData.pricing!.menuItems.filter(item => item.id !== id);
    updatePricing({ menuItems: filteredItems });
  };

  const addCustomPlatter = () => {
    const newPlatter: MenuItem = {
      id: crypto.randomUUID(),
      name: '',
      price: 0,
      quantity: 1,
      description: '',
    };
    updatePricing({
      customPlatters: [...formData.pricing!.customPlatters, newPlatter],
    });
  };

  const updateCustomPlatter = (id: string, updates: Partial<MenuItem>) => {
    const updatedPlatters = formData.pricing!.customPlatters.map(platter =>
      platter.id === id ? { ...platter, ...updates } : platter
    );
    updatePricing({ customPlatters: updatedPlatters });
  };

  const removeCustomPlatter = (id: string) => {
    const filteredPlatters = formData.pricing!.customPlatters.filter(platter => platter.id !== id);
    updatePricing({ customPlatters: filteredPlatters });
  };

  // Deposit management functions
  const addDeposit = () => {
    const newDeposit: PaymentRecord = {
      id: crypto.randomUUID(),
      amount: 0,
      method: 'cash',
      date: new Date().toISOString().split('T')[0],
      notes: '',
    };
    const updatedDeposits = [...formData.pricing!.deposits, newDeposit];
    const totalDeposits = updatedDeposits.reduce((sum, deposit) => sum + deposit.amount, 0);
    updatePricing({
      deposits: updatedDeposits,
      amountPaid: totalDeposits,
      remainingBalance: formData.pricing!.total - totalDeposits,
    });
  };

  const updateDeposit = (id: string, updates: Partial<PaymentRecord>) => {
    const updatedDeposits = formData.pricing!.deposits.map(deposit =>
      deposit.id === id ? { ...deposit, ...updates } : deposit
    );
    const totalDeposits = updatedDeposits.reduce((sum, deposit) => sum + deposit.amount, 0);
    updatePricing({
      deposits: updatedDeposits,
      amountPaid: totalDeposits,
      remainingBalance: formData.pricing!.total - totalDeposits,
    });
  };

  const removeDeposit = (id: string) => {
    const filteredDeposits = formData.pricing!.deposits.filter(deposit => deposit.id !== id);
    const totalDeposits = filteredDeposits.reduce((sum, deposit) => sum + deposit.amount, 0);
    updatePricing({
      deposits: filteredDeposits,
      amountPaid: totalDeposits,
      remainingBalance: formData.pricing!.total - totalDeposits,
    });
  };

  // Helper function to format time to 12-hour format
  const formatTo12Hour = (time24: string): string => {
    const [hours, minutes] = time24.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const generatePDFInvoice = () => {
    // Create invoice content that matches exactly what's shown in Invoice Preview
    const invoiceContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice - ${formData.title}</title>
        <style>
          @page {
            margin: 20px;
            size: A4;
          }
          body { 
            font-family: Arial, sans-serif; 
            margin: 0;
            padding: 20px;
            line-height: 1.4;
            font-size: 12px;
          }
          .header { 
            display: flex; 
            justify-content: space-between; 
            align-items: flex-start; 
            margin-bottom: 25px;
          }
          .logo-section {
            display: flex;
            flex-direction: column;
            align-items: flex-start;
          }
          .logo { 
            max-width: 80px; 
            max-height: 80px; 
            object-fit: contain;
            margin-bottom: 10px;
          }
          .company-details {
            text-align: left;
          }
          .invoice-title { 
            font-size: 24px; 
            font-weight: bold; 
            margin: 0;
            color: #1f2937;
          }
          .subtitle {
            color: #6b7280;
            margin-top: 4px;
          }
          .section {
            margin-bottom: 15px;
          }
          .section-row {
            display: flex;
            justify-content: space-between;
            gap: 40px;
            margin-bottom: 15px;
          }
          .section-col {
            flex: 1;
          }
          .section h3 {
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 8px;
          }
          .company-details, .client-details, .event-details {
            color: #374151;
          }
          .company-details p, .client-details p, .event-details p {
            margin: 2px 0;
          }
          .font-medium { font-weight: 500; }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin: 20px 0; 
          }
          th, td { 
            border: 1px solid #d1d5db; 
            padding: 8px; 
          }
          th { 
            background-color: #f9fafb; 
            font-weight: 600;
            text-align: left;
          }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .text-sm { font-size: 12px; color: #6b7280; }
          .totals { 
            margin-top: 20px; 
            width: 320px; 
            margin-left: auto;
          }
          .totals-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            font-size: 14px;
            color: #6b7280;
          }
          .subtotal-row {
            display: flex;
            justify-content: space-between;
            padding-top: 8px;
            border-top: 1px solid #d1d5db;
            font-weight: 500;
          }
          .discount-row {
            display: flex;
            justify-content: space-between;
            color: #dc2626;
          }
          .total-row { 
            display: flex;
            justify-content: space-between;
            border-top: 2px solid #6b7280;
            padding-top: 12px;
            font-weight: bold; 
            font-size: 20px;
          }
          .total-amount {
            color: #16a34a;
          }
          .footer {
            border-top: 1px solid #e5e7eb;
            padding-top: 16px;
            text-align: center;
            font-size: 14px;
            color: #6b7280;
            margin-top: 40px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo-section">
            <img src="${settings.logo ? (settings.logo.startsWith('data:') ? settings.logo : '/assets/default-logo.png') : '/assets/default-logo.png'}" alt="Logo" class="logo" />
            <div class="company-details">
              <p class="font-medium" style="margin: 0; font-size: 16px;">${settings.storeName}</p>
              ${settings.storeAddress ? `<p style="margin: 2px 0; font-size: 12px;">${settings.storeAddress}</p>` : ''}
              ${settings.storePhone ? `<p style="margin: 2px 0; font-size: 12px;">Phone: ${settings.storePhone}</p>` : ''}
              ${settings.storeEmail ? `<p style="margin: 2px 0; font-size: 12px;">Email: ${settings.storeEmail}</p>` : ''}
            </div>
          </div>
          <div style="text-align: right;">
            <p style="font-size: 14px; color: #6b7280;">Invoice Date:</p>
            <p class="font-medium">${new Date().toLocaleDateString()}</p>
            <p style="font-size: 14px; color: #6b7280; margin-top: 8px;">Event Date:</p>
            <p class="font-medium">${new Date(formData.date + 'T00:00:00').toLocaleDateString()}</p>
          </div>
        </div>
        
        <div style="text-align: center; margin: 20px 0;">
          <h1 class="invoice-title">INVOICE</h1>
          <p class="subtitle">Event Management Services</p>
        </div>
        
        <div class="section-row">
          <div class="section-col">
            <h3>Bill To:</h3>
            <div class="client-details">
              <p class="font-medium">${formData.contact.name}</p>
              <p>${formData.contact.email}</p>
              <p>${formData.contact.phone}</p>
            </div>
          </div>
          <div class="section-col">
            <h3>Event Details:</h3>
            <div class="event-details">
              <p><span class="font-medium">Event:</span> ${formData.title}</p>
              <p><span class="font-medium">Date:</span> ${new Date(formData.date + 'T00:00:00').toLocaleDateString()}</p>
              <p><span class="font-medium">Time:</span> ${formatTo12Hour(formData.startTime)} - ${formatTo12Hour(formData.endTime)}</p>
              <p><span class="font-medium">Venue:</span> ${venues.find(v => v.id === formData.venueId)?.name || 'N/A'}</p>
            </div>
          </div>
        </div>
        
        <div class="section">
          <h3>Services:</h3>
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th class="text-center">Quantity</th>
                <th class="text-right">Unit Price</th>
                <th class="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              ${formData.pricing!.personCount > 0 && formData.pricing!.pricePerPerson > 0 ? `
                <tr>
                  <td>Guest Services</td>
                  <td class="text-center">${formData.pricing!.personCount}</td>
                  <td class="text-right">$${formData.pricing!.pricePerPerson.toFixed(2)}</td>
                  <td class="text-right">$${(formData.pricing!.personCount * formData.pricing!.pricePerPerson).toFixed(2)}</td>
                </tr>
              ` : ''}
              ${formData.pricing!.menuItems.map(item => `
                <tr>
                  <td>
                    ${item.name}${item.description ? ` <span style="color: #1e3a8a;">(${item.description})</span>` : ''}
                  </td>
                  <td class="text-center">${item.quantity}</td>
                  <td class="text-right">${item.price > 0 ? '$' + item.price.toFixed(2) : 'N/A'}</td>
                  <td class="text-right">${item.price > 0 ? '$' + (item.price * item.quantity).toFixed(2) : 'Included'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        
        <div class="section">
          <div class="totals">
            <!-- Menu Items Breakdown -->
            <div class="totals-row">
              <span>Menu Items:</span>
              <span>$${formData.pricing!.menuItems.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2)}</span>
            </div>
            ${formData.pricing!.personCount > 0 && formData.pricing!.pricePerPerson > 0 ? `
              <!-- Guest Services Breakdown -->
              <div class="totals-row">
                <span>Guest Services (${formData.pricing!.personCount} guests):</span>
                <span>$${(formData.pricing!.personCount * formData.pricing!.pricePerPerson).toFixed(2)}</span>
              </div>
            ` : ''}
            <div class="subtotal-row">
              <span>Subtotal:</span>
              <span>$${formData.pricing!.subtotal.toFixed(2)}</span>
            </div>
            ${formData.pricing!.discount.amount > 0 ? `
              <div class="discount-row">
                <span>Discount:</span>
                <span>-$${formData.pricing!.discount.amount.toFixed(2)}</span>
              </div>
            ` : ''}
            ${formData.pricing!.includeTax ? `
              <div class="totals-row">
                <span>Tax (${(formData.pricing!.taxRate * 100).toFixed(1)}%):</span>
                <span>$${formData.pricing!.taxAmount.toFixed(2)}</span>
              </div>
            ` : ''}
            <div class="total-row">
              <span>Final Total:</span>
              <span class="total-amount">$${formData.pricing!.total.toFixed(2)}</span>
            </div>
          </div>
        </div>
        
        <div class="footer">
          <p>Thank you for your business!</p>
          <p style="margin-top: 8px;">Powered and Designed By Mike Akanan | (313) 938-6666</p>
        </div>
      </body>
      </html>
    `;
    
    // Create a new window/tab with the invoice content for printing/saving as PDF
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(invoiceContent);
      printWindow.document.close();
      
      // Wait for content to load, then trigger print dialog
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
        }, 250);
      };
    }
    
    // Also open mailto with invoice content
    const emailSubject = `Invoice: ${formData.title}`;
    const emailBody = `Dear ${formData.contact.name},\n\nPlease find the invoice for your event below.\n\nEvent: ${formData.title}\nDate: ${new Date(formData.date).toLocaleDateString()}\nTotal: $${formData.pricing!.total.toFixed(2)}\n\nThank you for your business!\n\nBest regards`;
    const mailtoLink = `mailto:${formData.contact.email}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
    window.open(mailtoLink, '_blank');
  };

  const sendEmail = (type: 'schedule' | 'invoice') => {
    const subject = type === 'schedule' 
      ? `Event Schedule: ${formData.title}` 
      : `Invoice: ${formData.title}`;
    
    let body = `Dear ${formData.contact.name},\n\n`;
    
    if (type === 'schedule') {
      body += `This is to confirm your event details:\n\n`;
      body += `Event: ${formData.title}\n`;
      body += `Date: ${new Date(formData.date).toLocaleDateString()}\n`;
      body += `Time: ${formData.startTime} - ${formData.endTime}\n`;
      body += `Venue: ${venues.find(v => v.id === formData.venueId)?.name}\n\n`;
      if (formData.notes) {
        body += `Notes: ${formData.notes}\n\n`;
      }
    } else {
      body += `Invoice for your upcoming event:\n\n`;
      body += `Event: ${formData.title}\n`;
      body += `Date: ${new Date(formData.date).toLocaleDateString()}\n\n`;
      
      if (formData.pricing!.menuItems.length > 0) {
        body += `Menu Items:\n`;
        formData.pricing!.menuItems.forEach(item => {
          body += `- ${item.name} x${item.quantity} @ $${item.price.toFixed(2)} = $${(item.price * item.quantity).toFixed(2)}\n`;
        });
        body += `\n`;
      }
      
      if (formData.pricing!.personCount > 0 && formData.pricing!.pricePerPerson > 0) {
        body += `Persons: ${formData.pricing!.personCount} x $${formData.pricing!.pricePerPerson.toFixed(2)} = $${(formData.pricing!.personCount * formData.pricing!.pricePerPerson).toFixed(2)}\n\n`;
      }
      
      body += `Subtotal: $${formData.pricing!.subtotal.toFixed(2)}\n`;
      
      if (formData.pricing!.discount.amount > 0) {
        body += `Discount: -$${formData.pricing!.discount.amount.toFixed(2)}\n`;
      }
      
      if (formData.pricing!.includeTax) {
        body += `Tax (${(formData.pricing!.taxRate * 100).toFixed(1)}%): $${formData.pricing!.taxAmount.toFixed(2)}\n`;
      }
      
      body += `\nTotal: $${formData.pricing!.total.toFixed(2)}\n\n`;
    }
    
    body += `Best regards,\n${formData.contact.name}`;
    
    const mailtoLink = `mailto:${formData.contact.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoLink, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {isEditMode ? 'Edit Event' : 'New Event'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <div className="flex px-6">
            <button
              type="button"
              onClick={() => setActiveTab('details')}
              className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'details'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Event Details
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('guests')}
              className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'guests'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Users className="h-4 w-4" />
              Guest Count
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('menu')}
              className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'menu'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Calculator className="h-4 w-4" />
              Menu & Pricing
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('invoice')}
              className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'invoice'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <FileText className="h-4 w-4" />
              Invoice Preview
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Event Details Tab */}
          {activeTab === 'details' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Event Title */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Event Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.title ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="e.g., Corporate Holiday Party"
                />
                {errors.title && (
                  <p className="mt-1 text-sm text-red-600">{errors.title}</p>
                )}
              </div>

              {/* Venue Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Venue *
                </label>
                <select
                  value={formData.venueId || formData.venue}
                  onChange={(e) => {
                    const selectedVenue = venues.find(v => v.id === e.target.value);
                    handleInputChange('venueId', e.target.value);
                    handleInputChange('venue', selectedVenue?.type || e.target.value);
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent shadow-sm"
                >
                  {venues.map((venue) => (
                    <option key={venue.id} value={venue.id}>
                      {venue.icon} {venue.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Event Color */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Event Color
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowColorPicker(!showColorPicker)}
                    className="flex items-center gap-2 px-3 py-2 border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
                  >
                    <div
                      className="w-5 h-5 rounded border border-slate-300"
                      style={{ 
                        backgroundColor: formData.color || venues.find(v => v.id === (formData.venueId || formData.venue))?.color || '#6b7280' 
                      }}
                    />
                    <Palette className="h-4 w-4" />
                    {formData.color ? 'Custom' : 'Default'}
                  </button>
                  {formData.color && (
                    <button
                      type="button"
                      onClick={() => handleInputChange('color', '')}
                      className="text-sm text-slate-500 hover:text-slate-700"
                    >
                      Reset
                    </button>
                  )}
                </div>
                
                {showColorPicker && (
                  <div className="mt-3 p-3 border border-slate-200 rounded-lg bg-slate-50">
                    <div className="grid grid-cols-6 gap-2 mb-3">
                      {colorPresets.slice(0, 12).map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => {
                            handleInputChange('color', preset.color);
                            setShowColorPicker(false);
                          }}
                          className="w-8 h-8 rounded border-2 border-white shadow-sm hover:scale-110 transition-transform"
                          style={{ backgroundColor: preset.color }}
                          title={preset.name}
                        />
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={formData.color || '#6b7280'}
                        onChange={(e) => handleInputChange('color', e.target.value)}
                        className="w-10 h-8 rounded border border-slate-300"
                      />
                      <span className="text-sm text-slate-600">Custom Color</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date *
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleInputChange('date', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.date ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.date && (
                  <p className="mt-1 text-sm text-red-600">{errors.date}</p>
                )}
              </div>

              {/* Start Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Time *
                </label>
                <input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => handleInputChange('startTime', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.startTime ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.startTime && (
                  <p className="mt-1 text-sm text-red-600">{errors.startTime}</p>
                )}
              </div>

              {/* End Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Time *
                </label>
                <input
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => handleInputChange('endTime', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.endTime ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.endTime && (
                  <p className="mt-1 text-sm text-red-600">{errors.endTime}</p>
                )}
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent shadow-sm"
                >
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              {/* Payment Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Status
                </label>
                <select
                  value={formData.paymentStatus}
                  onChange={(e) => handleInputChange('paymentStatus', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent shadow-sm"
                >
                  <option value="unpaid">Unpaid</option>
                  <option value="paid">Paid</option>
                </select>
              </div>

              {/* Payment Method */}
              {formData.paymentStatus === 'paid' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Method
                  </label>
                  <select
                    value={formData.paymentMethod || ''}
                    onChange={(e) => handleInputChange('paymentMethod', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent shadow-sm"
                  >
                    <option value="">Select method</option>
                    <option value="cash">Cash</option>
                    <option value="credit_card">Credit Card</option>
                    <option value="check">Check</option>
                  </select>
                </div>
              )}

              {/* Contact Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contact Name *
                </label>
                <input
                  type="text"
                  value={formData.contact.name}
                  onChange={(e) => handleInputChange('contact.name', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors['contact.name'] ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Contact person name"
                />
                {errors['contact.name'] && (
                  <p className="mt-1 text-sm text-red-600">{errors['contact.name']}</p>
                )}
              </div>

              {/* Contact Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contact Phone *
                </label>
                <input
                  type="tel"
                  value={formData.contact.phone}
                  onChange={(e) => {
                    // Auto-format phone number as user types
                    let value = e.target.value.replace(/\D/g, ''); // Remove all non-digits
                    if (value.length <= 3) {
                      value = value;
                    } else if (value.length <= 6) {
                      value = `${value.slice(0, 3)}-${value.slice(3)}`;
                    } else if (value.length <= 10) {
                      value = `${value.slice(0, 3)}-${value.slice(3, 6)}-${value.slice(6)}`;
                    } else {
                      value = `${value.slice(0, 3)}-${value.slice(3, 6)}-${value.slice(6, 10)}`;
                    }
                    handleInputChange('contact.phone', value);
                  }}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors['contact.phone'] ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="000-000-0000"
                  maxLength={12}
                />
                {errors['contact.phone'] && (
                  <p className="mt-1 text-sm text-red-600">{errors['contact.phone']}</p>
                )}
              </div>

              {/* Contact Email */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contact Email *
                </label>
                <input
                  type="email"
                  value={formData.contact.email}
                  onChange={(e) => handleInputChange('contact.email', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors['contact.email'] ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="contact@example.com"
                />
                {errors['contact.email'] && (
                  <p className="mt-1 text-sm text-red-600">{errors['contact.email']}</p>
                )}
              </div>

              {/* Notes */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent shadow-sm"
                  placeholder="Special requests, dietary restrictions, etc."
                />
              </div>
            </div>
          )}

          {/* Guest Count Tab */}
          {activeTab === 'guests' && (
            <div className="space-y-6">
              <div className="bg-blue-50 rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  Guest Count & Pricing
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Number of Guests
                    </label>
                    <input
                      type="number"
                      value={formData.pricing!.personCount || ''}
                      onChange={(e) => updatePricing({ personCount: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min="0"
                      placeholder="0"
                    />
                    <p className="text-sm text-gray-500 mt-1">Total number of guests attending</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Price Per Guest ($)
                    </label>
                    <input
                      type="number"
                      value={formData.pricing!.pricePerPerson || ''}
                      onChange={(e) => updatePricing({ pricePerPerson: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                    />
                    <p className="text-sm text-gray-500 mt-1">Cost per guest for the event</p>
                  </div>
                </div>
                <div className="mt-4 p-4 bg-white rounded-md border">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-medium text-gray-900">Guest Subtotal:</span>
                    <span className="text-lg font-bold text-blue-600">
                      ${((formData.pricing!.personCount || 0) * (formData.pricing!.pricePerPerson || 0)).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Menu & Pricing Tab */}
          {activeTab === 'menu' && (
            <div className="space-y-6">
              {/* Menu Items Section */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Menu Items</h3>
                  <button
                    type="button"
                    onClick={addMenuItem}
                    className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    Add Item
                  </button>
                </div>
                
                {/* Menu Item Headers */}
                <div className="grid grid-cols-12 gap-3 mb-3 px-3 py-2 bg-blue-50 rounded-lg">
                  <div className="col-span-4">
                    <span className="text-sm font-semibold text-gray-700">Item Name</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-sm font-semibold text-gray-700">Price ($)</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-sm font-semibold text-gray-700">Quantity</span>
                  </div>
                  <div className="col-span-3">
                    <span className="text-sm font-semibold text-gray-700">Total</span>
                  </div>
                  <div className="col-span-1">
                    <span className="text-sm font-semibold text-gray-700">Action</span>
                  </div>
                </div>

                <div className="space-y-3">
                  {formData.pricing!.menuItems.map((item) => (
                    <div key={item.id} className="grid grid-cols-12 gap-3 items-start p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="col-span-4">
                        <input
                          type="text"
                          placeholder="Enter item name"
                          value={item.name}
                          onChange={(e) => updateMenuItem(item.id, { name: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          placeholder="0.00"
                          value={item.price || ''}
                          onChange={(e) => updateMenuItem(item.id, { price: parseFloat(e.target.value) || 0 })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          step="0.01"
                          min="0"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          placeholder="1"
                          value={item.quantity || ''}
                          onChange={(e) => updateMenuItem(item.id, { quantity: parseInt(e.target.value) || 1 })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          min="1"
                        />
                      </div>
                      <div className="col-span-3">
                        <div className="flex items-center justify-center h-10">
                          <span className="text-lg font-bold text-gray-900">
                            {item.price > 0 ? `$${(item.price * item.quantity).toFixed(2)}` : 'Included'}
                          </span>
                        </div>
                      </div>
                      <div className="col-span-1">
                        <div className="flex items-center justify-center h-10">
                          <button
                            type="button"
                            onClick={() => removeMenuItem(item.id)}
                            className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                            title="Remove item"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <div className="col-span-12">
                        <input
                          type="text"
                          placeholder="Description (optional)"
                          value={item.description || ''}
                          onChange={(e) => updateMenuItem(item.id, { description: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            {/* Custom Platters Section */}
            {formData.pricing!.mode === 'custom' && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Custom Platters</h3>
                    <button
                      type="button"
                      onClick={addCustomPlatter}
                      className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                      Add Platter
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {formData.pricing!.customPlatters.map((platter) => (
                      <div key={platter.id} className="grid grid-cols-12 gap-3 items-start p-3 bg-green-50 rounded-lg">
                        <div className="col-span-4">
                          <input
                            type="text"
                            placeholder="Platter name"
                            value={platter.name}
                            onChange={(e) => updateCustomPlatter(platter.id, { name: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="number"
                            placeholder="Price"
                            value={platter.price || ''}
                            onChange={(e) => updateCustomPlatter(platter.id, { price: parseFloat(e.target.value) || 0 })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            step="0.01"
                            min="0"
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="number"
                            placeholder="Qty"
                            value={platter.quantity || ''}
                            onChange={(e) => updateCustomPlatter(platter.id, { quantity: parseInt(e.target.value) || 1 })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            min="1"
                          />
                        </div>
                        <div className="col-span-3">
                          <div className="flex items-center justify-between h-10">
                            <span className="text-sm font-medium text-gray-900">
                              ${(platter.price * platter.quantity).toFixed(2)}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeCustomPlatter(platter.id)}
                              className="text-red-500 hover:text-red-700 transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        <div className="col-span-12">
                          <input
                            type="text"
                            placeholder="Platter description (optional)"
                            value={platter.description || ''}
                            onChange={(e) => updateCustomPlatter(platter.id, { description: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}



              {/* Discount Section */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Discount</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Discount Type
                    </label>
                    <select
                      value={formData.pricing!.discount.type}
                      onChange={(e) => updatePricing({
                        discount: {
                          ...formData.pricing!.discount,
                          type: e.target.value as DiscountType,
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="percentage">Percentage (%)</option>
                      <option value="fixed">Fixed Amount ($)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Discount Value
                    </label>
                    <input
                      type="number"
                      value={formData.pricing!.discount.value || ''}
                      onChange={(e) => updatePricing({
                        discount: {
                          ...formData.pricing!.discount,
                          value: parseFloat(e.target.value) || 0,
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      step={formData.pricing!.discount.type === 'percentage' ? '1' : '0.01'}
                      min="0"
                      max={formData.pricing!.discount.type === 'percentage' ? '100' : undefined}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Discount Amount
                    </label>
                    <div className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-gray-700">
                      ${formData.pricing!.discount.amount.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Tax Section */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Tax Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="includeTax"
                        checked={formData.pricing!.includeTax}
                        onChange={(e) => updatePricing({ includeTax: e.target.checked })}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <label htmlFor="includeTax" className="text-sm font-medium text-gray-700">
                        Include Tax
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tax Rate (%)
                    </label>
                    <input
                      type="number"
                      value={(formData.pricing!.taxRate * 100).toFixed(1)}
                      onChange={(e) => updatePricing({ taxRate: (parseFloat(e.target.value) || 0) / 100 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      step="0.1"
                      min="0"
                      max="100"
                      disabled={!formData.pricing!.includeTax}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tax Amount
                    </label>
                    <div className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-gray-700">
                      ${formData.pricing!.taxAmount.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Deposits Section */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Deposits & Payments</h3>
                  <button
                    type="button"
                    onClick={addDeposit}
                    className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    Add Deposit
                  </button>
                </div>
                
                {formData.pricing!.deposits.length > 0 && (
                  <div className="space-y-3 mb-4">
                    {formData.pricing!.deposits.map((deposit) => (
                      <div key={deposit.id} className="grid grid-cols-12 gap-3 items-start p-3 bg-green-50 rounded-lg border border-green-200">
                        <div className="col-span-3">
                          <label className="block text-xs font-medium text-gray-700 mb-1">Amount ($)</label>
                          <input
                            type="number"
                            placeholder="0.00"
                            value={deposit.amount || ''}
                            onChange={(e) => updateDeposit(deposit.id, { amount: parseFloat(e.target.value) || 0 })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            step="0.01"
                            min="0"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs font-medium text-gray-700 mb-1">Method</label>
                          <select
                            value={deposit.method}
                            onChange={(e) => updateDeposit(deposit.id, { method: e.target.value as PaymentMethod })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                          >
                            <option value="cash">Cash</option>
                            <option value="credit_card">Credit Card</option>
                            <option value="check">Check</option>
                            <option value="bank_transfer">Bank Transfer</option>
                            <option value="venmo">Venmo</option>
                            <option value="paypal">PayPal</option>
                            <option value="zelle">Zelle</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs font-medium text-gray-700 mb-1">Date</label>
                          <input
                            type="date"
                            value={deposit.date}
                            onChange={(e) => updateDeposit(deposit.id, { date: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                          />
                        </div>
                        <div className="col-span-4">
                          <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="Payment notes..."
                              value={deposit.notes || ''}
                              onChange={(e) => updateDeposit(deposit.id, { notes: e.target.value })}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                            />
                            <button
                              type="button"
                              onClick={() => removeDeposit(deposit.id)}
                              className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                              title="Remove deposit"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Deposit Summary */}
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-sm text-gray-600">Total Deposits</div>
                      <div className="text-lg font-bold text-green-600">
                        ${formData.pricing!.deposits.reduce((sum, deposit) => sum + deposit.amount, 0).toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Total Due</div>
                      <div className="text-lg font-bold text-blue-600">
                        ${formData.pricing!.total.toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Remaining Balance</div>
                      <div className={`text-lg font-bold ${
                        formData.pricing!.remainingBalance <= 0 ? 'text-green-600' : 'text-orange-600'
                      }`}>
                        ${formData.pricing!.remainingBalance.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pricing Summary */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Calculator className="h-5 w-5 text-blue-600" />
                  Pricing Summary
                </h3>
                <div className="space-y-3">
                  {/* Menu Items Subtotal */}
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Menu Items Subtotal:</span>
                    <span className="font-medium">${formData.pricing!.menuItems.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2)}</span>
                  </div>
                  {/* Guest Services Subtotal */}
                  {formData.pricing!.personCount > 0 && formData.pricing!.pricePerPerson > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Guest Services ({formData.pricing!.personCount} × ${formData.pricing!.pricePerPerson.toFixed(2)}):</span>
                      <span className="font-medium">${(formData.pricing!.personCount * formData.pricing!.pricePerPerson).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="border-t border-gray-300 pt-2">
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-800">Total Subtotal:</span>
                      <span className="font-bold text-lg">${formData.pricing!.subtotal.toFixed(2)}</span>
                    </div>
                  </div>
                  {formData.pricing!.discount.amount > 0 && (
                    <div className="flex justify-between text-sm text-red-600">
                      <span>Discount:</span>
                      <span>-${formData.pricing!.discount.amount.toFixed(2)}</span>
                    </div>
                  )}
                  {formData.pricing!.includeTax && (
                    <div className="flex justify-between text-sm">
                      <span>Tax ({(formData.pricing!.taxRate * 100).toFixed(1)}%):</span>
                      <span>${formData.pricing!.taxAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="border-t-2 border-gray-400 pt-3 mt-2">
                    <div className="flex justify-between text-xl font-bold text-gray-900">
                      <span>Final Total:</span>
                      <span className="text-green-600">${formData.pricing!.total.toFixed(2)}</span>
                    </div>
                  </div>
                  
                  {/* Payment Status Summary */}
                  {formData.pricing!.deposits.length > 0 && (
                    <div className="border-t border-gray-300 pt-3 mt-3">
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Total Deposits Paid:</span>
                        <span className="font-medium">${formData.pricing!.amountPaid.toFixed(2)}</span>
                      </div>
                      <div className={`flex justify-between text-lg font-bold mt-1 ${
                        formData.pricing!.remainingBalance <= 0 ? 'text-green-600' : 'text-orange-600'
                      }`}>
                        <span>Remaining Balance:</span>
                        <span>${formData.pricing!.remainingBalance.toFixed(2)}</span>
                      </div>
                      {formData.pricing!.remainingBalance <= 0 && (
                        <div className="text-center mt-2">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            ✅ Fully Paid
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Deposit Details */}
                  {formData.pricing!.deposits.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-gray-200">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Deposit History:</h4>
                      <div className="space-y-1">
                        {formData.pricing!.deposits.map((deposit, index) => (
                          <div key={deposit.id} className="flex justify-between text-xs text-gray-600">
                            <span>
                              Deposit #{index + 1} ({deposit.method.replace('_', ' ')})
                              {deposit.notes && ` - ${deposit.notes}`}
                            </span>
                            <span className="font-medium">${deposit.amount.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Email Actions */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Email Actions</h3>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => sendEmail('schedule')}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                  >
                    <Mail className="h-4 w-4" />
                    Send Schedule
                  </button>
                  <button
                    type="button"
                    onClick={() => generatePDFInvoice()}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
                  >
                    <Download className="h-4 w-4" />
                    Send PDF Invoice
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Invoice Preview Tab */}
          {activeTab === 'invoice' && (
            <div className="space-y-6">
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Invoice Preview</h3>
                    {formData.pricing!.deposits.length > 0 && (
                      <p className="text-sm text-gray-600 mt-1">
                        Shows deposits and payment information
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => generatePDFInvoice()}
                      className="flex items-center gap-2 px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-sm"
                    >
                      <Printer className="h-4 w-4" />
                      Print
                    </button>
                    <button
                      type="button"
                      onClick={() => generatePDFInvoice()}
                      className="flex items-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors text-sm"
                    >
                      <Download className="h-4 w-4" />
                      Download PDF
                    </button>
                  </div>
                </div>
                
                {/* Invoice Content */}
                <div className="space-y-6">
                  {/* Header */}
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex flex-col items-start">
                      <img
                        src={settings.logo ? (settings.logo.startsWith('data:') ? settings.logo : '/assets/default-logo.png') : '/assets/default-logo.png'}
                        alt="Logo"
                        className="w-20 h-20 object-contain mb-3"
                      />
                      <div className="text-left">
                        <p className="font-bold text-gray-900 text-lg">{settings.storeName}</p>
                        {settings.storeAddress && <p className="text-sm text-gray-600">{settings.storeAddress}</p>}
                        {settings.storePhone && <p className="text-sm text-gray-600">Phone: {settings.storePhone}</p>}
                        {settings.storeEmail && <p className="text-sm text-gray-600">Email: {settings.storeEmail}</p>}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Invoice Date:</p>
                      <p className="font-medium">{new Date().toLocaleDateString()}</p>
                      <p className="text-sm text-gray-600 mt-2">Event Date:</p>
                      <p className="font-medium">{new Date(formData.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  
                  {/* Invoice Title */}
                  <div className="text-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">INVOICE</h1>
                    <p className="text-gray-600 mt-1">Event Management Services</p>
                  </div>

                  {/* Two Column Layout for Bill To and Event Details */}
                  <div className="flex gap-8 mb-6">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-2">Bill To:</h3>
                      <div className="text-gray-700">
                        <p className="font-medium">{formData.contact.name}</p>
                        <p>{formData.contact.email}</p>
                        <p>{formData.contact.phone}</p>
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-2">Event Details:</h3>
                      <div className="text-gray-700">
                        <p><span className="font-medium">Event:</span> {formData.title}</p>
                        <p><span className="font-medium">Date:</span> {new Date(formData.date).toLocaleDateString()}</p>
                        <p><span className="font-medium">Time:</span> {formatTo12Hour(formData.startTime)} - {formatTo12Hour(formData.endTime)}</p>
                        <p><span className="font-medium">Venue:</span> {venues.find(v => v.id === formData.venueId)?.name}</p>
                      </div>
                    </div>
                  </div>

                  {/* Services */}
                  <div className="border-t border-gray-200 pt-4">
                    <h3 className="font-semibold text-gray-900 mb-4">Services:</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse border border-gray-300">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="border border-gray-300 px-4 py-2 text-left">Description</th>
                            <th className="border border-gray-300 px-4 py-2 text-center">Quantity</th>
                            <th className="border border-gray-300 px-4 py-2 text-right">Unit Price</th>
                            <th className="border border-gray-300 px-4 py-2 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {formData.pricing!.personCount > 0 && formData.pricing!.pricePerPerson > 0 && (
                            <tr>
                              <td className="border border-gray-300 px-4 py-2">Guest Services</td>
                              <td className="border border-gray-300 px-4 py-2 text-center">{formData.pricing!.personCount}</td>
                              <td className="border border-gray-300 px-4 py-2 text-right">${formData.pricing!.pricePerPerson.toFixed(2)}</td>
                              <td className="border border-gray-300 px-4 py-2 text-right">${(formData.pricing!.personCount * formData.pricing!.pricePerPerson).toFixed(2)}</td>
                            </tr>
                          )}
                          {formData.pricing!.menuItems.map((item) => (
                            <tr key={item.id}>
                              <td className="border border-gray-300 px-4 py-2">
                                {item.name}{item.description && <span className="text-blue-900"> ({item.description})</span>}
                              </td>
                              <td className="border border-gray-300 px-4 py-2 text-center">{item.quantity}</td>
                              <td className="border border-gray-300 px-4 py-2 text-right">{item.price > 0 ? `$${item.price.toFixed(2)}` : 'N/A'}</td>
                              <td className="border border-gray-300 px-4 py-2 text-right">{item.price > 0 ? `$${(item.price * item.quantity).toFixed(2)}` : 'Included'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Invoice Totals */}
                  <div className="border-t border-gray-200 pt-4">
                    <div className="w-full max-w-sm ml-auto space-y-3">
                      {/* Menu Items Breakdown */}
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>Menu Items:</span>
                        <span>${formData.pricing!.menuItems.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2)}</span>
                      </div>
                      {/* Guest Services Breakdown */}
                      {formData.pricing!.personCount > 0 && formData.pricing!.pricePerPerson > 0 && (
                        <div className="flex justify-between text-sm text-gray-600">
                          <span>Guest Services ({formData.pricing!.personCount} guests):</span>
                          <span>${(formData.pricing!.personCount * formData.pricing!.pricePerPerson).toFixed(2)}</span>
                        </div>
                      )}
                      <div className="border-t border-gray-300 pt-2">
                        <div className="flex justify-between font-medium">
                          <span>Subtotal:</span>
                          <span>${formData.pricing!.subtotal.toFixed(2)}</span>
                        </div>
                      </div>
                      {formData.pricing!.discount.amount > 0 && (
                        <div className="flex justify-between text-red-600">
                          <span>Discount:</span>
                          <span>-${formData.pricing!.discount.amount.toFixed(2)}</span>
                        </div>
                      )}
                      {formData.pricing!.includeTax && (
                        <div className="flex justify-between">
                          <span>Tax ({(formData.pricing!.taxRate * 100).toFixed(1)}%):</span>
                          <span>${formData.pricing!.taxAmount.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="border-t-2 border-gray-400 pt-3 flex justify-between text-xl font-bold">
                        <span>Final Total:</span>
                        <span className="text-green-600">${formData.pricing!.total.toFixed(2)}</span>
                      </div>
                      
                      {/* Deposit Information in Invoice Preview */}
                      {formData.pricing!.deposits.length > 0 && (
                        <div className="border-t border-gray-300 pt-3 mt-3">
                          <div className="text-sm font-medium text-gray-700 mb-2">Payment Information:</div>
                          {formData.pricing!.deposits.map((deposit, index) => (
                            <div key={deposit.id} className="flex justify-between text-sm text-gray-600 mb-1">
                              <span>Deposit #{index + 1} ({deposit.method.replace('_', ' ')}):</span>
                              <span className="font-medium text-green-600">${deposit.amount.toFixed(2)}</span>
                            </div>
                          ))}
                          <div className="border-t border-gray-200 pt-2 mt-2">
                            <div className="flex justify-between text-sm">
                              <span className="font-medium">Total Paid:</span>
                              <span className="font-medium text-green-600">${formData.pricing!.amountPaid.toFixed(2)}</span>
                            </div>
                            <div className={`flex justify-between text-lg font-bold mt-1 ${
                              formData.pricing!.remainingBalance <= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              <span>Balance Due:</span>
                              <span>${formData.pricing!.remainingBalance.toFixed(2)}</span>
                            </div>
                            {formData.pricing!.remainingBalance <= 0 && (
                              <div className="text-center mt-2">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  ✅ PAID IN FULL
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="border-t border-gray-200 pt-4 text-center text-sm text-gray-600">
                    <p>Thank you for your business!</p>
                    <p className="mt-2">Powered and Designed By Mike Akanan | (313) 938-6666</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {isEditMode ? 'Update Event' : 'Create Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};