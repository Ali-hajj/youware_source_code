import React, { useState, useMemo } from 'react';
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth, startOfYear, endOfYear, parseISO, isWithinInterval } from 'date-fns';
import { Calendar, DollarSign, TrendingUp, TrendingDown, Filter, Download, BarChart3, PieChart, FileText, Printer } from 'lucide-react';
import { useEventStore } from '../store/eventStore';
import { PaymentAnalytics as PaymentAnalyticsType, DateRange } from '../types';

interface PaymentAnalyticsProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PaymentAnalytics: React.FC<PaymentAnalyticsProps> = ({ isOpen, onClose }) => {
  const { events } = useEventStore();
  const [selectedPeriod, setSelectedPeriod] = useState<'daily' | 'monthly' | 'yearly' | 'custom'>('monthly');
  const [customDateRange, setCustomDateRange] = useState<DateRange>({
    start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  });

  const analytics = useMemo((): PaymentAnalyticsType => {
    let filteredEvents = events;

    // Apply date filtering based on selected period
    const now = new Date();
    let dateRange: DateRange;

    switch (selectedPeriod) {
      case 'daily':
        dateRange = {
          start: format(startOfDay(now), 'yyyy-MM-dd'),
          end: format(endOfDay(now), 'yyyy-MM-dd')
        };
        break;
      case 'monthly':
        dateRange = {
          start: format(startOfMonth(now), 'yyyy-MM-dd'),
          end: format(endOfMonth(now), 'yyyy-MM-dd')
        };
        break;
      case 'yearly':
        dateRange = {
          start: format(startOfYear(now), 'yyyy-MM-dd'),
          end: format(endOfYear(now), 'yyyy-MM-dd')
        };
        break;
      case 'custom':
        dateRange = customDateRange;
        break;
    }

    // Filter events by date range
    filteredEvents = events.filter(event => {
      const eventDate = parseISO(event.date);
      return isWithinInterval(eventDate, {
        start: parseISO(dateRange.start),
        end: parseISO(dateRange.end)
      });
    });

    let totalPaid = 0;
    let totalUnpaid = 0;
    let totalDeposits = 0;
    const paymentMethodBreakdown: Record<string, number> = {
      'cash': 0,
      'credit_card': 0,
      'check': 0
    };
    const dailyRevenue: Record<string, number> = {};
    const monthlyRevenue: Record<string, number> = {};
    const yearlyRevenue: Record<string, number> = {};

    filteredEvents.forEach(event => {
      const eventTotal = event.pricing?.total || 0;
      const amountPaid = event.pricing?.amountPaid || 0;
      const deposits = event.pricing?.deposits || [];
      const remainingBalance = event.pricing?.remainingBalance || 0;

      // Calculate deposits total
      const depositTotal = deposits.reduce((sum, deposit) => sum + deposit.amount, 0);
      totalDeposits += depositTotal;

      // If event is marked as paid, the full amount is considered paid
      if (event.paymentStatus === 'paid') {
        totalPaid += eventTotal;
      } else {
        // If not fully paid, only count the amount actually paid
        totalPaid += amountPaid;
        totalUnpaid += remainingBalance;
      }

      // Track payment methods from deposits
      deposits.forEach(deposit => {
        if (paymentMethodBreakdown[deposit.method] !== undefined) {
          paymentMethodBreakdown[deposit.method] += deposit.amount;
        } else {
          paymentMethodBreakdown[deposit.method] = deposit.amount;
        }
      });

      // Track revenue by time periods - use the actual amount paid
      const eventDate = event.date;
      const dayKey = eventDate;
      const monthKey = eventDate.substring(0, 7); // YYYY-MM
      const yearKey = eventDate.substring(0, 4); // YYYY

      const revenueAmount = event.paymentStatus === 'paid' ? eventTotal : amountPaid;
      
      dailyRevenue[dayKey] = (dailyRevenue[dayKey] || 0) + revenueAmount;
      monthlyRevenue[monthKey] = (monthlyRevenue[monthKey] || 0) + revenueAmount;
      yearlyRevenue[yearKey] = (yearlyRevenue[yearKey] || 0) + revenueAmount;
    });

    const averageEventValue = filteredEvents.length > 0 
      ? (totalPaid + totalUnpaid) / filteredEvents.length 
      : 0;

    return {
      totalPaid,
      totalUnpaid,
      totalDeposits,
      averageEventValue,
      paymentMethodBreakdown,
      dailyRevenue,
      monthlyRevenue,
      yearlyRevenue
    };
  }, [events, selectedPeriod, customDateRange]);

