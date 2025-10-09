import { create } from 'zustand';
import { API_ENDPOINTS, apiCall } from '../config/api';
import { License, LicenseCheckResult, LicensePlanType, LicenseStatus } from '../types';

interface LicenseState {
  licenses: License[];
  isLoading: boolean;
  error: string | null;
  checkResult: LicenseCheckResult | null;
  autoSerialAvailable: boolean;
}

interface LicenseStore extends LicenseState {
  fetchLicenses: () => Promise<void>;
  createLicense: (input: {
    serialNumber?: string;
    userName?: string;
    planType: LicensePlanType;
    startDate?: string;
    expiryDate?: string;
    status?: LicenseStatus;
    notes?: string | null;
    autoGenerate?: boolean;
    prefix?: string;
    randomLength?: number;
  }) => Promise<License>;
  generateLicense: (input: {
    planType: LicensePlanType;
    userName?: string;
    startDate?: string;
    expiryDate?: string;
    prefix?: string;
    randomLength?: number;
    notes?: string | null;
  }) => Promise<License>;
  previewSerial: (input: {
    planType: LicensePlanType;
    userName?: string;
    startDate?: string;
    expiryDate?: string;
    prefix?: string;
    randomLength?: number;
    issuedAt?: string;
  }) => Promise<{
    serialNumber: string;
    planType: LicensePlanType;
    startDate: string;
    expiryDate: string;
  }>;
  updateLicense: (id: string, updates: Partial<Omit<License, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<void>;
  deleteLicense: (id: string) => Promise<void>;
  verifyLicense: (serial: string, projectKey?: string) => Promise<LicenseCheckResult>;
  clearError: () => void;
  clearCheckResult: () => void;
}

export const useLicenseStore = create<LicenseStore>((set, get) => ({
  licenses: [],
  isLoading: false,
  error: null,
  checkResult: null,
  autoSerialAvailable: true,

  clearError: () => set({ error: null }),
  clearCheckResult: () => set({ checkResult: null }),

  async fetchLicenses() {
    set({ isLoading: true, error: null });
    try {
      const response = await apiCall(API_ENDPOINTS.licenses);
      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: 'Failed to load licenses' }));
        throw new Error(data.error || 'Failed to load licenses');
      }
      const payload = await response.json();
      set({ licenses: payload.licenses ?? [], isLoading: false });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load licenses',
      });
    }
  },

  async createLicense(input) {
    set({ error: null });
    try {
      const response = await apiCall(API_ENDPOINTS.licenses, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...input,
          autoGenerate: input.autoGenerate ?? !input.serialNumber,
        }),
      });

      const payload = await response.json().catch(() => ({ error: 'Failed to create license' }));
      if (!response.ok) {
        if (response.status === 404 && (input.autoGenerate ?? !input.serialNumber)) {
          set({
            autoSerialAvailable: false,
            error:
              'Auto serial generation is not supported by this backend. Enter a serial number manually.',
          });
        }
        throw new Error(payload.error || 'Failed to create license');
      }

      if (payload.license) {
        set((state) => ({
          licenses: [payload.license as License, ...state.licenses],
        }));
        return payload.license as License;
      }

      throw new Error('License creation response missing license data');
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to create license' });
      throw error;
    }
  },

  async updateLicense(id, updates) {
    set({ error: null });
    try {
      const response = await apiCall(API_ENDPOINTS.licensesById(id), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to update license');
      }

      if (payload.license) {
        set((state) => ({
          licenses: state.licenses.map((license) =>
            license.id === id ? (payload.license as License) : license
          ),
        }));
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to update license' });
      throw error;
    }
  },

  async deleteLicense(id) {
    set({ error: null });
    try {
      const response = await apiCall(API_ENDPOINTS.licensesById(id), {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: 'Failed to delete license' }));
        throw new Error(data.error || 'Failed to delete license');
      }

      set((state) => ({
        licenses: state.licenses.filter((license) => license.id !== id),
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to delete license' });
      throw error;
    }
  },

  async verifyLicense(serial, projectKey) {
    set({ error: null, checkResult: null });
    try {
      const response = await apiCall(API_ENDPOINTS.licensesCheck, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serial, projectKey }),
      });

      const payload = await response.json();
      const result: LicenseCheckResult = {
        valid: Boolean(payload.valid),
        reason: payload.reason,
        user: payload.user,
        expiry: payload.expiry,
        plan: payload.plan,
        status: payload.status,
      };

      if (!response.ok) {
        set({ checkResult: result });
        return result;
      }

      set({ checkResult: result });
      return result;
    } catch (error) {
      const result: LicenseCheckResult = {
        valid: false,
        reason: error instanceof Error ? error.message : 'License verification failed',
      };
      set({ checkResult: result, error: result.reason ?? 'License verification failed' });
      return result;
    }
  },

  async generateLicense(input) {
    set({ error: null });
    try {
      const response = await apiCall(API_ENDPOINTS.licensesGenerate, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planType: input.planType,
          userName: input.userName,
          startDate: input.startDate,
          expiryDate: input.expiryDate,
          prefix: input.prefix,
          randomLength: input.randomLength,
          notes: input.notes,
        }),
      });

      const payload = await response.json().catch(() => ({ error: 'Failed to generate license' }));
      if (!response.ok) {
        if (response.status === 404) {
          set({
            autoSerialAvailable: false,
            error:
              'Auto serial generation is not supported by this backend. Enter a serial number manually.',
          });
        }
        throw new Error(payload.error || 'Failed to generate license');
      }

      if (payload.license) {
        set((state) => ({
          licenses: [payload.license as License, ...state.licenses],
        }));
        return payload.license as License;
      }

      throw new Error('License generation response missing license data');
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to generate license' });
      throw error;
    }
  },

  async previewSerial(input) {
    set({ error: null });
    const { autoSerialAvailable } = get();
    if (!autoSerialAvailable) {
      throw new Error('Auto serial generation is not supported by this backend.');
    }

    try {
      const url = new URL(API_ENDPOINTS.licensesPreviewSerial, window.location.origin);
      url.searchParams.set('planType', input.planType);
      if (input.userName) url.searchParams.set('userName', input.userName);
      if (input.startDate) url.searchParams.set('startDate', input.startDate);
      if (input.expiryDate) url.searchParams.set('expiryDate', input.expiryDate);
      if (input.prefix) url.searchParams.set('prefix', input.prefix);
      if (typeof input.randomLength === 'number') {
        url.searchParams.set('randomLength', String(input.randomLength));
      }
      if (input.issuedAt) {
        url.searchParams.set('issuedAt', input.issuedAt);
      }

      const response = await apiCall(url.toString(), { method: 'GET' });
      const payload = await response.json().catch(() => ({}));
      if (response.status === 404) {
        set({
          autoSerialAvailable: false,
          error:
            'Auto serial generation is not supported by this backend. Enter a serial number manually.',
        });
        throw new Error('Auto serial generation is not supported by this backend.');
      }

      if (!response.ok) {
        throw new Error((payload as any).error || 'Failed to preview serial');
      }

      return {
        serialNumber: (payload as any).serialNumber,
        planType: (payload as any).planType,
        startDate: (payload as any).startDate,
        expiryDate: (payload as any).expiryDate,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to preview serial';
      set({ error: message });
      throw error;
    }
  },
}));
