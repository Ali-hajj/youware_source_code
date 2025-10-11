import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, Plus, Edit, Trash2, Palette, Save, Building, RotateCcw, Users, Shield, KeyRound, RefreshCcw, Copy, CheckCircle2, XCircle } from 'lucide-react';
import { useEventStore } from '../store/eventStore';
import { useAuthStore } from '../store/authStore';
import { useLicenseStore } from '../store/licenseStore';
import { Venue, ColorPreset, AppUser, UserRole, License, LicensePlanType, LicenseStatus } from '../types';
import { API_CONFIG, API_ENDPOINTS, apiCall } from '../config/api';

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsDialog: React.FC<SettingsDialogProps> = ({ isOpen, onClose }) => {
  const { 
    settings, 
    venues, 
    colorPresets, 
    updateSettings, 
    uploadLogo, 
    addVenue, 
    updateVenue, 
    deleteVenue,
    resetToDefaults 
  } = useEventStore();
  const { user } = useAuthStore();

  const [activeTab, setActiveTab] = useState<'general' | 'venues' | 'colors' | 'database' | 'users' | 'licenses'>('general');
  const [users, setUsers] = useState<AppUser[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const {
    licenses,
    isLoading: isLoadingLicenses,
    error: licensesError,
    fetchLicenses,
    createLicense,
    updateLicense,
    deleteLicense,
    verifyLicense,
    generateLicense,
    previewSerial,
    autoSerialAvailable,
    clearError: clearLicenseError,
    checkResult,
    clearCheckResult,
  } = useLicenseStore();
  const [isVerifyingSerial, setIsVerifyingSerial] = useState(false);
  const [serialInput, setSerialInput] = useState('');
  const [verificationMessage, setVerificationMessage] = useState<string | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<'success' | 'error' | null>(null);
  const [licenseForm, setLicenseForm] = useState({
    serialNumber: '',
    userName: '',
    planType: 'monthly' as LicensePlanType,
    startDate: new Date().toISOString().slice(0, 10),
    expiryDate: new Date().toISOString().slice(0, 10),
    status: 'active' as LicenseStatus,
    notes: '',
    prefix: '',
    autoGenerate: true,
    randomLength: 4,
  });
  const [editingLicense, setEditingLicense] = useState<License | null>(null);
  const [showLicenseForm, setShowLicenseForm] = useState(false);

  const [editedUser, setEditedUser] = useState<AppUser | null>(null);
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [userForm, setUserForm] = useState({
    username: '',
    password: '',
    role: 'operator' as UserRole,
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
  });
  const [storeName, setStoreName] = useState(settings.storeName);
  const [storeEmail, setStoreEmail] = useState(settings.storeEmail || '');
  const [storePhone, setStorePhone] = useState(settings.storePhone || '');
  const [storeAddress, setStoreAddress] = useState(settings.storeAddress || '');
  const [applicationTitle, setApplicationTitle] = useState(settings.applicationTitle);
  const [applicationSubtitle, setApplicationSubtitle] = useState(settings.applicationSubtitle);
  const [selectedVenue, setSelectedVenue] = useState(settings.selectedVenue || '');
  const [themeColor, setThemeColor] = useState(settings.themeColor);
  const [backgroundColor, setBackgroundColor] = useState(settings.backgroundColor);
  const [textColor, setTextColor] = useState(settings.textColor);
  const [highlightTextColor, setHighlightTextColor] = useState(settings.highlightTextColor);
  const [dbHost, setDbHost] = useState(settings.dbHost || '');
  const [dbUser, setDbUser] = useState(settings.dbUser || '');
  const [dbPassword, setDbPassword] = useState(settings.dbPassword || '');
  const [dbName, setDbName] = useState(settings.dbName || '');
  const [newVenue, setNewVenue] = useState<Partial<Venue>>({ name: '', type: '', color: '#6b7280', icon: '📅' });
  const [editingVenue, setEditingVenue] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importFileInputRef = useRef<HTMLInputElement>(null);

  const canManageUsers = user?.role === 'admin' || user?.role === 'manager';

  const fetchUsers = async () => {
    if (!canManageUsers) return;
    setIsLoadingUsers(true);
    setUsersError(null);
    try {
      console.log('Fetching users from:', API_ENDPOINTS.users);
      const response = await apiCall(API_ENDPOINTS.users);
      console.log('Response status:', response.status, response.ok);
      
      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: 'Failed to fetch users' }));
        console.error('Error response:', data);
        throw new Error(data.error || 'Failed to fetch users');
      }
      
      const data = await response.json();
      console.log('Raw response data:', data);
      
      // Backend returns { users: [...] }, so we need to extract the users array
      const usersArray = data.users || data || [];
      console.log('Users array:', usersArray);
      
      setUsers(usersArray);
    } catch (error) {
      console.error('Fetch users error:', error);
      setUsersError(error instanceof Error ? error.message : 'Failed to fetch users');
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const startCreateLicense = async () => {
    setEditingLicense(null);
    clearLicenseError();

    try {
      const preview = await previewSerial({
        planType: 'monthly',
        randomLength: 4,
      });

      setLicenseForm({
        serialNumber: preview.serialNumber,
        userName: '',
        planType: preview.planType,
        startDate: preview.startDate,
        expiryDate: preview.expiryDate,
        status: 'active',
        notes: '',
        prefix: '',
        autoGenerate: true,
        randomLength: 4,
      });
    } catch (error) {
      console.error('Failed to preview serial', error);
      setLicenseForm({
        serialNumber: '',
        userName: '',
        planType: 'monthly',
        startDate: new Date().toISOString().slice(0, 10),
        expiryDate: new Date().toISOString().slice(0, 10),
        status: 'active',
        notes: '',
        prefix: '',
        autoGenerate: true,
        randomLength: 4,
      });
    }

    setShowLicenseForm(true);
  };

  const startEditLicense = (license: License) => {
    setEditingLicense(license);
    setLicenseForm({
      serialNumber: license.serialNumber,
      userName: license.userName,
      planType: license.planType,
      startDate: license.startDate,
      expiryDate: license.expiryDate,
      status: license.status,
      notes: license.notes ?? '',
      prefix: '',
      autoGenerate: false,
      randomLength: 4,
    });
    clearLicenseError();
    setShowLicenseForm(true);
  };

  const handleSubmitLicense = async (event: React.FormEvent) => {
    event.preventDefault();
    clearLicenseError();
    try {
      if (editingLicense) {
        await updateLicense(editingLicense.id, {
          ...licenseForm,
          autoGenerate: false,
        });
      } else {
        const created = await createLicense({
          ...licenseForm,
          autoGenerate: licenseForm.autoGenerate,
        });
        setLicenseForm((prev) => ({
          ...prev,
          serialNumber: created.serialNumber,
        }));
      }
      await fetchLicenses();
      setShowLicenseForm(false);
      setEditingLicense(null);
    } catch (error) {
      console.error('License save failed', error);
    }
  };

  const handleDeleteLicense = async (license: License) => {
    if (!window.confirm(`Delete license ${license.serialNumber}?`)) {
      return;
    }
    try {
      await deleteLicense(license.id);
      await fetchLicenses();
    } catch (error) {
      console.error('Failed to delete license', error);
    }
  };

  const handleVerifySerial = async () => {
    if (!serialInput.trim()) {
      setVerificationStatus('error');
      setVerificationMessage('Enter a serial number to validate.');
      return;
    }

    setIsVerifyingSerial(true);
    setVerificationMessage(null);
    setVerificationStatus(null);
    clearCheckResult();
    try {
      const result = await verifyLicense(serialInput.trim());
      if (result.valid) {
        setVerificationStatus('success');
        setVerificationMessage(
          `✅ License valid for ${result.user ?? 'unknown user'} until ${result.expiry ?? 'N/A'} (${result.plan ?? 'N/A'})`
        );
      } else {
        setVerificationStatus('error');
        setVerificationMessage(result.reason ?? 'License invalid');
      }
    } catch (error) {
      setVerificationStatus('error');
      setVerificationMessage('License verification failed.');
    } finally {
      setIsVerifyingSerial(false);
    }
  };

  const connectDatabase = async () => {
    if (!dbHost || !dbUser || !dbName) {
      alert('Please provide DB_HOST, DB_USER, and DB_NAME before connecting.');
      return false;
    }

    try {
      const response = await fetch(`${API_CONFIG.base}/api/database/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: dbHost,
          user: dbUser,
          password: dbPassword,
          database: dbName
        })
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.details || error.error || 'Failed to connect to database');
      }

      alert('Database connected successfully.');
      return true;
    } catch (error) {
      console.error('Database connection error:', error);
      alert(`Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  };

  const handleImportSqlFile = async (file: File) => {
    if (!file) return;

    try {
      const sqlContent = await file.text();
      if (!sqlContent.trim()) {
        alert('Selected file is empty.');
        return;
      }

      const response = await fetch(`${API_CONFIG.base}/api/database/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: sqlContent
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.details || error.error || 'Failed to import SQL file');
      }

      alert('SQL file imported successfully.');
    } catch (error) {
      console.error('SQL import error:', error);
      alert(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleExportDatabase = async () => {
    try {
      const response = await fetch(`${API_CONFIG.base}/api/database/export`);
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.details || error.error || 'Failed to export database');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'event_manager.sql';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      alert('Database export started. Check your downloads.');
    } catch (error) {
      console.error('Database export error:', error);
      alert(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleSaveSettings = async () => {
    updateSettings({
      storeName,
      storeEmail,
      storePhone,
      storeAddress,
      applicationTitle,
      applicationSubtitle,
      selectedVenue: selectedVenue || undefined,
      themeColor,
      backgroundColor,
      textColor,
      highlightTextColor,
      dbHost,
      dbUser,
      dbPassword,
      dbName
    });

    if (dbHost && dbUser && dbName) {
      await connectDatabase();
    }

    onClose();
  };

  useEffect(() => {
    if (canManageUsers && activeTab === 'users') {
      fetchUsers();
    }
    if (activeTab === 'licenses') {
      fetchLicenses();
    }
  }, [activeTab, canManageUsers, fetchLicenses]);

  const handleResetToDefaults = () => {
    if (window.confirm('Are you sure you want to reset all settings to default values?')) {
      resetToDefaults();
      setStoreName('My Restaurant');
      setStoreEmail('');
      setStorePhone('');
      setStoreAddress('');
      setApplicationTitle('Event Manager');
      setApplicationSubtitle('Professional Hospitality Event Management');
      setSelectedVenue('');
      setThemeColor('#f59e0b');
      setBackgroundColor('#0f172a');
      setTextColor('#ffffff');
      setHighlightTextColor('#f59e0b');
      setDbHost('');
      setDbUser('');
      setDbPassword('');
      setDbName('');
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadLogo(file);
    }
  };

  const handleResetLogo = () => {
    updateSettings({ logo: '/assets/default-logo.png' });
    alert('Logo reset to default successfully!');
  };

  const handleAddVenue = () => {
    if (newVenue.name && newVenue.type && newVenue.color) {
      addVenue({
        name: newVenue.name,
        type: newVenue.type,
        color: newVenue.color,
        icon: newVenue.icon || '📅'
      });
      setNewVenue({ name: '', type: '', color: '#6b7280', icon: '📅' });
    }
  };

  const handleUpdateVenue = (id: string, updates: Partial<Venue>) => {
    updateVenue(id, updates);
    setEditingVenue(null);
  };

  const handleDeleteVenue = (id: string) => {
    if (window.confirm('Are you sure you want to delete this venue?')) {
      deleteVenue(id);
    }
  };

  const resetUserForm = () => {
    setUserForm({
      username: '',
      password: '',
      role: 'operator',
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
    });
    setEditedUser(null);
    setIsEditingUser(false);
    setCreatingUser(false);
    setUsersError(null);
  };

  const handleEditUser = (user: AppUser) => {
    console.log('USER DATAA',user);
    
    setEditedUser(user);
    setIsEditingUser(true);
    setCreatingUser(false);
    setUserForm({
      username: user.username,
      password: '',
      role: user.role,
      firstName: user["first_name"],
      lastName: user["last_name"],
      phone: user.phone,
      email: user.email,
    });
  };

  const handleSubmitUser = async (event: React.FormEvent) => {
    event.preventDefault();
    setUsersError(null);

    try {
      if (isEditingUser && editedUser) {
        const response = await apiCall(API_ENDPOINTS.userById(editedUser.id), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...userForm,
            password: userForm.password ? userForm.password : undefined,
          }),
        });
        if (!response.ok) {
          const data = await response.json().catch(() => ({ error: 'Failed to update user' }));
          throw new Error(data.error || 'Failed to update user');
        }
      } else {
        const response = await apiCall(API_ENDPOINTS.users, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(userForm),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({ error: 'Failed to create user' }));
          throw new Error(data.error || 'Failed to create user');
        }
      }

      await fetchUsers();
      resetUserForm();
    } catch (error) {
      setUsersError(error instanceof Error ? error.message : 'User action failed');
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    setUsersError(null);

    try {
      const response = await apiCall(API_ENDPOINTS.usersById(id), {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: 'Failed to delete user' }));
        throw new Error(data.error || 'Failed to delete user');
      }

      await fetchUsers();
    } catch (error) {
      setUsersError(error instanceof Error ? error.message : 'Failed to delete user');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-slate-50 to-slate-100 border-slate-200">
          <div>
            <h2 className="text-xl font-semibold text-slate-800">Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex h-[calc(90vh-140px)]">
          {/* Sidebar */}
          <div className="w-48 bg-slate-50 border-r border-slate-200 flex-shrink-0">
            <div className="p-4 space-y-3">
              <button
                onClick={() => setActiveTab('general')}
                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-2 ${
                  activeTab === 'general' 
                    ? 'bg-amber-100 text-amber-700 font-medium' 
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Building className="h-4 w-4" />
                General
              </button>
              <button
                onClick={() => setActiveTab('venues')}
                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-2 ${
                  activeTab === 'venues' 
                    ? 'bg-amber-100 text-amber-700 font-medium' 
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Edit className="h-4 w-4" />
                Venues
              </button>
              <button
                onClick={() => setActiveTab('colors')}
                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-2 ${
                  activeTab === 'colors' 
                    ? 'bg-amber-100 text-amber-700 font-medium' 
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Palette className="h-4 w-4" />
                Theme
              </button>
              {canManageUsers && (
                <button
                  onClick={() => setActiveTab('users')}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-2 ${
                    activeTab === 'users' 
                      ? 'bg-amber-100 text-amber-700 font-medium' 
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Users className="h-4 w-4" />
                  Users
                </button>
              )}
              <button
                onClick={() => setActiveTab('licenses')}
                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-2 ${
                  activeTab === 'licenses' 
                    ? 'bg-amber-100 text-amber-700 font-medium' 
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <KeyRound className="h-4 w-4" />
                Licenses
              </button>
              <button
                onClick={() => setActiveTab('database')}
                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-2 ${
                  activeTab === 'database' 
                    ? 'bg-amber-100 text-amber-700 font-medium' 
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Building className="h-4 w-4" />
                Database
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {/* General Tab */}
            {activeTab === 'general' && (
              <div className="p-6 space-y-6">
                {/* Store Name */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Store Name
                  </label>
                  <input
                    type="text"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="My Restaurant"
                  />
                </div>

                {/* Store Email */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Store Email
                  </label>
                  <input
                    type="email"
                    value={storeEmail}
                    onChange={(e) => setStoreEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="info@myrestaurant.com"
                  />
                  <p className="text-sm text-slate-500 mt-1">
                    This email will appear on invoices
                  </p>
                </div>

                {/* Store Phone */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Store Phone
                  </label>
                  <input
                    type="tel"
                    value={storePhone}
                    onChange={(e) => setStorePhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="(555) 123-4567"
                  />
                  <p className="text-sm text-slate-500 mt-1">
                    This phone number will appear on invoices
                  </p>
                </div>

                {/* Store Address */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Store Address
                  </label>
                  <textarea
                    value={storeAddress}
                    onChange={(e) => setStoreAddress(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="123 Main Street, City, State 12345"
                    rows={3}
                  />
                  <p className="text-sm text-slate-500 mt-1">
                    This address will appear on invoices
                  </p>
                </div>

                {/* Application Title */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Application Title
                  </label>
                  <input
                    type="text"
                    value={applicationTitle}
                    onChange={(e) => setApplicationTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="Event Manager"
                  />
                  <p className="text-sm text-slate-500 mt-1">
                    This appears as the main title in the header
                  </p>
                </div>

                {/* Application Subtitle */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Application Subtitle
                  </label>
                  <input
                    type="text"
                    value={applicationSubtitle}
                    onChange={(e) => setApplicationSubtitle(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="Professional Hospitality Event Management"
                  />
                  <p className="text-sm text-slate-500 mt-1">
                    This appears as the subtitle in the header
                  </p>
                </div>

                {/* Logo Upload */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Logo
                  </label>
                  <div className="flex items-center gap-4">
                    {settings.logo && (
                      <img
                        src={settings.logo}
                        alt="Logo"
                        className="w-16 h-16 object-contain rounded-md border border-slate-200"
                      />
                    )}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-medium transition-colors flex items-center gap-2"
                    >
                      <Upload className="h-4 w-4" />
                      Upload Logo
                    </button>
                    {settings.logo && (
                      <button
                        onClick={handleResetLogo}
                        className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-md font-medium transition-colors flex items-center gap-2"
                      >
                        <RotateCcw className="h-4 w-4" />
                        Reset to Default
                      </button>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                  </div>
                  <p className="text-sm text-slate-500 mt-1">
                    Recommended size: 200x200px, PNG or JPG
                  </p>
                </div>

                {/* Selected Venue */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Default Active Venue
                  </label>
                  <select
                    value={selectedVenue}
                    onChange={(e) => setSelectedVenue(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  >
                    <option value="">All Venues</option>
                    {venues.map((venue) => (
                      <option key={venue.id} value={venue.id}>
                        {venue.icon} {venue.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-sm text-slate-500 mt-1">
                    When selected, this venue will be highlighted in the header
                  </p>
                </div>
              </div>
            )}

            {/* Venues Tab */}
            {activeTab === 'venues' && (
              <div className="p-6 space-y-6">
                {/* Add New Venue */}
                <div className="bg-slate-50 rounded-lg p-4">
                  <h3 className="font-medium text-slate-800 mb-3">Add New Venue</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <input
                      type="text"
                      placeholder="Venue Name"
                      value={newVenue.name || ''}
                      onChange={(e) => setNewVenue({ ...newVenue, name: e.target.value })}
                      className="px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                    <input
                      type="text"
                      placeholder="Type (e.g., private_dining)"
                      value={newVenue.type || ''}
                      onChange={(e) => setNewVenue({ ...newVenue, type: e.target.value })}
                      className="px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={newVenue.color || '#6b7280'}
                        onChange={(e) => setNewVenue({ ...newVenue, color: e.target.value })}
                        className="w-12 h-10 rounded border border-slate-300"
                      />
                      <input
                        type="text"
                        placeholder="🍕"
                        value={newVenue.icon || ''}
                        onChange={(e) => setNewVenue({ ...newVenue, icon: e.target.value })}
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent text-center"
                      />
                    </div>
                    <button
                      onClick={handleAddVenue}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-md font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Add
                    </button>
                  </div>
                </div>

                {/* Existing Venues */}
                <div className="space-y-3">
                  <h3 className="font-medium text-slate-800">Manage Venues</h3>
                  {venues.map((venue) => (
                    <div key={venue.id} className="bg-white border border-slate-200 rounded-lg p-4">
                      {editingVenue === venue.id ? (
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-center">
                          <input
                            type="text"
                            defaultValue={venue.name}
                            onBlur={(e) => handleUpdateVenue(venue.id, { name: e.target.value })}
                            className="px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                          />
                          <input
                            type="text"
                            defaultValue={venue.type}
                            onBlur={(e) => handleUpdateVenue(venue.id, { type: e.target.value })}
                            className="px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                          />
                          <input
                            type="color"
                            defaultValue={venue.color}
                            onChange={(e) => handleUpdateVenue(venue.id, { color: e.target.value })}
                            className="w-full h-10 rounded border border-slate-300"
                          />
                          <input
                            type="text"
                            defaultValue={venue.icon}
                            onBlur={(e) => handleUpdateVenue(venue.id, { icon: e.target.value })}
                            className="px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent text-center"
                          />
                          <button
                            onClick={() => setEditingVenue(null)}
                            className="px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-md text-sm"
                          >
                            Done
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-4 h-4 rounded-full"
                              style={{ backgroundColor: venue.color }}
                            />
                            <span className="text-lg">{venue.icon}</span>
                            <div>
                              <div className="font-medium text-slate-800">{venue.name}</div>
                              <div className="text-sm text-slate-500">{venue.type}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setEditingVenue(venue.id)}
                              className="p-2 text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            {!['restaurant', 'bar', 'banquet'].includes(venue.id) && (
                              <button
                                onClick={() => handleDeleteVenue(venue.id)}
                                className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Licenses Tab */}
            {activeTab === 'licenses' && (
              <div className="p-6 space-y-6">
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 shadow-sm text-sm text-amber-800">
                  <div className="flex items-center gap-2 mb-2 font-semibold text-amber-900">
                    <KeyRound className="h-4 w-4 text-amber-500" />
                    License Management
                  </div>
                  <ul className="space-y-1 leading-relaxed">
                    <li>• Generate and manage activation serials for Python/CUDA apps</li>
                    <li>• Verify license validity before running GPU workloads</li>
                    <li>• Support monthly or yearly billing with remote deactivation</li>
                  </ul>
                </div>

                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 bg-white border border-slate-200 rounded-lg p-4 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-800">Serial Health Check</h3>
                        <p className="text-sm text-slate-500">Confirm entitlement before your Python launcher boots GPU workloads.</p>
                      </div>
                      <p className="text-xs text-slate-500 max-w-sm">
                        The Worker endpoint answers in real time so remote disable or plan downgrades take effect instantly—even on headless rigs.
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <input
                        type="text"
                        value={serialInput}
                        onChange={(e) => setSerialInput(e.target.value)}
                        placeholder="e.g. ABC123-XYZ789"
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent font-mono"
                      />
                      <button
                        onClick={handleVerifySerial}
                        disabled={isVerifyingSerial}
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-md font-medium transition-colors flex items-center gap-2"
                      >
                        {isVerifyingSerial ? (
                          <>
                            <RefreshCcw className="h-4 w-4 animate-spin" />
                            Checking…
                          </>
                        ) : (
                          <>
                            <Shield className="h-4 w-4" />
                            Verify Serial
                          </>
                        )}
                      </button>
                    </div>
                    {verificationMessage && (
                      <div
                        className={`mt-3 px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
                          verificationStatus === 'success'
                            ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                            : 'bg-red-50 border border-red-200 text-red-700'
                        }`}
                      >
                        {verificationStatus === 'success' ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          <XCircle className="h-4 w-4" />
                        )}
                        {verificationMessage}
                      </div>
                    )}
                  </div>
                  <div className="w-full md:w-64 bg-white border border-slate-200 rounded-lg p-4 space-y-3">
                    <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Developer Shortcuts</h4>
                    <button
                      onClick={() => {
                        setSerialInput('ABC123-XYZ789');
                        handleVerifySerial();
                      }}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md hover:bg-slate-50 text-sm flex items-center justify-between"
                    >
                      Sample Yearly Serial
                      <Copy className="h-4 w-4 text-slate-400" />
                    </button>
                    <button
                      onClick={() => {
                        setSerialInput('DEF456-UVW000');
                        handleVerifySerial();
                      }}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md hover:bg-slate-50 text-sm flex items-center justify-between"
                    >
                      Sample Monthly Serial
                      <Copy className="h-4 w-4 text-slate-400" />
                    </button>
                    <div className="text-xs text-slate-500">
                      Python launcher snippet:
                      <pre className="mt-2 bg-slate-900 text-slate-100 rounded-md p-2 text-[11px] overflow-x-auto">
{`if not verify_license("SERIAL-HERE"):
    raise SystemExit("license check failed")`}
                      </pre>
                    </div>
                  </div>
                </div>

                {licensesError && (
                  <div className="px-3 py-2 bg-red-50 border border-red-200 text-sm text-red-700 rounded-lg">
                    {licensesError}
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-800">Issued Licenses</h3>
                    <p className="text-sm text-slate-500">
                      Track active, expired, or disabled keys mapped to each customer contract.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={startCreateLicense}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-md font-medium transition-colors flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      New License
                    </button>
                    <button
                      onClick={fetchLicenses}
                      className="px-4 py-2 border border-slate-300 rounded-md hover:bg-slate-100 transition-colors"
                    >
                      Refresh
                    </button>
                  </div>
                </div>

                {showLicenseForm && (
                  <form onSubmit={handleSubmitLicense} className="bg-white border border-slate-200 rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-slate-700">
                        {editingLicense ? `Edit ${editingLicense.serialNumber}` : 'Create License'}
                      </h4>
                      <button
                        type="button"
                        onClick={() => {
                          setShowLicenseForm(false);
                          setEditingLicense(null);
                        }}
                        className="text-sm text-slate-500 hover:text-slate-700"
                      >
                        Cancel
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-700">Serial Number</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={licenseForm.serialNumber}
                            onChange={(e) => setLicenseForm((prev) => ({ ...prev, serialNumber: e.target.value }))}
                            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-amber-500"
                            placeholder="ABC123-YR-20251002-ABCD"
                            disabled={licenseForm.autoGenerate}
                            required={!licenseForm.autoGenerate}
                          />
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                const preview = await previewSerial({
                                  planType: licenseForm.planType,
                                  userName: licenseForm.userName,
                                  prefix: licenseForm.prefix || undefined,
                                  randomLength: licenseForm.randomLength,
                                  startDate: licenseForm.startDate,
                                  expiryDate: licenseForm.expiryDate,
                                });
                                setLicenseForm((prev) => ({
                                  ...prev,
                                  serialNumber: preview.serialNumber,
                                  startDate: preview.startDate,
                                  expiryDate: preview.expiryDate,
                                }));
                              } catch (error) {
                                console.error('Failed to refresh serial preview', error);
                              }
                            }}
                            className="px-3 py-2 border border-slate-300 rounded-md hover:bg-slate-100 transition-colors text-sm flex items-center gap-2"
                            disabled={!autoSerialAvailable}
                          >
                            <RefreshCcw className="h-4 w-4" />
                            Preview
                          </button>
                        </div>
                        <label className="flex items-center gap-2 text-sm text-slate-600">
                          <input
                            type="checkbox"
                            checked={licenseForm.autoGenerate}
                            onChange={(e) =>
                              setLicenseForm((prev) => ({
                                ...prev,
                                autoGenerate: e.target.checked,
                              }))
                            }
                            disabled={!autoSerialAvailable}
                          />
                          {autoSerialAvailable ? 'Auto-generate serial on save' : 'Manual serial entry required'}
                        </label>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Customer</label>
                        <input
                          type="text"
                          value={licenseForm.userName}
                          onChange={(e) => setLicenseForm((prev) => ({ ...prev, userName: e.target.value }))}
                          className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-amber-500"
                          placeholder="john@example.com"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Plan Type</label>
                        <select
                          value={licenseForm.planType}
                          onChange={(e) => setLicenseForm((prev) => ({
                            ...prev,
                            planType: e.target.value as LicensePlanType,
                          }))}
                          className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-amber-500"
                        >
                          <option value="monthly">Monthly</option>
                          <option value="yearly">Yearly</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
                        <select
                          value={licenseForm.status}
                          onChange={(e) => setLicenseForm((prev) => ({ ...prev, status: e.target.value as LicenseStatus }))}
                          className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-amber-500"
                        >
                          <option value="active">Active</option>
                          <option value="expired">Expired</option>
                          <option value="disabled">Disabled</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Start Date</label>
                        <input
                          type="date"
                          value={licenseForm.startDate}
                          onChange={(e) => setLicenseForm((prev) => ({ ...prev, startDate: e.target.value }))}
                          className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-amber-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Expiry Date</label>
                        <input
                          type="date"
                          value={licenseForm.expiryDate}
                          onChange={(e) => setLicenseForm((prev) => ({ ...prev, expiryDate: e.target.value }))}
                          className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-amber-500"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Notes</label>
                      <textarea
                        value={licenseForm.notes}
                        onChange={(e) => setLicenseForm((prev) => ({ ...prev, notes: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-amber-500"
                        rows={3}
                        placeholder="Custom GPU build, allow remote disable, etc."
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Serial Prefix (Optional)</label>
                        <input
                          type="text"
                          value={licenseForm.prefix}
                          onChange={(e) => setLicenseForm((prev) => ({ ...prev, prefix: e.target.value }))}
                          className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-amber-500"
                          placeholder="CLIENT"
                          disabled={!autoSerialAvailable}
                        />
                        <p className="text-xs text-slate-500 mt-1">Will be uppercased and sanitized automatically.</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Random Segment Length</label>
                        <input
                          type="number"
                          min={2}
                          max={8}
                          value={licenseForm.randomLength}
                          onChange={(e) =>
                            setLicenseForm((prev) => ({
                              ...prev,
                              randomLength: Number.parseInt(e.target.value, 10) || 4,
                            }))
                          }
                          className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-amber-500"
                          disabled={!autoSerialAvailable}
                        />
                        <p className="text-xs text-slate-500 mt-1">Between 2 and 8 characters.</p>
                      </div>
                      <div className="flex items-end">
                        <button
                          type="button"
                          onClick={() => {
                            setLicenseForm({
                              serialNumber: '',
                              userName: '',
                              planType: 'monthly',
                              startDate: new Date().toISOString().slice(0, 10),
                              expiryDate: new Date().toISOString().slice(0, 10),
                              status: 'active',
                              notes: '',
                              prefix: '',
                              autoGenerate: autoSerialAvailable,
                              randomLength: 4,
                            });
                            setEditingLicense(null);
                          }}
                          className="w-full px-4 py-2 border border-slate-300 rounded-md hover:bg-slate-100 transition-colors text-sm"
                        >
                          Reset Form
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setShowLicenseForm(false);
                          setEditingLicense(null);
                        }}
                        className="px-4 py-2 border border-slate-300 rounded-md hover:bg-slate-100 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-md font-medium transition-colors"
                      >
                        {editingLicense ? 'Save Changes' : 'Create License'}
                      </button>
                    </div>
                  </form>
                )}

                <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                  <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-slate-700">License Inventory</h4>
                      <p className="text-xs text-slate-500">Track active, expired, and disabled serials.</p>
                    </div>
                    <div className="text-xs text-slate-500">
                      Total: {licenses.length}
                    </div>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {isLoadingLicenses ? (
                      <div className="p-4 text-center text-sm text-slate-500 flex items-center justify-center gap-2">
                        <RefreshCcw className="h-4 w-4 animate-spin" />
                        Loading licenses…
                      </div>
                    ) : licenses.length === 0 ? (
                      <div className="p-4 text-center text-sm text-slate-500">
                        No licenses issued yet.
                      </div>
                    ) : (
                      <table className="min-w-full text-sm">
                        <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
                          <tr>
                            <th className="px-4 py-3 text-left">Serial</th>
                            <th className="px-4 py-3 text-left">User</th>
                            <th className="px-4 py-3 text-left">Plan</th>
                            <th className="px-4 py-3 text-left">Start</th>
                            <th className="px-4 py-3 text-left">Expiry</th>
                            <th className="px-4 py-3 text-left">Status</th>
                            <th className="px-4 py-3 text-left">Notes</th>
                            <th className="px-4 py-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {licenses.map((license) => (
                            <tr key={license.id} className="hover:bg-slate-50">
                              <td className="px-4 py-3 font-mono text-xs text-slate-600">
                                {license.serialNumber}
                              </td>
                              <td className="px-4 py-3 text-slate-700">
                                {license.userName}
                              </td>
                              <td className="px-4 py-3">
                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 capitalize">
                                  {license.planType}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-slate-500">{license.startDate}</td>
                              <td className="px-4 py-3 text-slate-500">{license.expiryDate}</td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-1 rounded-full text-xs font-semibold capitalize ${
                                  license.status === 'active'
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : license.status === 'expired'
                                    ? 'bg-red-100 text-red-700'
                                    : 'bg-slate-200 text-slate-700'
                                }`}>
                                  {license.status}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-slate-500 max-w-xs truncate" title={license.notes ?? ''}>
                                {license.notes ?? '—'}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => startEditLicense(license)}
                                    className="p-2 rounded-md text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteLicense(license)}
                                    className="p-2 rounded-md text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Colors Tab */}
            {activeTab === 'colors' && (
              <div className="p-6 space-y-6">
                {/* Theme Color */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-3">
                    Application Theme Color
                  </label>
                  <div className="grid grid-cols-6 gap-3">
                    {colorPresets.map((preset) => (
                      <button
                        key={preset.id}
                        onClick={() => setThemeColor(preset.color)}
                        className={`relative p-3 rounded-lg border-2 transition-all ${
                          themeColor === preset.color
                            ? 'border-slate-400 ring-2 ring-slate-200'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div
                          className="w-full h-8 rounded"
                          style={{ backgroundColor: preset.color }}
                        />
                        <div className="text-xs text-slate-600 mt-1 text-center">
                          {preset.name}
                        </div>
                        {themeColor === preset.color && (
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-slate-600 rounded-full border-2 border-white" />
                        )}
                      </button>
                    ))}
                  </div>
                  <div className="mt-3">
                    <input
                      type="color"
                      value={themeColor}
                      onChange={(e) => setThemeColor(e.target.value)}
                      className="w-20 h-10 rounded border border-slate-300"
                    />
                    <span className="ml-3 text-sm text-slate-600">Custom Color: {themeColor}</span>
                  </div>
                </div>

                {/* Background Color */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-3">
                    Application Background Color
                  </label>
                  <div className="grid grid-cols-6 gap-3">
                    {colorPresets.map((preset) => (
                      <button
                        key={`bg-${preset.id}`}
                        onClick={() => setBackgroundColor(preset.color)}
                        className={`relative p-3 rounded-lg border-2 transition-all ${
                          backgroundColor === preset.color
                            ? 'border-slate-400 ring-2 ring-slate-200'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div
                          className="w-full h-8 rounded"
                          style={{ backgroundColor: preset.color }}
                        />
                        <div className="text-xs text-slate-600 mt-1 text-center">
                          {preset.name}
                        </div>
                        {backgroundColor === preset.color && (
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-slate-600 rounded-full border-2 border-white" />
                        )}
                      </button>
                    ))}
                  </div>
                  <div className="mt-3">
                    <input
                      type="color"
                      value={backgroundColor}
                      onChange={(e) => setBackgroundColor(e.target.value)}
                      className="w-20 h-10 rounded border border-slate-300"
                    />
                    <span className="ml-3 text-sm text-slate-600">Custom Background: {backgroundColor}</span>
                  </div>
                </div>

                {/* Text Color */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-3">
                    Text Color
                  </label>
                  <div className="grid grid-cols-6 gap-3">
                    {colorPresets.map((preset) => (
                      <button
                        key={`text-${preset.id}`}
                        onClick={() => setTextColor(preset.color)}
                        className={`relative p-3 rounded-lg border-2 transition-all ${
                          textColor === preset.color
                            ? 'border-slate-400 ring-2 ring-slate-200'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div
                          className="w-full h-8 rounded"
                          style={{ backgroundColor: preset.color }}
                        />
                        <div className="text-xs text-slate-600 mt-1 text-center">
                          {preset.name}
                        </div>
                        {textColor === preset.color && (
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-slate-600 rounded-full border-2 border-white" />
                        )}
                      </button>
                    ))}
                  </div>
                  <div className="mt-3">
                    <input
                      type="color"
                      value={textColor}
                      onChange={(e) => setTextColor(e.target.value)}
                      className="w-20 h-10 rounded border border-slate-300"
                    />
                    <span className="ml-3 text-sm text-slate-600">Custom Text Color: {textColor}</span>
                  </div>
                </div>

                {/* Highlight Text Color */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-3">
                    Highlight Text Color
                  </label>
                  <div className="grid grid-cols-6 gap-3">
                    {colorPresets.map((preset) => (
                      <button
                        key={`highlight-${preset.id}`}
                        onClick={() => setHighlightTextColor(preset.color)}
                        className={`relative p-3 rounded-lg border-2 transition-all ${
                          highlightTextColor === preset.color
                            ? 'border-slate-400 ring-2 ring-slate-200'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div
                          className="w-full h-8 rounded"
                          style={{ backgroundColor: preset.color }}
                        />
                        <div className="text-xs text-slate-600 mt-1 text-center">
                          {preset.name}
                        </div>
                        {highlightTextColor === preset.color && (
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-slate-600 rounded-full border-2 border-white" />
                        )}
                      </button>
                    ))}
                  </div>
                  <div className="mt-3">
                    <input
                      type="color"
                      value={highlightTextColor}
                      onChange={(e) => setHighlightTextColor(e.target.value)}
                      className="w-20 h-10 rounded border border-slate-300"
                    />
                    <span className="ml-3 text-sm text-slate-600">Custom Highlight: {highlightTextColor}</span>
                  </div>
                </div>

                {/* Preview */}
                <div className="bg-slate-50 rounded-lg p-4">
                  <h3 className="font-medium text-slate-800 mb-3">Theme Preview</h3>
                  <div 
                    className="w-full h-32 rounded-lg flex items-center justify-center font-medium relative overflow-hidden"
                    style={{ backgroundColor: backgroundColor }}
                  >
                    <div 
                      className="absolute top-2 right-2 px-3 py-1 rounded text-sm"
                      style={{ backgroundColor: themeColor, color: backgroundColor }}
                    >
                      Theme Color
                    </div>
                    <div className="text-center">
                      <div 
                        className="text-xl font-semibold"
                        style={{ color: textColor }}
                      >
                        {applicationTitle || 'Event Manager'}
                      </div>
                      <div 
                        className="text-sm opacity-80 mt-1"
                        style={{ color: textColor }}
                      >
                        {applicationSubtitle || 'Professional Hospitality Event Management'}
                      </div>
                      <div 
                        className="text-sm mt-2 font-medium"
                        style={{ color: highlightTextColor }}
                      >
                        Highlight Color Sample
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {activeTab === 'users' && canManageUsers && (
              <div className="p-6 space-y-6">
                <div className="bg-orange-50 border border-orange-300 rounded-xl p-4 shadow-sm text-sm text-orange-800">
                  <div className="flex items-center gap-2 mb-2 font-semibold text-orange-900">
                    <Shield className="h-4 w-4 text-orange-500" />
                    Role Permissions
                  </div>
                  <ul className="space-y-1 leading-relaxed">
                    <li>• Admin &amp; Manager can delete events</li>
                    <li>• Managers manage host &amp; operator accounts</li>
                    <li>• Each user badge follows EVN### numbering</li>
                  </ul>
                </div>

                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-800">Users</h3>
                    <p className="text-sm text-slate-500">
                      Manage team members and their roles.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        resetUserForm();
                        setCreatingUser(true);
                      }}
                      className="px-4 py-2 rounded-md font-medium transition-colors flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white"
                    >
                      <Plus className="h-4 w-4" />
                      New User
                    </button>
                    <button
                      onClick={fetchUsers}
                      className="px-4 py-2 border border-slate-300 rounded-md hover:bg-slate-100 transition-colors"
                    >
                      Refresh
                    </button>
                  </div>
                </div>

                {(usersError) && (
                  <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                    {usersError}
                  </div>
                )}

                {(creatingUser || isEditingUser) && (
                  <form onSubmit={handleSubmitUser} className="bg-white border border-slate-200 rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-slate-700">
                        {isEditingUser ? `Edit ${editedUser?.username}` : 'Create User'}
                      </h4>
                      <button
                        type="button"
                        onClick={resetUserForm}
                        className="text-sm text-slate-500 hover:text-slate-700"
                      >
                        Cancel
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Username</label>
                        <input
                          type="text"
                          value={userForm.username}
                          onChange={(e) => setUserForm((prev) => ({ ...prev, username: e.target.value }))}
                          className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-amber-500"
                          required
                          disabled={isEditingUser}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
                        <input
                          type="password"
                          value={userForm.password}
                          onChange={(e) => setUserForm((prev) => ({ ...prev, password: e.target.value }))}
                          className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-amber-500"
                          placeholder={isEditingUser ? 'Leave blank to keep current password' : undefined}
                          required={!isEditingUser}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">First Name</label>
                        <input
                          type="text"
                          value={userForm.firstName}
                          onChange={(e) => setUserForm((prev) => ({ ...prev, firstName: e.target.value }))}
                          className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-amber-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Last Name</label>
                        <input
                          type="text"
                          value={userForm.lastName}
                          onChange={(e) => setUserForm((prev) => ({ ...prev, lastName: e.target.value }))}
                          className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-amber-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Phone</label>
                        <input
                          type="tel"
                          value={userForm.phone}
                          onChange={(e) => setUserForm((prev) => ({ ...prev, phone: e.target.value }))}
                          className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-amber-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                        <input
                          type="email"
                          value={userForm.email}
                          onChange={(e) => setUserForm((prev) => ({ ...prev, email: e.target.value }))}
                          className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-amber-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Role</label>
                        <select
                          value={userForm.role}
                          onChange={(e) => setUserForm((prev) => ({ ...prev, role: e.target.value as UserRole }))}
                          className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-amber-500"
                        >
                          <option value="admin">Admin</option>
                          <option value="manager">Manager</option>
                          <option value="host">Host</option>
                          <option value="operator">Operator</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={resetUserForm}
                        className="px-4 py-2 border border-slate-300 rounded-md hover:bg-slate-100 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-md font-medium transition-colors"
                      >
                        {isEditingUser ? 'Save Changes' : 'Create User'}
                      </button>
                    </div>
                  </form>
                )}

                <div className="bg-white border border-slate-200 rounded-lg">
                  <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-slate-700">Team Members</h4>
                      <p className="text-xs text-slate-500">
                        Admins and managers can manage all users.
                      </p>
                    </div>
                    <div className="text-xs text-slate-500">
                      Total: {users.length}
                    </div>
                  </div>

                  <div className="max-h-80 overflow-y-auto">
                    {isLoadingUsers ? (
                      <div className="p-4 text-center text-sm text-slate-500">Loading users…</div>
                    ) : users.length === 0 ? (
                      <div className="p-4 text-center text-sm text-slate-500">
                        No users found.
                      </div>
                    ) : (
                      <table className="min-w-full text-sm">
                        <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
                          <tr>
                            <th className="px-4 py-3 text-left">ID</th>
                            <th className="px-4 py-3 text-left">Name</th>
                            <th className="px-4 py-3 text-left">Username</th>
                            <th className="px-4 py-3 text-left">Role</th>
                            <th className="px-4 py-3 text-left">Contact</th>
                            <th className="px-4 py-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {users.map((userItem) => (
                            <tr key={userItem.id} className="hover:bg-slate-50">
                              <td className="px-4 py-3 font-mono text-xs text-slate-500">
                                {userItem.id}
                                {userItem.isDefaultAdmin && (
                                  <span className="ml-2 text-[10px] text-amber-600 uppercase tracking-wide">Default</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-slate-700">
                                {userItem.firstName} {userItem.lastName}
                              </td>
                              <td className="px-4 py-3 text-slate-600">{userItem.username}</td>
                              <td className="px-4 py-3">
                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 capitalize">
                                  {userItem.role}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-slate-500">
                                <div>{userItem.phone}</div>
                                <div className="text-xs">{userItem.email}</div>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => handleEditUser(userItem)}
                                    className="p-2 rounded-md text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                                    disabled={userItem.isDefaultAdmin && user?.role !== 'admin'}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteUser(userItem.id)}
                                    className="p-2 rounded-md text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                                    disabled={userItem.isDefaultAdmin || userItem.id === user?.id}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'database' && (
              <div className="p-6 space-y-6">
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <h3 className="text-lg font-semibold text-slate-800 mb-2">SQL Database Connection</h3>
                  <p className="text-sm text-slate-500 mb-4">
                    Enter your SQL database credentials and link them to the application.
                  </p>
                  <div className="grid gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">DB_HOST</label>
                      <input
                        type="text"
                        value={dbHost}
                        onChange={(e) => setDbHost(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        placeholder="localhost"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">DB_USER</label>
                      <input
                        type="text"
                        value={dbUser}
                        onChange={(e) => setDbUser(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        placeholder="root"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">DB_PASSWORD</label>
                      <input
                        type="password"
                        value={dbPassword}
                        onChange={(e) => setDbPassword(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        placeholder="••••••••"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">DB_NAME</label>
                      <input
                        type="text"
                        value={dbName}
                        onChange={(e) => setDbName(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        placeholder="event_manager"
                      />
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      onClick={connectDatabase}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-medium transition-colors"
                    >
                      Connect / Install
                    </button>
                    <button
                      onClick={() => importFileInputRef.current?.click()}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors"
                    >
                      Import SQL File
                    </button>
                    <button
                      onClick={handleExportDatabase}
                      className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-md font-medium transition-colors"
                    >
                      Export Database
                    </button>
                    <input
                      ref={importFileInputRef}
                      type="file"
                      accept=".sql"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) {
                          handleImportSqlFile(file);
                          event.target.value = '';
                        }
                      }}
                      className="hidden"
                    />
                  </div>

                  <p className="text-xs text-slate-500 mt-3">
                    Note: These actions require backend implementation to interact with your SQL database.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center gap-3 p-6 border-t border-slate-200 bg-slate-50 flex-shrink-0">
          <button
            onClick={handleResetToDefaults}
            className="px-4 py-2 text-red-600 border border-red-300 rounded-md hover:bg-red-50 transition-colors font-medium"
          >
            Reset to Defaults
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-700 border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveSettings}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-md font-medium transition-colors flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};