  const getCurrentPeriodData = () => {
    switch (selectedPeriod) {
      case 'daily':
        return Object.entries(analytics.dailyRevenue).map(([date, revenue]) => ({
          period: format(parseISO(date), 'MMM dd'),
          revenue
        }));
      case 'monthly':
        return Object.entries(analytics.monthlyRevenue).map(([month, revenue]) => ({
          period: format(parseISO(`${month}-01`), 'MMM yyyy'),
          revenue
        }));
      case 'yearly':
        return Object.entries(analytics.yearlyRevenue).map(([year, revenue]) => ({
          period: year,
          revenue
        }));
      case 'custom':
        return Object.entries(analytics.dailyRevenue).map(([date, revenue]) => ({
          period: format(parseISO(date), 'MMM dd'),
          revenue
        }));
      default:
        return [];
    }
  };

  const periodData = getCurrentPeriodData();
  const maxRevenue = Math.max(...periodData.map(d => d.revenue), 1);

  const exportData = () => {
    const csvContent = [
      ['Period', 'Revenue'],
      ...periodData.map(d => [d.period, d.revenue.toFixed(2)])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `payment_analytics_${selectedPeriod}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    // Create a comprehensive analytics report
    const reportDate = format(new Date(), 'MMMM dd, yyyy');
    const reportTitle = `Payment Analytics Report - ${selectedPeriod.charAt(0).toUpperCase() + selectedPeriod.slice(1)}`;
    
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <title>${reportTitle}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
    .metrics { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 30px; }
    .metric-card { border: 1px solid #ddd; padding: 20px; border-radius: 8px; }
    .metric-value { font-size: 2em; font-weight: bold; color: #333; }
    .metric-label { color: #666; font-size: 0.9em; }
    .table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    .table th, .table td { border: 1px solid #ddd; padding: 12px; text-align: left; }
    .table th { background-color: #f5f5f5; font-weight: bold; }
    .summary { background-color: #f8f9fa; padding: 20px; border-radius: 8px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${reportTitle}</h1>
    <p>Generated on ${reportDate}</p>
  </div>
  
  <div class="metrics">
    <div class="metric-card">
      <div class="metric-value">$${analytics.totalPaid.toFixed(2)}</div>
      <div class="metric-label">Total Paid</div>
    </div>
    <div class="metric-card">
      <div class="metric-value">$${analytics.totalUnpaid.toFixed(2)}</div>
      <div class="metric-label">Total Unpaid</div>
    </div>
    <div class="metric-card">
      <div class="metric-value">$${analytics.totalDeposits.toFixed(2)}</div>
      <div class="metric-label">Total Deposits</div>
    </div>
    <div class="metric-card">
      <div class="metric-value">$${analytics.averageEventValue.toFixed(2)}</div>
      <div class="metric-label">Average Event Value</div>
    </div>
  </div>

  <h2>Revenue by Period</h2>
  <table class="table">
    <thead>
      <tr><th>Period</th><th>Revenue</th></tr>
    </thead>
    <tbody>
      ${periodData.map(d => `<tr><td>${d.period}</td><td>$${d.revenue.toFixed(2)}</td></tr>`).join('')}
    </tbody>
  </table>

  <h2>Payment Methods Breakdown</h2>
  <table class="table">
    <thead>
      <tr><th>Method</th><th>Amount</th><th>Percentage</th></tr>
    </thead>
    <tbody>
      ${Object.entries(analytics.paymentMethodBreakdown).map(([method, amount]) => {
        const percentage = analytics.totalDeposits > 0 ? ((amount / analytics.totalDeposits) * 100).toFixed(1) : '0.0';
        return `<tr><td>${method.replace('_', ' ').toUpperCase()}</td><td>$${amount.toFixed(2)}</td><td>${percentage}%</td></tr>`;
      }).join('')}
    </tbody>
  </table>

  <div class="summary">
    <h3>Summary Statistics</h3>
    <p><strong>Collection Rate:</strong> ${analytics.totalPaid > 0 && analytics.totalUnpaid > 0 
      ? ((analytics.totalPaid / (analytics.totalPaid + analytics.totalUnpaid)) * 100).toFixed(1)
      : '0.0'}%</p>
    <p><strong>Total Revenue:</strong> $${(analytics.totalPaid + analytics.totalUnpaid).toFixed(2)}</p>
    <p><strong>Events in Period:</strong> ${periodData.length}</p>
  </div>
</body>
</html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `payment_analytics_${selectedPeriod}_${format(new Date(), 'yyyy-MM-dd')}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const printReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const reportDate = format(new Date(), 'MMMM dd, yyyy');
    const reportTitle = `Payment Analytics Report - ${selectedPeriod.charAt(0).toUpperCase() + selectedPeriod.slice(1)}`;
    
    printWindow.document.write(`
<!DOCTYPE html>
<html>
<head>
  <title>${reportTitle}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
    .metrics { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 30px; }
    .metric-card { border: 1px solid #ddd; padding: 20px; border-radius: 8px; }
    .metric-value { font-size: 2em; font-weight: bold; color: #333; }
    .metric-label { color: #666; font-size: 0.9em; }
    .table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    .table th, .table td { border: 1px solid #ddd; padding: 12px; text-align: left; }
    .table th { background-color: #f5f5f5; font-weight: bold; }
    .summary { background-color: #f8f9fa; padding: 20px; border-radius: 8px; }
    @media print { body { margin: 0; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>${reportTitle}</h1>
    <p>Generated on ${reportDate}</p>
  </div>
  
  <div class="metrics">
    <div class="metric-card">
      <div class="metric-value">$${analytics.totalPaid.toFixed(2)}</div>
      <div class="metric-label">Total Paid</div>
    </div>
    <div class="metric-card">
      <div class="metric-value">$${analytics.totalUnpaid.toFixed(2)}</div>
      <div class="metric-label">Total Unpaid</div>
    </div>
    <div class="metric-card">
      <div class="metric-value">$${analytics.totalDeposits.toFixed(2)}</div>
      <div class="metric-label">Total Deposits</div>
    </div>
    <div class="metric-card">
      <div class="metric-value">$${analytics.averageEventValue.toFixed(2)}</div>
      <div class="metric-label">Average Event Value</div>
    </div>
  </div>

  <h2>Revenue by Period</h2>
  <table class="table">
    <thead>
      <tr><th>Period</th><th>Revenue</th></tr>
    </thead>
    <tbody>
      ${periodData.map(d => `<tr><td>${d.period}</td><td>$${d.revenue.toFixed(2)}</td></tr>`).join('')}
    </tbody>
  </table>

  <h2>Payment Methods Breakdown</h2>
  <table class="table">
    <thead>
      <tr><th>Method</th><th>Amount</th><th>Percentage</th></tr>
    </thead>
    <tbody>
      ${Object.entries(analytics.paymentMethodBreakdown).map(([method, amount]) => {
        const percentage = analytics.totalDeposits > 0 ? ((amount / analytics.totalDeposits) * 100).toFixed(1) : '0.0';
        return `<tr><td>${method.replace('_', ' ').toUpperCase()}</td><td>$${amount.toFixed(2)}</td><td>${percentage}%</td></tr>`;
      }).join('')}
    </tbody>
  </table>

  <div class="summary">
    <h3>Summary Statistics</h3>
    <p><strong>Collection Rate:</strong> ${analytics.totalPaid > 0 && analytics.totalUnpaid > 0 
      ? ((analytics.totalPaid / (analytics.totalPaid + analytics.totalUnpaid)) * 100).toFixed(1)
      : '0.0'}%</p>
    <p><strong>Total Revenue:</strong> $${(analytics.totalPaid + analytics.totalUnpaid).toFixed(2)}</p>
    <p><strong>Events in Period:</strong> ${periodData.length}</p>
  </div>
</body>
</html>
    `);
    
    printWindow.document.close();
    printWindow.print();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-6 w-6 text-amber-600" />
            <div>
              <h2 className="text-xl font-bold text-slate-800">Payment Analytics</h2>
              <p className="text-slate-600">Revenue and payment insights</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={exportData}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </button>
              <button
                onClick={exportPDF}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                <FileText className="h-4 w-4" />
                Export PDF
              </button>
              <button
                onClick={printReport}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
              >
                <Printer className="h-4 w-4" />
                Print
              </button>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-600 hover:text-slate-800 transition-colors"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Period Selection */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <Filter className="h-5 w-5 text-slate-500" />
              <div className="flex gap-2">
                {(['daily', 'monthly', 'yearly', 'custom'] as const).map(period => (
                  <button
                    key={period}
                    onClick={() => setSelectedPeriod(period)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      selectedPeriod === period
                        ? 'bg-amber-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {period.charAt(0).toUpperCase() + period.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {selectedPeriod === 'custom' && (
              <div className="flex items-center gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={customDateRange.start}
                    onChange={(e) => setCustomDateRange(prev => ({ ...prev, start: e.target.value }))}
                    className="p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={customDateRange.end}
                    onChange={(e) => setCustomDateRange(prev => ({ ...prev, end: e.target.value }))}
                    className="p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-green-50 p-6 rounded-lg border border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-800">Total Paid</p>
                  <p className="text-2xl font-bold text-green-900">${analytics.totalPaid.toFixed(2)}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </div>

            <div className="bg-red-50 p-6 rounded-lg border border-red-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-800">Total Unpaid</p>
                  <p className="text-2xl font-bold text-red-900">${analytics.totalUnpaid.toFixed(2)}</p>
                </div>
                <TrendingDown className="h-8 w-8 text-red-600" />
              </div>
            </div>

            <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-800">Total Deposits</p>
                  <p className="text-2xl font-bold text-blue-900">${analytics.totalDeposits.toFixed(2)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-blue-600" />
              </div>
            </div>

            <div className="bg-amber-50 p-6 rounded-lg border border-amber-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-amber-800">Avg Event Value</p>
                  <p className="text-2xl font-bold text-amber-900">${analytics.averageEventValue.toFixed(2)}</p>
                </div>
                <BarChart3 className="h-8 w-8 text-amber-600" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Revenue Chart */}
            <div className="bg-white border border-slate-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Revenue Trend</h3>
              <div className="space-y-3">
                {periodData.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <Calendar className="h-12 w-12 mx-auto mb-3 text-slate-400" />
                    <p>No revenue data for selected period</p>
                  </div>
                ) : (
                  periodData.map((data, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-slate-700">{data.period}</span>
                          <span className="text-sm font-semibold text-slate-900">${data.revenue.toFixed(2)}</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2">
                          <div
                            className="bg-amber-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${(data.revenue / maxRevenue) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Payment Method Breakdown */}
            <div className="bg-white border border-slate-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Payment Methods</h3>
              <div className="space-y-4">
                {Object.entries(analytics.paymentMethodBreakdown).map(([method, amount]) => {
                  const percentage = analytics.totalDeposits > 0 ? (amount / analytics.totalDeposits) * 100 : 0;
                  const methodColors = {
                    cash: 'bg-green-500',
                    credit_card: 'bg-blue-500',
                    check: 'bg-purple-500'
                  };
                  
                  return (
                    <div key={method} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded ${methodColors[method as keyof typeof methodColors]}`} />
                        <span className="text-sm font-medium text-slate-700 capitalize">
                          {method.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-slate-900">${amount.toFixed(2)}</p>
                        <p className="text-xs text-slate-500">{percentage.toFixed(1)}%</p>
                      </div>
                    </div>
                  );
                })}
                
                {analytics.totalDeposits === 0 && (
                  <div className="text-center py-4 text-slate-500">
                    <PieChart className="h-8 w-8 mx-auto mb-2 text-slate-400" />
                    <p className="text-sm">No payment data available</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="mt-8 p-6 bg-slate-50 rounded-lg">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-slate-900">
                  {analytics.totalPaid > 0 && analytics.totalUnpaid > 0 
                    ? ((analytics.totalPaid / (analytics.totalPaid + analytics.totalUnpaid)) * 100).toFixed(1)
                    : '0.0'
                  }%
                </p>
                <p className="text-sm text-slate-600">Collection Rate</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-slate-900">
                  ${(analytics.totalPaid + analytics.totalUnpaid).toFixed(2)}
                </p>
                <p className="text-sm text-slate-600">Total Revenue</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-slate-900">
                  {periodData.length}
                </p>
                <p className="text-sm text-slate-600">Events in Period</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};