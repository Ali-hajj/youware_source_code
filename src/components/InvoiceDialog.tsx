import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { X, Download, Mail, Plus, Minus, DollarSign, Calculator, Calendar, User, FileText, Printer } from 'lucide-react';
import { useEventStore } from '../store/eventStore';
import { Event, InvoiceData, MenuItem, PaymentRecord } from '../types';
import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

interface InvoiceDialogProps {
  event: Event;
  isOpen: boolean;
  onClose: () => void;
}

export const InvoiceDialog: React.FC<InvoiceDialogProps> = ({ event, isOpen, onClose }) => {
  const { settings, updateEvent } = useEventStore();
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);
  const [lineItems, setLineItems] = useState<MenuItem[]>([]);
  const [deposits, setDeposits] = useState<PaymentRecord[]>([]);
  const [editingMode, setEditingMode] = useState(false);
  const [taxRate, setTaxRate] = useState(8.5);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [emailRecipient, setEmailRecipient] = useState('');
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  useEffect(() => {
    if (isOpen && event) {
      initializeInvoiceData();
    }
  }, [isOpen, event]);

  const initializeInvoiceData = () => {
    const invoiceNumber = `INV-${event.id.slice(-6).toUpperCase()}`;
    const issueDate = new Date().toISOString().split('T')[0];
    const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Initialize with existing pricing data if available
    const existingLineItems = event.pricing?.menuItems || [
      { id: '1', name: 'Event Package', price: 250, quantity: 1, description: 'Base event package' }
    ];

    const existingDeposits = event.pricing?.deposits || [];

    setLineItems(existingLineItems);
    setDeposits(existingDeposits);
    setEmailRecipient(event.contact.email);

    const subtotal = existingLineItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const taxAmount = (subtotal - discountAmount) * (taxRate / 100);
    const total = subtotal - discountAmount + taxAmount;
    const amountPaid = existingDeposits.reduce((sum, deposit) => sum + deposit.amount, 0);

    const invoiceData: InvoiceData = {
      eventId: event.id,
      invoiceNumber,
      issueDate,
      dueDate,
      customerInfo: {
        name: event.contact.name,
        email: event.contact.email,
        phone: event.contact.phone,
      },
      eventDetails: {
        title: event.title,
        date: format(new Date(event.date), 'MMMM dd, yyyy'),
        time: `${formatTime(event.startTime)} - ${formatTime(event.endTime)}`,
        venue: event.venue
      },
      lineItems: existingLineItems,
      subtotal,
      taxAmount,
      discount: discountAmount,
      total,
      amountPaid,
      remainingBalance: total - amountPaid,
      terms: 'Payment due within 30 days. Late payments may incur fees.'
    };

    setInvoiceData(invoiceData);
  };

  const formatTime = (time: string): string => {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const addLineItem = () => {
    const newItem: MenuItem = {
      id: Date.now().toString(),
      name: '',
      price: 0,
      quantity: 1,
      description: ''
    };
    setLineItems([...lineItems, newItem]);
  };

  const updateLineItem = (id: string, field: string, value: any) => {
    setLineItems(lineItems.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const removeLineItem = (id: string) => {
    setLineItems(lineItems.filter(item => item.id !== id));
  };

  const addDeposit = () => {
    const newDeposit: PaymentRecord = {
      id: Date.now().toString(),
      amount: 0,
      method: 'cash',
      date: new Date().toISOString().split('T')[0],
      notes: ''
    };
    setDeposits([...deposits, newDeposit]);
  };

  const updateDeposit = (id: string, field: string, value: any) => {
    setDeposits(deposits.map(deposit => 
      deposit.id === id ? { ...deposit, [field]: value } : deposit
    ));
  };

  const removeDeposit = (id: string) => {
    setDeposits(deposits.filter(deposit => deposit.id !== id));
  };

  const calculateInvoiceDetails = () => {
    const subtotal = lineItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const taxAmount = (subtotal - discountAmount) * (taxRate / 100);
    const total = subtotal - discountAmount + taxAmount;
    const amountPaid = deposits.reduce((sum, deposit) => sum + deposit.amount, 0);
    const remainingBalance = total - amountPaid;

    return { subtotal, taxAmount, total, amountPaid, remainingBalance };
  };

  const saveInvoiceData = () => {
    const { subtotal, taxAmount, total, amountPaid, remainingBalance } = calculateInvoiceDetails();

    const updatedPricing = {
      mode: 'custom' as const,
      menuItems: lineItems,
      personCount: 0,
      pricePerPerson: 0,
      customPlatters: [],
      subtotal,
      discount: { type: 'fixed' as const, value: discountAmount, amount: discountAmount },
      taxRate,
      taxAmount,
      includeTax: true,
      total,
      deposits,
      amountPaid,
      remainingBalance
    };

    updateEvent(event.id, { 
      pricing: updatedPricing,
      paymentStatus: remainingBalance <= 0 ? 'paid' : 'unpaid'
    });

    setEditingMode(false);
  };

  const generatePDF = async () => {
    if (!invoiceData) return;

    setIsGeneratingPDF(true);
    const startTime = Date.now();

    console.log('📄 Starting PDF generation for invoice:', {
      invoiceNumber: invoiceData.invoiceNumber,
      customer: invoiceData.customerInfo.name,
      total: invoiceData.total
    });

    try {
      const config = globalThis.ywConfig?.ai_config?.pdf_content_generator;
      if (!config) {
        throw new Error('PDF generator configuration not found');
      }

      const openai = createOpenAI({
        baseURL: 'https://api.youware.com/public/v1/ai',
        apiKey: 'sk-YOUWARE'
      });

      const businessInfo = `${settings.storeName}, ${settings.storeEmail}, ${settings.storePhone}`;
      
      const { text: htmlContent } = await generateText({
        model: openai(config.model),
        messages: [
          {
            role: 'system',
            content: config.system_prompt({
              documentType: 'invoice',
              businessInfo
            })
          },
          {
            role: 'user',
            content: `Generate a professional HTML invoice document with the following data:
            
Business: ${settings.storeName}
Address: ${settings.storeAddress}
Contact: ${settings.storeEmail}, ${settings.storePhone}

Invoice: ${invoiceData.invoiceNumber}
Date: ${invoiceData.issueDate}
Due Date: ${invoiceData.dueDate}

Customer: ${invoiceData.customerInfo.name}
Email: ${invoiceData.customerInfo.email}
Phone: ${invoiceData.customerInfo.phone}

Event: ${invoiceData.eventDetails.title}
Date: ${invoiceData.eventDetails.date}
Time: ${invoiceData.eventDetails.time}
Venue: ${invoiceData.eventDetails.venue}

Line Items:
${invoiceData.lineItems.map(item => `- ${item.name}: $${item.price.toFixed(2)} x ${item.quantity} = $${(item.price * item.quantity).toFixed(2)}`).join('\n')}

Subtotal: $${invoiceData.subtotal.toFixed(2)}
Discount: $${invoiceData.discount.toFixed(2)}
Tax (${taxRate}%): $${invoiceData.taxAmount.toFixed(2)}
Total: $${invoiceData.total.toFixed(2)}

Deposits Paid:
${deposits.map(dep => `- ${dep.date}: $${dep.amount.toFixed(2)} (${dep.method})`).join('\n')}
Amount Paid: $${invoiceData.amountPaid.toFixed(2)}
Remaining Balance: $${invoiceData.remainingBalance.toFixed(2)}

Terms: ${invoiceData.terms}

Create a professional, printable HTML invoice with proper styling, company branding, and clear layout.`
          }
        ],
        temperature: config.temperature || 0.3,
        maxTokens: config.maxTokens || 6000
      });

      console.log('✅ PDF content generated successfully:', {
        contentLength: htmlContent.length,
        processingTime: `${Date.now() - startTime}ms`
      });

      // Create a blob with the HTML content and download it
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${invoiceData.invoiceNumber}_${invoiceData.customerInfo.name.replace(/\s+/g, '_')}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

    } catch (error) {
      console.error('❌ PDF generation failed:', {
        error: error.message,
        processingTime: `${Date.now() - startTime}ms`
      });
      alert(`PDF generation failed: ${error.message}`);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const sendInvoiceEmail = async () => {
    if (!invoiceData || !emailRecipient) return;

    setIsSendingEmail(true);
    const startTime = Date.now();

    console.log('📧 Starting invoice email generation:', {
      recipient: emailRecipient,
      invoiceNumber: invoiceData.invoiceNumber,
      customer: invoiceData.customerInfo.name
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

      const businessContext = `${settings.storeName} - Event Management & Catering`;
      
      const { text: emailContent } = await generateText({
        model: openai(config.model),
        messages: [
          {
            role: 'system',
            content: config.system_prompt({
              emailType: 'invoice',
              businessContext
            })
          },
          {
            role: 'user',
            content: `Generate a professional invoice email for:

Business: ${settings.storeName}
Customer: ${invoiceData.customerInfo.name}
Invoice: ${invoiceData.invoiceNumber}
Event: ${invoiceData.eventDetails.title}
Date: ${invoiceData.eventDetails.date}
Total: $${invoiceData.total.toFixed(2)}
Amount Paid: $${invoiceData.amountPaid.toFixed(2)}
Balance Due: $${invoiceData.remainingBalance.toFixed(2)}
Due Date: ${format(new Date(invoiceData.dueDate), 'MMMM dd, yyyy')}

Include:
- Professional subject line
- Friendly greeting
- Invoice details summary
- Payment instructions
- Contact information
- Professional closing

Make it warm but professional, suitable for hospitality business.`
          }
        ],
        temperature: config.temperature || 0.7,
        maxTokens: config.maxTokens || 4000
      });

      console.log('✅ Email content generated successfully:', {
        contentLength: emailContent.length,
        processingTime: `${Date.now() - startTime}ms`
      });

      // Create mailto link with generated content
      const subject = `Invoice ${invoiceData.invoiceNumber} - ${invoiceData.eventDetails.title}`;
      const body = encodeURIComponent(emailContent);
      const mailtoLink = `mailto:${emailRecipient}?subject=${encodeURIComponent(subject)}&body=${body}`;
      
      window.open(mailtoLink);

      alert('Email client opened with generated invoice email content!');

    } catch (error) {
      console.error('❌ Email generation failed:', {
        error: error.message,
        processingTime: `${Date.now() - startTime}ms`
      });
      alert(`Email generation failed: ${error.message}`);
    } finally {
      setIsSendingEmail(false);
    }
  };

  const { subtotal, taxAmount, total, amountPaid, remainingBalance } = calculateInvoiceDetails();

  if (!isOpen || !invoiceData) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6 text-amber-600" />
            <div>
              <h2 className="text-xl font-bold text-slate-800">Invoice</h2>
              <p className="text-slate-600">{invoiceData.invoiceNumber}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setEditingMode(!editingMode)}
              className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors"
            >
              {editingMode ? 'Save Changes' : 'Edit Invoice'}
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-600 hover:text-slate-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Business & Customer Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <h3 className="font-semibold text-slate-800 mb-2">From:</h3>
              <div className="text-slate-600">
                <p className="font-medium">{settings.storeName}</p>
                <p>{settings.storeAddress}</p>
                <p>{settings.storeEmail}</p>
                <p>{settings.storePhone}</p>
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 mb-2">Bill To:</h3>
              <div className="text-slate-600">
                <p className="font-medium">{invoiceData.customerInfo.name}</p>
                <p>{invoiceData.customerInfo.email}</p>
                <p>{invoiceData.customerInfo.phone}</p>
              </div>
            </div>
          </div>

          {/* Invoice Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 p-4 bg-slate-50 rounded-lg">
            <div>
              <p className="text-sm text-slate-600">Invoice Date</p>
              <p className="font-medium">{format(new Date(invoiceData.issueDate), 'MMM dd, yyyy')}</p>
            </div>
            <div>
              <p className="text-sm text-slate-600">Due Date</p>
              <p className="font-medium">{format(new Date(invoiceData.dueDate), 'MMM dd, yyyy')}</p>
            </div>
            <div>
              <p className="text-sm text-slate-600">Event Date</p>
              <p className="font-medium">{invoiceData.eventDetails.date}</p>
            </div>
          </div>

          {/* Event Details */}
          <div className="mb-8">
            <h3 className="font-semibold text-slate-800 mb-4">Event Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg">
              <div>
                <p className="text-sm text-slate-600">Event</p>
                <p className="font-medium">{invoiceData.eventDetails.title}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Time</p>
                <p className="font-medium">{invoiceData.eventDetails.time}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Venue</p>
                <p className="font-medium capitalize">{invoiceData.eventDetails.venue}</p>
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800">Line Items</h3>
              {editingMode && (
                <button
                  onClick={addLineItem}
                  className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Add Item
                </button>
              )}
            </div>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left p-3 text-sm font-medium text-slate-600">Description</th>
                    <th className="text-right p-3 text-sm font-medium text-slate-600">Price</th>
                    <th className="text-center p-3 text-sm font-medium text-slate-600">Qty</th>
                    <th className="text-right p-3 text-sm font-medium text-slate-600">Total</th>
                    {editingMode && <th className="w-10"></th>}
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item, index) => (
                    <tr key={item.id} className="border-t border-slate-200">
                      <td className="p-3">
                        {editingMode ? (
                          <div>
                            <input
                              type="text"
                              value={item.name}
                              onChange={(e) => updateLineItem(item.id, 'name', e.target.value)}
                              className="w-full p-2 border border-slate-300 rounded mb-1"
                              placeholder="Item name"
                            />
                            <input
                              type="text"
                              value={item.description || ''}
                              onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                              className="w-full p-2 border border-slate-300 rounded text-sm"
                              placeholder="Description (optional)"
                            />
                          </div>
                        ) : (
                          <div>
                            <p className="font-medium">{item.name}</p>
                            {item.description && <p className="text-sm text-slate-600">{item.description}</p>}
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        {editingMode ? (
                          <input
                            type="number"
                            value={item.price}
                            onChange={(e) => updateLineItem(item.id, 'price', parseFloat(e.target.value) || 0)}
                            className="w-20 p-2 border border-slate-300 rounded text-right"
                            min="0"
                            step="0.01"
                          />
                        ) : (
                          `$${item.price.toFixed(2)}`
                        )}
                      </td>
                      <td className="p-3 text-center">
                        {editingMode ? (
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateLineItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                            className="w-16 p-2 border border-slate-300 rounded text-center"
                            min="1"
                          />
                        ) : (
                          item.quantity
                        )}
                      </td>
                      <td className="p-3 text-right font-medium">
                        ${(item.price * item.quantity).toFixed(2)}
                      </td>
                      {editingMode && (
                        <td className="p-3">
                          <button
                            onClick={() => removeLineItem(item.id)}
                            className="p-1 text-red-600 hover:text-red-800 transition-colors"
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pricing Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            {/* Calculations */}
            <div>
              <h3 className="font-semibold text-slate-800 mb-4">Invoice Summary</h3>
              <div className="space-y-3 p-4 bg-slate-50 rounded-lg">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Discount:</span>
                  <div className="flex items-center gap-2">
                    {editingMode ? (
                      <input
                        type="number"
                        value={discountAmount}
                        onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                        className="w-20 p-1 border border-slate-300 rounded text-right text-sm"
                        min="0"
                        step="0.01"
                      />
                    ) : (
                      <span>-${discountAmount.toFixed(2)}</span>
                    )}
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span>Tax ({taxRate}%):</span>
                  <div className="flex items-center gap-2">
                    {editingMode && (
                      <input
                        type="number"
                        value={taxRate}
                        onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                        className="w-16 p-1 border border-slate-300 rounded text-right text-sm"
                        min="0"
                        max="50"
                        step="0.1"
                      />
                    )}
                    <span>${taxAmount.toFixed(2)}</span>
                  </div>
                </div>
                <div className="border-t border-slate-300 pt-3 font-semibold text-lg">
                  <div className="flex justify-between">
                    <span>Total:</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Payments */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-800">Payments & Deposits</h3>
                {editingMode && (
                  <button
                    onClick={addDeposit}
                    className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    Add Payment
                  </button>
                )}
              </div>
              <div className="space-y-3">
                {deposits.map((deposit) => (
                  <div key={deposit.id} className="p-3 border border-slate-200 rounded-lg">
                    {editingMode ? (
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <input
                            type="date"
                            value={deposit.date}
                            onChange={(e) => updateDeposit(deposit.id, 'date', e.target.value)}
                            className="flex-1 p-2 border border-slate-300 rounded text-sm"
                          />
                          <button
                            onClick={() => removeDeposit(deposit.id)}
                            className="p-2 text-red-600 hover:text-red-800 transition-colors"
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            value={deposit.amount}
                            onChange={(e) => updateDeposit(deposit.id, 'amount', parseFloat(e.target.value) || 0)}
                            className="w-24 p-2 border border-slate-300 rounded text-sm"
                            placeholder="Amount"
                            min="0"
                            step="0.01"
                          />
                          <select
                            value={deposit.method}
                            onChange={(e) => updateDeposit(deposit.id, 'method', e.target.value)}
                            className="flex-1 p-2 border border-slate-300 rounded text-sm"
                          >
                            <option value="cash">Cash</option>
                            <option value="credit_card">Credit Card</option>
                            <option value="check">Check</option>
                          </select>
                        </div>
                        <input
                          type="text"
                          value={deposit.notes || ''}
                          onChange={(e) => updateDeposit(deposit.id, 'notes', e.target.value)}
                          className="w-full p-2 border border-slate-300 rounded text-sm"
                          placeholder="Notes (optional)"
                        />
                      </div>
                    ) : (
                      <div>
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">${deposit.amount.toFixed(2)}</p>
                            <p className="text-sm text-slate-600 capitalize">{deposit.method.replace('_', ' ')}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm">{format(new Date(deposit.date), 'MMM dd, yyyy')}</p>
                          </div>
                        </div>
                        {deposit.notes && (
                          <p className="text-sm text-slate-600 mt-2">{deposit.notes}</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-green-800">Amount Paid:</span>
                    <span className="font-semibold text-green-800">${amountPaid.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className={`font-medium ${remainingBalance > 0 ? 'text-red-800' : 'text-green-800'}`}>
                      Remaining Balance:
                    </span>
                    <span className={`font-semibold ${remainingBalance > 0 ? 'text-red-800' : 'text-green-800'}`}>
                      ${remainingBalance.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="border-t border-slate-200 pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Email Address for Invoice
                </label>
                <input
                  type="email"
                  value={emailRecipient}
                  onChange={(e) => setEmailRecipient(e.target.value)}
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="Enter email address"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={generatePDF}
                  disabled={isGeneratingPDF}
                  className="flex items-center gap-2 px-6 py-3 bg-slate-600 hover:bg-slate-700 disabled:bg-slate-400 text-white rounded-lg font-medium transition-colors"
                >
                  {isGeneratingPDF ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  {isGeneratingPDF ? 'Generating...' : 'Download PDF'}
                </button>
                <button
                  onClick={sendInvoiceEmail}
                  disabled={isSendingEmail || !emailRecipient}
                  className="flex items-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white rounded-lg font-medium transition-colors"
                >
                  {isSendingEmail ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Mail className="h-4 w-4" />
                  )}
                  {isSendingEmail ? 'Generating...' : 'Send Email'}
                </button>
              </div>
            </div>
          </div>

          {editingMode && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Calculator className="h-5 w-5 text-blue-600" />
                  <span className="font-medium text-blue-800">Editing Mode Active</span>
                </div>
                <button
                  onClick={saveInvoiceData}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  Save Changes
                </button>
              </div>
              <p className="text-sm text-blue-700 mt-2">
                Make changes to line items, payments, and pricing. Click "Save Changes" to update the event record.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};