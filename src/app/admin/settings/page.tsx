'use client';

import Image from 'next/image';
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Settings as SettingsIcon,
  QrCode,
  Copy,
  Download,
  Save,
  RotateCcw,
  Trash2,
  PackageOpen,
  Zap,
  AlertTriangle,
  X,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Package,
  ShoppingCart,
  Award,
  DollarSign,
  ListOrdered,
  ChevronRight,
  Sparkles,
  Clock,
  Upload,
} from 'lucide-react';
import QRCode from 'react-qr-code';
import { demoService, DemoStats, GenerateResult } from '../../../services/demoService';
import { businessService, DEFAULT_DELIVERY_SETTINGS, DEFAULT_ETA_SETTINGS } from '../../../services/businessService';
import { productService } from '../../../services/productService';
import { useAuth } from '../../../components/AuthProvider';
import { formatRupiah } from '../../../utils/format';
import type { BusinessProfile, EtaDisplayMode, Plan } from '../../../types';
import { Database } from 'lucide-react';
import { supabaseClient } from '../../../lib/supabase/client';
import { planService } from '../../../lib/services/planService';
import { generateBusinessSlug, slugifyBusinessName } from '../../../lib/utils/slug';
import { readImageFileAsDataUrl } from '../../../utils/imageUpload';

interface ConfirmConfig {
  title: string;
  description: string;
  consequences: string[];
  confirmLabel: string;
  variant: 'danger' | 'warning' | 'info' | 'success';
  onConfirm: () => void;
}

interface Toast {
  type: 'success' | 'error';
  message: string;
}

interface PaymentHealthData {
  provider: string;
  environment: string;
  isProduction: boolean;
  productionEnabled: boolean;
  hasMerchantId: boolean;
  hasClientKey: boolean;
  hasServerKey: boolean;
  snapBaseUrl: string;
  coreApiBaseUrl: string;
  webhookUrl: string;
  appUrl: string;
  canCreatePayment: boolean;
  lastWebhookReceivedAt: string | null;
  warnings: string[];
}

const BUSINESS_CATEGORY_OPTIONS = [
  'Kedai Kopi & Makanan',
  'Laundry',
  'Toko Kelontong',
  'Rumah Makan',
  'Jasa / Dagang Lainnya',
  'Lainnya',
];

const DEVELOPER_EMAILS = (process.env.NEXT_PUBLIC_DEVELOPER_EMAILS || '')
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

export default function AdminSettingsPage() {
  // Tab state: 'profile' | 'demo' | 'payment'
  const [activeTab, setActiveTab] = useState<'profile' | 'demo' | 'payment'>('profile');

  // Business Profile states
  const [businessName, setBusinessName] = useState(() => {
    if (typeof window === 'undefined') return '';
    return businessService.getProfileSync().businessName;
  });
  const [businessType, setBusinessType] = useState(() => {
    if (typeof window === 'undefined') return '';
    return businessService.getProfileSync().businessType;
  });
  const [customBusinessType, setCustomBusinessType] = useState('');
  const [businessSlug, setBusinessSlug] = useState('');
  const [description, setDescription] = useState(() => {
    if (typeof window === 'undefined') return '';
    return businessService.getProfileSync().description;
  });
  const [logoUrl, setLogoUrl] = useState(() => {
    if (typeof window === 'undefined') return '';
    return businessService.getProfileSync().logoUrl;
  });
  const [address, setAddress] = useState(() => {
    if (typeof window === 'undefined') return '';
    return businessService.getProfileSync().address;
  });
  const [whatsappNumber, setWhatsappNumber] = useState(() => {
    if (typeof window === 'undefined') return '';
    return businessService.getProfileSync().whatsappNumber;
  });
  const [openingHours, setOpeningHours] = useState(() => {
    if (typeof window === 'undefined') return '';
    return businessService.getProfileSync().openingHours;
  });
  const [taxEnabled, setTaxEnabled] = useState(() => {
    if (typeof window === 'undefined') return false;
    return businessService.getProfileSync().taxEnabled;
  });
  const [taxPercentage, setTaxPercentage] = useState(() => {
    if (typeof window === 'undefined') return 10;
    return businessService.getProfileSync().taxPercentage;
  });
  const [serviceChargeEnabled, setServiceChargeEnabled] = useState(() => {
    if (typeof window === 'undefined') return false;
    return businessService.getProfileSync().serviceChargeEnabled;
  });
  const [serviceChargePercentage, setServiceChargePercentage] = useState(() => {
    if (typeof window === 'undefined') return 5;
    return businessService.getProfileSync().serviceChargePercentage;
  });

  // Delivery Settings states
  const [deliveryEnabled, setDeliveryEnabled] = useState(() => {
    if (typeof window === 'undefined') return true;
    return businessService.getProfileSync().deliverySettings?.deliveryEnabled ?? true;
  });
  const [deliveryFeeEnabled, setDeliveryFeeEnabled] = useState(() => {
    if (typeof window === 'undefined') return true;
    return businessService.getProfileSync().deliverySettings?.deliveryFeeEnabled ?? true;
  });
  const [deliveryFeeAmount, setDeliveryFeeAmount] = useState(() => {
    if (typeof window === 'undefined') return 10000;
    return businessService.getProfileSync().deliverySettings?.deliveryFeeAmount ?? 10000;
  });
  const [freeDeliveryEnabled, setFreeDeliveryEnabled] = useState(() => {
    if (typeof window === 'undefined') return false;
    return businessService.getProfileSync().deliverySettings?.freeDeliveryEnabled ?? false;
  });
  const [freeDeliveryMinimumAmount, setFreeDeliveryMinimumAmount] = useState(() => {
    if (typeof window === 'undefined') return 50000;
    return businessService.getProfileSync().deliverySettings?.freeDeliveryMinimumAmount ?? 50000;
  });
  const [deliveryAdminFeeEnabled, setDeliveryAdminFeeEnabled] = useState(() => {
    if (typeof window === 'undefined') return false;
    return businessService.getProfileSync().deliverySettings?.deliveryAdminFeeEnabled ?? false;
  });
  const [deliveryAdminFeeType, setDeliveryAdminFeeType] = useState<'fixed' | 'percentage'>(() => {
    if (typeof window === 'undefined') return 'fixed';
    return businessService.getProfileSync().deliverySettings?.deliveryAdminFeeType ?? 'fixed';
  });
  const [deliveryAdminFeeValue, setDeliveryAdminFeeValue] = useState(() => {
    if (typeof window === 'undefined') return 0;
    return businessService.getProfileSync().deliverySettings?.deliveryAdminFeeValue ?? 0;
  });
  const [deliveryInstruction, setDeliveryInstruction] = useState(() => {
    if (typeof window === 'undefined') return '';
    return businessService.getProfileSync().deliverySettings?.deliveryInstruction ?? '';
  });
  const [deliveryFeeCalculationType, setDeliveryFeeCalculationType] = useState<'fixed' | 'distance_based'>(() => {
    if (typeof window === 'undefined') return 'fixed';
    return businessService.getProfileSync().deliverySettings?.deliveryFeeCalculationType ?? 'fixed';
  });
  const [baseDeliveryFee, setBaseDeliveryFee] = useState(() => {
    if (typeof window === 'undefined') return 8000;
    return businessService.getProfileSync().deliverySettings?.baseDeliveryFee ?? 8000;
  });
  const [baseDeliveryDistanceKm, setBaseDeliveryDistanceKm] = useState(() => {
    if (typeof window === 'undefined') return 2;
    return businessService.getProfileSync().deliverySettings?.baseDeliveryDistanceKm ?? 2;
  });
  const [deliveryFeePerKm, setDeliveryFeePerKm] = useState(() => {
    if (typeof window === 'undefined') return 2500;
    return businessService.getProfileSync().deliverySettings?.deliveryFeePerKm ?? 2500;
  });
  const [maxDeliveryDistanceKm, setMaxDeliveryDistanceKm] = useState(() => {
    if (typeof window === 'undefined') return 10;
    return businessService.getProfileSync().deliverySettings?.maxDeliveryDistanceKm ?? 10;
  });
  const [distanceRoundingMode, setDistanceRoundingMode] = useState<'ceil' | 'round' | 'floor'>(() => {
    if (typeof window === 'undefined') return 'ceil';
    return businessService.getProfileSync().deliverySettings?.distanceRoundingMode ?? 'ceil';
  });
  const [distanceCalculationMode, setDistanceCalculationMode] = useState<'manual' | 'mock' | 'maps_api_later'>(() => {
    if (typeof window === 'undefined') return 'manual';
    return businessService.getProfileSync().deliverySettings?.distanceCalculationMode ?? 'manual';
  });

  // ETA Settings states (Phase 6.8)
  const [etaEnabled, setEtaEnabled] = useState(() => {
    if (typeof window === 'undefined') return true;
    return businessService.getProfileSync().etaSettings?.etaEnabled ?? true;
  });
  const [defaultPreparationMinutes, setDefaultPreparationMinutes] = useState(() => {
    if (typeof window === 'undefined') return 15;
    return businessService.getProfileSync().etaSettings?.defaultPreparationMinutes ?? 15;
  });
  const [rushHourBufferMinutes, setRushHourBufferMinutes] = useState(() => {
    if (typeof window === 'undefined') return 5;
    return businessService.getProfileSync().etaSettings?.rushHourBufferMinutes ?? 5;
  });
  const [dineInServingBufferMinutes, setDineInServingBufferMinutes] = useState(() => {
    if (typeof window === 'undefined') return 3;
    return businessService.getProfileSync().etaSettings?.dineInServingBufferMinutes ?? 3;
  });
  const [pickupBufferMinutes, setPickupBufferMinutes] = useState(() => {
    if (typeof window === 'undefined') return 5;
    return businessService.getProfileSync().etaSettings?.pickupBufferMinutes ?? 5;
  });
  const [deliveryBaseMinutes, setDeliveryBaseMinutes] = useState(() => {
    if (typeof window === 'undefined') return 5;
    return businessService.getProfileSync().etaSettings?.deliveryBaseMinutes ?? 5;
  });
  const [deliveryMinutesPerKm, setDeliveryMinutesPerKm] = useState(() => {
    if (typeof window === 'undefined') return 4;
    return businessService.getProfileSync().etaSettings?.deliveryMinutesPerKm ?? 4;
  });
  const [etaDisplayMode, setEtaDisplayMode] = useState<EtaDisplayMode>(() => {
    if (typeof window === 'undefined') return 'both';
    return businessService.getProfileSync().etaSettings?.etaDisplayMode ?? 'both';
  });
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const [isLogoUploading, setIsLogoUploading] = useState(false);

  // Dynamic order link state
  const [orderLink, setOrderLink] = useState('');

  // Demo stats states
  const [stats, setStats] = useState<DemoStats | null>(() => {
    if (typeof window === 'undefined') return null;
    return demoService.getStats();
  });
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [confirm, setConfirm] = useState<ConfirmConfig | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Auth & data source mode
  const { isSupabaseConfigured, user: supabaseUser, currentBusiness, refreshAuth } = useAuth();
  const isSupabaseActive = isSupabaseConfigured && !!supabaseUser;
  const isDeveloperAccount = Boolean(
    supabaseUser?.email && DEVELOPER_EMAILS.includes(supabaseUser.email.toLowerCase())
  );
  const [isMigrationLoading, setIsMigrationLoading] = useState(false);

  // Payment integration health checks state
  const [healthData, setHealthData] = useState<PaymentHealthData | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);

  const fetchPaymentHealth = useCallback(async () => {
    setHealthLoading(true);
    try {
      const { data: sessionData } = await supabaseClient.auth.getSession();
      const token = sessionData.session?.access_token || '';
      const res = await fetch('/api/admin/payments/health', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setHealthData(data);
      }
    } catch (err) {
      console.error('Failed to fetch payment health data:', err);
    } finally {
      setHealthLoading(false);
    }
  }, []);

  interface SubDetails {
    status: string;
    trialEndsAt: string | null;
    subData: Record<string, unknown> | null;
  }

  // SaaS Package details state
  const [activePlan, setActivePlan] = useState<Plan | null>(null);
  const [subDetails, setSubDetails] = useState<SubDetails | null>(null);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);

  const loadPlanDetails = useCallback(async () => {
    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) return;
      
      const { data: profileData } = await supabaseClient
        .from('profiles')
        .select('business_id')
        .eq('id', user.id)
        .maybeSingle();
      
      if (!profileData?.business_id) return;
      
      const { data: bizData } = await supabaseClient
        .from('businesses')
        .select('plan_code, subscription_status, trial_ends_at')
        .eq('id', profileData.business_id)
        .maybeSingle();

      if (!bizData) return;

      const planData = await planService.getPlanByCode(bizData.plan_code || 'free');

      const { data: subData } = await supabaseClient
        .from('business_subscriptions')
        .select('*')
        .eq('business_id', profileData.business_id)
        .maybeSingle();

      setActivePlan(planData);
      setSubDetails({
        status: bizData.subscription_status || 'active',
        trialEndsAt: bizData.trial_ends_at,
        subData
      });
    } catch (e) {
      console.error('Failed to load plan details:', e);
    }
  }, []);



  // Load business profile and stats
  const loadStats = useCallback(() => {
    const s = demoService.getStats();
    setStats(s);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const timer = setTimeout(() => {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
        setOrderLink(businessSlug ? `${appUrl}/order/${businessSlug}` : '');
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [businessSlug]);

  useEffect(() => {
    if (activeTab === 'demo' && !isDeveloperAccount) {
      const timer = setTimeout(() => {
        setActiveTab('profile');
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [activeTab, isDeveloperAccount]);

  const ensureUniqueSlug = async (name: string, currentId: string, existingSlug?: string) => {
    const preferred = slugifyBusinessName(existingSlug || name) || 'bisnis';
    let candidate = preferred;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const { data } = await supabaseClient
        .from('businesses')
        .select('id')
        .eq('slug', candidate)
        .maybeSingle();

      if (!data || data.id === currentId) return candidate;
      candidate = generateBusinessSlug(name);
    }
    return generateBusinessSlug(name);
  };

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  };

  function applyProfileState(profile: Partial<BusinessProfile>) {
    const type = profile.businessType || '';
    if (BUSINESS_CATEGORY_OPTIONS.includes(type)) {
      setBusinessType(type);
      setCustomBusinessType('');
    } else {
      setBusinessType(type ? 'Lainnya' : BUSINESS_CATEGORY_OPTIONS[0]);
      setCustomBusinessType(type);
    }

    setBusinessName(profile.businessName || '');
    setBusinessSlug(profile.slug || '');
    setDescription(profile.description || '');
    setLogoUrl(profile.logoUrl || '');
    setAddress(profile.address || '');
    setWhatsappNumber(profile.whatsappNumber || '');
    setOpeningHours(profile.openingHours || '');
    setTaxEnabled(profile.taxEnabled ?? false);
    setTaxPercentage(Number(profile.taxPercentage ?? 10));
    setServiceChargeEnabled(profile.serviceChargeEnabled ?? false);
    setServiceChargePercentage(Number(profile.serviceChargePercentage ?? 5));

    const delivery = profile.deliverySettings || DEFAULT_DELIVERY_SETTINGS;
    setDeliveryEnabled(delivery.deliveryEnabled ?? DEFAULT_DELIVERY_SETTINGS.deliveryEnabled);
    setDeliveryFeeEnabled(delivery.deliveryFeeEnabled ?? DEFAULT_DELIVERY_SETTINGS.deliveryFeeEnabled);
    setDeliveryFeeAmount(Number(delivery.deliveryFeeAmount ?? DEFAULT_DELIVERY_SETTINGS.deliveryFeeAmount));
    setFreeDeliveryEnabled(delivery.freeDeliveryEnabled ?? DEFAULT_DELIVERY_SETTINGS.freeDeliveryEnabled);
    setFreeDeliveryMinimumAmount(Number(delivery.freeDeliveryMinimumAmount ?? DEFAULT_DELIVERY_SETTINGS.freeDeliveryMinimumAmount));
    setDeliveryAdminFeeEnabled(delivery.deliveryAdminFeeEnabled ?? DEFAULT_DELIVERY_SETTINGS.deliveryAdminFeeEnabled);
    setDeliveryAdminFeeType(delivery.deliveryAdminFeeType ?? DEFAULT_DELIVERY_SETTINGS.deliveryAdminFeeType);
    setDeliveryAdminFeeValue(Number(delivery.deliveryAdminFeeValue ?? DEFAULT_DELIVERY_SETTINGS.deliveryAdminFeeValue));
    setDeliveryInstruction(delivery.deliveryInstruction ?? DEFAULT_DELIVERY_SETTINGS.deliveryInstruction);
    setDeliveryFeeCalculationType(delivery.deliveryFeeCalculationType ?? DEFAULT_DELIVERY_SETTINGS.deliveryFeeCalculationType ?? 'fixed');
    setBaseDeliveryFee(Number(delivery.baseDeliveryFee ?? DEFAULT_DELIVERY_SETTINGS.baseDeliveryFee ?? 8000));
    setBaseDeliveryDistanceKm(Number(delivery.baseDeliveryDistanceKm ?? DEFAULT_DELIVERY_SETTINGS.baseDeliveryDistanceKm ?? 2));
    setDeliveryFeePerKm(Number(delivery.deliveryFeePerKm ?? DEFAULT_DELIVERY_SETTINGS.deliveryFeePerKm ?? 2500));
    setMaxDeliveryDistanceKm(Number(delivery.maxDeliveryDistanceKm ?? DEFAULT_DELIVERY_SETTINGS.maxDeliveryDistanceKm ?? 10));
    setDistanceRoundingMode(delivery.distanceRoundingMode ?? DEFAULT_DELIVERY_SETTINGS.distanceRoundingMode ?? 'ceil');
    setDistanceCalculationMode(delivery.distanceCalculationMode ?? DEFAULT_DELIVERY_SETTINGS.distanceCalculationMode ?? 'manual');

    const eta = profile.etaSettings || DEFAULT_ETA_SETTINGS;
    setEtaEnabled(eta.etaEnabled ?? DEFAULT_ETA_SETTINGS.etaEnabled);
    setDefaultPreparationMinutes(Number(eta.defaultPreparationMinutes ?? DEFAULT_ETA_SETTINGS.defaultPreparationMinutes));
    setRushHourBufferMinutes(Number(eta.rushHourBufferMinutes ?? DEFAULT_ETA_SETTINGS.rushHourBufferMinutes));
    setDineInServingBufferMinutes(Number(eta.dineInServingBufferMinutes ?? DEFAULT_ETA_SETTINGS.dineInServingBufferMinutes));
    setPickupBufferMinutes(Number(eta.pickupBufferMinutes ?? DEFAULT_ETA_SETTINGS.pickupBufferMinutes));
    setDeliveryBaseMinutes(Number(eta.deliveryBaseMinutes ?? DEFAULT_ETA_SETTINGS.deliveryBaseMinutes));
    setDeliveryMinutesPerKm(Number(eta.deliveryMinutesPerKm ?? DEFAULT_ETA_SETTINGS.deliveryMinutesPerKm));
    setEtaDisplayMode(eta.etaDisplayMode ?? DEFAULT_ETA_SETTINGS.etaDisplayMode);
  }

  useEffect(() => {
    if (!currentBusiness) return;

    const timer = setTimeout(() => {
      applyProfileState({
        id: currentBusiness.id,
        businessName: currentBusiness.name || '',
        businessType: currentBusiness.business_type || '',
        slug: currentBusiness.slug || '',
        publicOrderEnabled: currentBusiness.public_order_enabled ?? true,
        description: currentBusiness.description || '',
        logoUrl: currentBusiness.logo_url || '',
        address: currentBusiness.address || '',
        whatsappNumber: currentBusiness.whatsapp_number || '',
        openingHours: currentBusiness.opening_hours || '',
        orderLink: '',
        currency: 'IDR',
        taxEnabled: currentBusiness.tax_enabled ?? false,
        taxPercentage: Number(currentBusiness.tax_percentage ?? 10),
        serviceChargeEnabled: currentBusiness.service_charge_enabled ?? false,
        serviceChargePercentage: Number(currentBusiness.service_charge_percentage ?? 5),
        deliverySettings: (currentBusiness.delivery_settings || {}) as unknown as BusinessProfile['deliverySettings'],
        etaSettings: (currentBusiness.eta_settings || {}) as unknown as BusinessProfile['etaSettings'],
      });
    }, 0);
    return () => clearTimeout(timer);
  }, [currentBusiness]);

  const handleRefreshStats = () => {
    setIsRefreshing(true);
    loadStats();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleLogoFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setIsLogoUploading(true);
    try {
      const dataUrl = await readImageFileAsDataUrl(file, { maxSizeMB: 2 });
      setLogoUrl(dataUrl);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Gagal mengunggah logo bisnis.');
    } finally {
      setIsLogoUploading(false);
    }
  };

  const runAction = (action: () => void | GenerateResult, successMsg: string) => {
    setIsActionLoading(true);
    setConfirm(null);
    try {
      action();
      loadStats();
      showToast('success', successMsg);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Terjadi kesalahan tidak diketahui.');
    } finally {
      setIsActionLoading(false);
    }
  };

  // ── Supabase Migration Actions ────────────────────────────────────────────

  const handleImportBusinessProfile = async () => {
    if (!isSupabaseActive) {
      showToast('error', 'Fitur migrasi hanya tersedia saat login Supabase aktif.');
      return;
    }
    setIsMigrationLoading(true);
    try {
      const localProfile = businessService.getProfileSync();
      const imported = await businessService.updateProfile(localProfile, 'supabase');
      if (imported) {
        showToast('success', 'Profil bisnis demo berhasil diimpor ke Supabase!');
      }
    } catch (err) {
      showToast('error', `Gagal mengimpor profil bisnis: ${err instanceof Error ? err.message : 'Kesalahan tidak diketahui'}`);
    } finally {
      setIsMigrationLoading(false);
    }
  };

  const handleImportProducts = async () => {
    if (!isSupabaseActive) {
      showToast('error', 'Fitur migrasi hanya tersedia saat login Supabase aktif.');
      return;
    }
    setIsMigrationLoading(true);
    try {
      const localProducts = await productService.getProducts('localStorage');
      const supabaseProducts = await productService.getProducts('supabase');
      const existingNames = new Set(supabaseProducts.map(p => p.name));
      const toImport = localProducts.filter(p => !existingNames.has(p.name));
      if (toImport.length === 0) {
        showToast('success', 'Semua produk sudah ada di Supabase — tidak ada yang perlu diimpor.');
        return;
      }
      let importedCount = 0;
      for (const prod of toImport) {
        const { id: _id, ...productData } = prod;
        await productService.createProduct(productData, 'supabase');
        importedCount++;
      }
      showToast('success', `${importedCount} produk berhasil diimpor ke Supabase! ${localProducts.length - toImport.length} produk sudah ada (dilewati).`);
    } catch (err) {
      showToast('error', `Gagal mengimpor produk: ${err instanceof Error ? err.message : 'Kesalahan tidak diketahui'}`);
    } finally {
      setIsMigrationLoading(false);
    }
  };

  // ── Business Settings Actions ────────────────────────────────────────────

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim()) {
      showToast('error', 'Nama bisnis wajib diisi.');
      return;
    }
    if (!whatsappNumber.trim()) {
      showToast('error', 'Nomor WhatsApp wajib diisi.');
      return;
    }
    const finalBusinessType = businessType === 'Lainnya' ? customBusinessType.trim() : businessType;
    if (!finalBusinessType) {
      showToast('error', 'Kategori Usaha Lainnya wajib diisi.');
      return;
    }
    if (isSupabaseActive && !currentBusiness?.id) {
      showToast('error', 'Konteks bisnis aktif belum ditemukan. Silakan masuk ulang.');
      return;
    }

    setIsActionLoading(true);
    try {
      const nextSlug = currentBusiness?.id
        ? await ensureUniqueSlug(businessName, currentBusiness.id, businessSlug || businessName)
        : businessSlug;
      const savedProfile = await businessService.updateProfile({
        businessName,
        businessType: finalBusinessType,
        slug: nextSlug,
        publicOrderEnabled: true,
        description,
        logoUrl,
        address,
        whatsappNumber,
        openingHours,
        taxEnabled,
        taxPercentage: Number(taxPercentage),
        serviceChargeEnabled,
        serviceChargePercentage: Number(serviceChargePercentage),
        deliverySettings: {
          deliveryEnabled,
          deliveryFeeEnabled,
          deliveryFeeAmount: Number(deliveryFeeAmount),
          freeDeliveryEnabled,
          freeDeliveryMinimumAmount: Number(freeDeliveryMinimumAmount),
          deliveryAdminFeeEnabled,
          deliveryAdminFeeType,
          deliveryAdminFeeValue: Number(deliveryAdminFeeValue),
          deliveryInstruction,
          deliveryFeeCalculationType,
          baseDeliveryFee: Number(baseDeliveryFee),
          baseDeliveryDistanceKm: Number(baseDeliveryDistanceKm),
          deliveryFeePerKm: Number(deliveryFeePerKm),
          maxDeliveryDistanceKm: Number(maxDeliveryDistanceKm),
          distanceRoundingMode,
          distanceCalculationMode,
        },
        etaSettings: {
          etaEnabled,
          defaultPreparationMinutes: Number(defaultPreparationMinutes),
          rushHourBufferMinutes: Number(rushHourBufferMinutes),
          dineInServingBufferMinutes: Number(dineInServingBufferMinutes),
          pickupBufferMinutes: Number(pickupBufferMinutes),
          deliveryBaseMinutes: Number(deliveryBaseMinutes),
          deliveryMinutesPerKm: Number(deliveryMinutesPerKm),
          etaDisplayMode,
        },
      }, isSupabaseActive ? 'supabase' : undefined, currentBusiness?.id);
      applyProfileState(savedProfile);

      // Sync user session businessName
      const sessionKey = 'umkm_pilot_user_session';
      if (typeof window !== 'undefined') {
        const sessionStr = window.localStorage.getItem(sessionKey);
        if (sessionStr) {
          try {
            const session = JSON.parse(sessionStr);
            session.businessName = businessName;
            window.localStorage.setItem(sessionKey, JSON.stringify(session));
          } catch (err) {
            console.error('Session sync error:', err);
          }
        }
      }

      const isPresetType = BUSINESS_CATEGORY_OPTIONS.includes(finalBusinessType);
      setBusinessType(isPresetType ? finalBusinessType : 'Lainnya');
      setCustomBusinessType(isPresetType ? '' : finalBusinessType);
      await refreshAuth();
      showToast('success', 'Pengaturan bisnis berhasil disimpan!');
    } catch {
      showToast('error', 'Gagal menyimpan pengaturan bisnis.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleResetProfile = () => {
    setConfirm({
      title: 'Reset Pengaturan Bisnis',
      description: 'Apakah Anda yakin ingin mengembalikan pengaturan bisnis ke kondisi default? Seluruh konfigurasi profil, alamat, pajak, dan biaya layanan Anda saat ini akan direset.',
      consequences: [
        'Nama bisnis kembali menjadi "Warung Kopi Nusantara"',
        'Biaya pajak (10%) & layanan (5%) akan dinonaktifkan',
        'Deskripsi dan logo default akan diterapkan kembali',
        'Halaman akan dimuat ulang untuk memperbarui sistem'
      ],
      confirmLabel: 'Ya, Reset Pengaturan',
      variant: 'warning',
      onConfirm: async () => {
        setIsActionLoading(true);
        setConfirm(null);
        try {
          const defaults = await businessService.resetProfile(
            isSupabaseActive ? 'supabase' : undefined,
            currentBusiness?.id
          );
          applyProfileState(defaults);

          // Reset user session businessName
          const sessionKey = 'umkm_pilot_user_session';
          if (typeof window !== 'undefined') {
            const sessionStr = window.localStorage.getItem(sessionKey);
            if (sessionStr) {
              const session = JSON.parse(sessionStr);
              session.businessName = defaults.businessName;
              window.localStorage.setItem(sessionKey, JSON.stringify(session));
            }
          }

          await refreshAuth();
          showToast('success', 'Pengaturan bisnis berhasil direset!');
        } catch {
          showToast('error', 'Gagal mereset pengaturan bisnis.');
        } finally {
          setIsActionLoading(false);
        }
      }
    });
  };

  // ── QR Code Utilities ───────────────────────────────────────────────────

  const handleCopyLink = () => {
    if (!orderLink) {
      showToast('error', 'Link order belum tersedia. Buat link order terlebih dahulu.');
      return;
    }
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(orderLink);
      showToast('success', 'Link QR Menu berhasil disalin ke clipboard!');
    } else {
      showToast('error', 'Browser Anda tidak mendukung penyalinan otomatis.');
    }
  };

  const handleCreateOrderLink = async () => {
    if (!currentBusiness?.id) {
      showToast('error', 'Konteks bisnis aktif belum ditemukan. Silakan masuk ulang.');
      return;
    }

    setIsActionLoading(true);
    try {
      const nextSlug = await ensureUniqueSlug(businessName || currentBusiness.name, currentBusiness.id, businessName || currentBusiness.name);
      await businessService.updateProfile({
        slug: nextSlug,
        publicOrderEnabled: true,
      }, 'supabase', currentBusiness.id);
      setBusinessSlug(nextSlug);
      await refreshAuth();
      showToast('success', 'Link order publik berhasil dibuat.');
    } catch {
      showToast('error', 'Gagal membuat link order publik.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDownloadQR = () => {
    const svg = document.getElementById('qr-code-svg');
    if (!svg) {
      showToast('error', 'QR Code SVG tidak ditemukan.');
      return;
    }
    try {
      const svgData = new XMLSerializer().serializeToString(svg);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);
      const downloadLink = document.createElement('a');
      downloadLink.href = svgUrl;
      downloadLink.download = `qr-menu-${businessName.replace(/\s+/g, '-').toLowerCase()}.svg`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(svgUrl);
      showToast('success', 'QR Code berhasil diunduh sebagai file SVG!');
    } catch {
      showToast('error', 'Gagal mengunduh QR Code.');
    }
  };

  // ── Demo Action Handlers ────────────────────────────────────────────────

  const handleResetAll = () => {
    setConfirm({
      title: 'Reset Semua Data',
      description:
        'Anda akan menghapus SELURUH pesanan dan mengembalikan katalog produk ke kondisi awal (7 produk seed). Tindakan ini TIDAK DAPAT dibatalkan.',
      consequences: [
        'Seluruh riwayat pesanan dihapus secara permanen',
        'Semua statistik dashboard kembali ke nol',
        'Katalog produk dikembalikan ke 7 produk seed',
        'Stok semua produk dikembalikan ke nilai awal',
        'Nomor antrean direset dari A001',
      ],
      confirmLabel: 'Ya, Reset Semua Data',
      variant: 'danger',
      onConfirm: () =>
        runAction(() => {
          demoService.resetAll();
        }, 'Semua data berhasil direset ke kondisi awal.'),
    });
  };

  const handleClearOrders = () => {
    setConfirm({
      title: 'Bersihkan Semua Pesanan',
      description:
        'Seluruh riwayat pesanan akan dihapus. Data katalog produk dan stok tidak akan terpengaruh.',
      consequences: [
        'Seluruh pesanan (aktif, selesai, batal) dihapus',
        'Statistik dashboard omzet menjadi nol',
        'Antrean kasir dikosongkan',
        'Nomor antrean direset dari A001',
      ],
      confirmLabel: 'Ya, Bersihkan Pesanan',
      variant: 'warning',
      onConfirm: () =>
        runAction(() => {
          demoService.clearOrders();
        }, 'Semua pesanan berhasil dibersihkan.'),
    });
  };

  const handleRestoreProducts = () => {
    setConfirm({
      title: 'Pulihkan Katalog Produk',
      description:
        'Katalog produk akan dikembalikan ke 7 produk seed awal. Riwayat pesanan tidak akan terpengaruh, namun referensi produk yang sudah dihapus mungkin tidak sinkron.',
      consequences: [
        'Produk yang sudah ditambahkan secara manual akan hilang',
        'Semua stok produk dikembalikan ke nilai seed',
        'Perubahan harga/nama yang sudah dilakukan akan hilang',
      ],
      confirmLabel: 'Ya, Pulihkan Produk',
      variant: 'info',
      onConfirm: () =>
        runAction(() => {
          demoService.restoreProducts();
        }, '7 produk seed berhasil dipulihkan ke kondisi awal.'),
    });
  };

  const handleGenerateSampleOrders = () => {
    setConfirm({
      title: 'Buat Pesanan Contoh',
      description:
        'Akan dibuat 8 pesanan demo dengan berbagai status (selesai, aktif, menunggu, batal). Semua data saat ini AKAN DITIMPA untuk memastikan konsistensi.',
      consequences: [
        '8 pesanan baru dibuat untuk hari ini dengan perhitungan pajak & layanan aktif (jika diaktifkan)',
        'Katalog produk dikembalikan ke 7 produk seed',
        'Stok produk dikurangi sesuai pesanan aktif',
        'Dashboard, kasir, dan transaksi terisi data contoh yang sinkron',
      ],
      confirmLabel: 'Ya, Generate Pesanan Demo',
      variant: 'success',
      onConfirm: () =>
        runAction(() => {
          const result = demoService.generateSampleOrders();
          return result;
        }, '8 pesanan demo berhasil dibuat! Dashboard, kasir, dan stok kini terisi data contoh.'),
    });
  };

  const handleSetLowStock = () => {
    setConfirm({
      title: 'Simulasi Stok Kritis',
      description:
        'Akan mengatur 3 produk ke stok sangat sedikit (2–4 unit) untuk menguji tampilan peringatan stok di halaman dashboard dan stok.',
      consequences: [
        'Es Kopi Susu Gula Aren → 4 unit',
        'Roti Bakar Cokelat Keju → 3 unit',
        'Paket Kenyang A → 2 unit',
        'Peringatan stok kritis akan muncul di dashboard admin',
      ],
      confirmLabel: 'Ya, Simulasikan Stok Kritis',
      variant: 'warning',
      onConfirm: () =>
        runAction(() => {
          demoService.setLowStockDemo();
        }, 'Simulasi stok kritis berhasil. Cek halaman Kelola Stok dan Ringkasan Admin.'),
    });
  };

  // ── Variant Styling Helpers ──────────────────────────────────────────────

  const variantStyles = {
    danger: {
      button: 'bg-rose-600 hover:bg-rose-500 text-white',
      icon: 'text-rose-400',
      iconBg: 'bg-rose-500/10',
      border: 'border-rose-500/20',
      badge: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
    },
    warning: {
      button: 'bg-amber-500 hover:bg-amber-400 text-slate-950',
      icon: 'text-amber-400',
      iconBg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      badge: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    },
    info: {
      button: 'bg-blue-600 hover:bg-blue-500 text-white',
      icon: 'text-blue-400',
      iconBg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
      badge: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
    },
    success: {
      button: 'bg-emerald-500 hover:bg-emerald-400 text-slate-950',
      icon: 'text-emerald-400',
      iconBg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      badge: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    },
  };

  return (
    <div className="flex flex-col gap-6 relative">

      {/* ── Toast Notification ─────────────────────────────────────────────── */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 max-w-sm flex items-start gap-3 p-4 rounded-2xl shadow-2xl border transition-all ${
            toast.type === 'success'
              ? 'bg-slate-900 border-emerald-500/30 text-emerald-400'
              : 'bg-slate-900 border-rose-500/30 text-rose-400'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
          ) : (
            <XCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          )}
          <p className="text-xs text-slate-200 leading-relaxed">{toast.message}</p>
          <button
            onClick={() => setToast(null)}
            className="text-slate-500 hover:text-white ml-2 flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Page Header ────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
            <SettingsIcon className="w-6 h-6 text-emerald-400" />
            <span>Pengaturan Bisnis</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Konfigurasi profil UMKM, buat menu digital berbasis QR, dan atur pembiayaan daerah.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold border ${
            isSupabaseActive
              ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
              : 'bg-slate-800 text-slate-400 border-slate-700'
          }`}>
            <Database className="w-3.5 h-3.5" />
            {isSupabaseActive ? 'Sumber Data: Supabase' : 'Sumber Data: Demo Lokal'}
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Sparkles className="w-3.5 h-3.5" />
            UMKM Digital
          </span>
        </div>
      </div>

      {/* ── Tabs Navigation ────────────────────────────────────────────────── */}
      <div className="flex border-b border-slate-850 gap-2">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold transition-all relative ${
            activeTab === 'profile'
              ? 'text-emerald-400 border-b-2 border-emerald-500'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <QrCode className="w-4.5 h-4.5" />
          <span>Profil Toko &amp; QR Menu</span>
        </button>
        {isDeveloperAccount && (
          <button
            onClick={() => setActiveTab('demo')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold transition-all relative ${
              activeTab === 'demo'
                ? 'text-emerald-400 border-b-2 border-emerald-500'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-4.5 h-4.5" />
            <span>Alat Demo &amp; Developer</span>
          </button>
        )}
        <button
          onClick={() => {
            setActiveTab('payment');
            fetchPaymentHealth();
            loadPlanDetails();
          }}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold transition-all relative ${
            activeTab === 'payment'
              ? 'text-emerald-400 border-b-2 border-emerald-500'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShoppingCart className="w-4.5 h-4.5 text-indigo-400" />
          <span>Status Pembayaran</span>
        </button>
      </div>

      {/* ── Tab Content: PROFILE & QR MENU ──────────────────────────────────── */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Block: Business Form (Colspan-2) */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            <form onSubmit={handleSaveProfile} className="bg-slate-900 border border-slate-850 rounded-2xl p-6 flex flex-col gap-6">
              
              <div className="border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-white">Identitas UMKM</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Informasi utama bisnis yang akan ditampilkan pada halaman menu pelanggan.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Business Name */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Nama Bisnis *</label>
                  <input
                    type="text"
                    required
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="Contoh: Warung Kopi Nusantara"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-655 focus:outline-none focus:border-emerald-500/50 transition-all"
                  />
                </div>

                {/* Business Type */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Kategori / Tipe Bisnis</label>
                  <select
                    value={businessType}
                    onChange={(e) => setBusinessType(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500/50 transition-all"
                  >
                    {BUSINESS_CATEGORY_OPTIONS.map((category) => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>

                {businessType === 'Lainnya' && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Kategori Usaha Lainnya</label>
                    <input
                      type="text"
                      required
                      value={customBusinessType}
                      onChange={(e) => setCustomBusinessType(e.target.value)}
                      placeholder="Contoh: Barbershop, Bengkel Motor, Katering Rumahan"
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-655 focus:outline-none focus:border-emerald-500/50 transition-all"
                    />
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Link Order Publik</label>
                  <input
                    type="text"
                    value={businessSlug ? `/order/${businessSlug}` : 'Buat Link Order'}
                    readOnly
                    className="w-full px-3.5 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-emerald-300 font-mono focus:outline-none"
                  />
                </div>

                {/* Logo Upload */}
                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Logo Bisnis</label>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoFileChange}
                    className="hidden"
                  />
                  <div className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-950 p-4">
                    <div className="flex items-center gap-4">
                      <div className="relative h-20 w-20 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
                        {logoUrl ? (
                          <Image
                            src={logoUrl}
                            alt="Logo bisnis"
                            fill
                            sizes="80px"
                            unoptimized
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[10px] font-bold uppercase text-slate-500">
                            Logo
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-white">Upload logo dari perangkat</p>
                        <p className="mt-1 text-[10px] text-slate-500">Format PNG, JPG, atau WEBP. Maksimal 2 MB.</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => logoInputRef.current?.click()}
                        disabled={isLogoUploading}
                        className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-3.5 py-2 text-xs font-bold text-slate-950 transition-all hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Upload className="h-3.5 w-3.5" />
                        <span>{isLogoUploading ? 'Mengunggah...' : 'Upload Logo'}</span>
                      </button>
                      {logoUrl && (
                        <button
                          type="button"
                          onClick={() => setLogoUrl('')}
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-xs font-bold text-slate-300 transition-all hover:text-white"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Hapus Logo</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Slogan / Deskripsi Singkat</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Contoh: Pesan menu favorit kamu langsung dari meja."
                    rows={2}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-655 focus:outline-none focus:border-emerald-500/50 transition-all resize-none"
                  />
                </div>
              </div>

              <div className="border-b border-slate-800 pb-3 pt-2">
                <h3 className="text-sm font-bold text-white">Operasional &amp; Kontak</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Kontak WhatsApp dan alamat untuk mempermudah pelanggan menghubungi Anda.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* WA Number */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Nomor WhatsApp *</label>
                  <input
                    type="text"
                    required
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    placeholder="Contoh: 081234567890"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-655 focus:outline-none focus:border-emerald-500/50 transition-all"
                  />
                </div>

                {/* Opening Hours */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Jam Operasional</label>
                  <input
                    type="text"
                    value={openingHours}
                    onChange={(e) => setOpeningHours(e.target.value)}
                    placeholder="Contoh: 08.00 - 22.00"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-655 focus:outline-none focus:border-emerald-500/50 transition-all"
                  />
                </div>

                {/* Address */}
                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Alamat Toko</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Contoh: Jl. Nusantara No. 88, Jakarta"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-655 focus:outline-none focus:border-emerald-500/50 transition-all"
                  />
                </div>
              </div>

              <div className="border-b border-slate-800 pb-3 pt-2">
                <h3 className="text-sm font-bold text-white">Pajak &amp; Biaya Layanan</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Konfigurasi tambahan biaya transaksi lokal yang akan dikenakan di kasir dan menu.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-950/40 p-4 rounded-xl border border-slate-850">
                {/* Tax Switch */}
                <div className="flex flex-col justify-between gap-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-200">Biaya Pajak Daerah (PPN/PB1)</h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">Tambahkan nilai pajak ke subtotal pembelanjaan.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={taxEnabled}
                        onChange={(e) => setTaxEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500 peer-checked:after:bg-slate-950 peer-checked:after:border-emerald-500"></div>
                    </label>
                  </div>

                  {taxEnabled && (
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={taxPercentage}
                        onChange={(e) => setTaxPercentage(Number(e.target.value))}
                        className="w-20 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white text-center focus:outline-none focus:border-emerald-500"
                      />
                      <span className="text-xs text-slate-400">%</span>
                    </div>
                  )}
                </div>

                {/* Service Charge Switch */}
                <div className="flex flex-col justify-between gap-3 border-t md:border-t-0 md:border-l border-slate-850 pt-4 md:pt-0 md:pl-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-200">Biaya Layanan (Service Charge)</h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">Tambahkan biaya pelayanan (staff/dapur) ke struk.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={serviceChargeEnabled}
                        onChange={(e) => setServiceChargeEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500 peer-checked:after:bg-slate-950 peer-checked:after:border-emerald-500"></div>
                    </label>
                  </div>

                  {serviceChargeEnabled && (
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={serviceChargePercentage}
                        onChange={(e) => setServiceChargePercentage(Number(e.target.value))}
                        className="w-20 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white text-center focus:outline-none focus:border-emerald-500"
                      />
                      <span className="text-xs text-slate-400">%</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-b border-slate-800 pb-3 pt-2">
                <h3 className="text-sm font-bold text-white">Pengaturan Delivery</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Konfigurasi opsi pengiriman, ongkos kirim, gratis ongkir, dan biaya admin delivery.</p>
              </div>

              <div className="flex flex-col gap-5 bg-slate-950/40 p-4 rounded-xl border border-slate-850">
                {/* Delivery Option Switch */}
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-200">Aktifkan Layanan Delivery</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">Ijinkan pelanggan memilih opsi pengiriman kurir toko saat checkout.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={deliveryEnabled}
                      onChange={(e) => setDeliveryEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500 peer-checked:after:bg-slate-950 peer-checked:after:border-emerald-500"></div>
                  </label>
                </div>

                {deliveryEnabled && (
                  <div className="flex flex-col gap-5 pt-3 border-t border-slate-850/50">
                    
                    {/* Tipe Ongkir Picker */}
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Tipe Perhitungan Ongkos Kirim</label>
                      <div className="flex gap-2.5">
                        <button
                          type="button"
                          onClick={() => setDeliveryFeeCalculationType('fixed')}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            deliveryFeeCalculationType === 'fixed'
                              ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          Flat / Tetap
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeliveryFeeCalculationType('distance_based')}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            deliveryFeeCalculationType === 'distance_based'
                              ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          Berdasarkan Jarak KM
                        </button>
                      </div>
                    </div>

                    {deliveryFeeCalculationType === 'fixed' ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-850/50 pt-4">
                        {/* Delivery Fee Section */}
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <h5 className="text-[11px] font-bold text-slate-300">Biaya Ongkos Kirim (Ongkir)</h5>
                              <p className="text-[9px] text-slate-550">Terapkan tarif flat untuk setiap pengiriman.</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer scale-90">
                              <input
                                type="checkbox"
                                checked={deliveryFeeEnabled}
                                onChange={(e) => setDeliveryFeeEnabled(e.target.checked)}
                                className="sr-only peer"
                              />
                              <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500 peer-checked:after:bg-slate-950 peer-checked:after:border-emerald-500"></div>
                            </label>
                          </div>
                          {deliveryFeeEnabled && (
                            <div className="mt-1">
                              <input
                                type="number"
                                min="0"
                                value={deliveryFeeAmount}
                                onChange={(e) => setDeliveryFeeAmount(Number(e.target.value))}
                                placeholder="10000"
                                className="w-full max-w-[200px] px-3.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-655 focus:outline-none focus:border-emerald-500"
                              />
                              <span className="text-[10px] text-slate-500 block mt-1">Nominal ongkir flat dalam Rupiah (Rp).</span>
                            </div>
                          )}
                        </div>

                        {/* Free Delivery Section */}
                        <div className="flex flex-col gap-2 border-t md:border-t-0 md:border-l border-slate-850/60 pt-4 md:pt-0 md:pl-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h5 className="text-[11px] font-bold text-slate-300">Gratis Ongkir</h5>
                              <p className="text-[9px] text-slate-550">Gratiskan ongkir dengan minimal pembelian tertentu.</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer scale-90">
                              <input
                                type="checkbox"
                                checked={freeDeliveryEnabled}
                                onChange={(e) => setFreeDeliveryEnabled(e.target.checked)}
                                className="sr-only peer"
                              />
                              <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500 peer-checked:after:bg-slate-950 peer-checked:after:border-emerald-500"></div>
                            </label>
                          </div>
                          {freeDeliveryEnabled && (
                            <div className="mt-1 flex flex-col gap-1.5">
                              <input
                                type="number"
                                min="0"
                                value={freeDeliveryMinimumAmount}
                                onChange={(e) => setFreeDeliveryMinimumAmount(Number(e.target.value))}
                                placeholder="50000"
                                className="w-full max-w-[200px] px-3.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-655 focus:outline-none focus:border-emerald-500"
                              />
                              <p className="text-[9px] text-amber-400 italic">
                                💡 Gratis ongkir akan otomatis diterapkan apabila subtotal belanja pelanggan &ge; {formatRupiah(freeDeliveryMinimumAmount)}.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-4 border-t border-slate-850/50 pt-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Biaya Dasar Ongkir */}
                          <div className="flex flex-col gap-1">
                            <label className="text-[11px] font-bold text-slate-300">Biaya Dasar Ongkir (Rp)</label>
                            <input
                              type="number"
                              min="0"
                              value={baseDeliveryFee}
                              onChange={(e) => setBaseDeliveryFee(Number(e.target.value))}
                              className="w-full max-w-[200px] px-3.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-655 focus:outline-none focus:border-emerald-500"
                            />
                            <span className="text-[10px] text-slate-500 block">Biaya dasar minimum untuk jarak awal.</span>
                          </div>

                          {/* Jarak Termasuk Biaya Dasar */}
                          <div className="flex flex-col gap-1 border-t md:border-t-0 md:border-l border-slate-850/60 pt-4 md:pt-0 md:pl-4">
                            <label className="text-[11px] font-bold text-slate-300">Jarak Termasuk Biaya Dasar (KM)</label>
                            <input
                              type="number"
                              min="0"
                              step="0.1"
                              value={baseDeliveryDistanceKm}
                              onChange={(e) => setBaseDeliveryDistanceKm(Number(e.target.value))}
                              className="w-full max-w-[200px] px-3.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-655 focus:outline-none focus:border-emerald-500"
                            />
                            <span className="text-[10px] text-slate-500 block">Jarak awal (KM) yang dicover biaya dasar.</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-850/50 pt-4">
                          {/* Biaya per KM Tambahan */}
                          <div className="flex flex-col gap-1">
                            <label className="text-[11px] font-bold text-slate-300">Biaya per KM Tambahan (Rp)</label>
                            <input
                              type="number"
                              min="0"
                              value={deliveryFeePerKm}
                              onChange={(e) => setDeliveryFeePerKm(Number(e.target.value))}
                              className="w-full max-w-[200px] px-3.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-655 focus:outline-none focus:border-emerald-500"
                            />
                            <span className="text-[10px] text-slate-500 block">Biaya tambahan per KM setelah jarak dasar terlampaui.</span>
                          </div>

                          {/* Maksimal Jarak Delivery */}
                          <div className="flex flex-col gap-1 border-t md:border-t-0 md:border-l border-slate-850/60 pt-4 md:pt-0 md:pl-4">
                            <label className="text-[11px] font-bold text-slate-300">Maksimal Jarak Delivery (KM)</label>
                            <input
                              type="number"
                              min="1"
                              value={maxDeliveryDistanceKm}
                              onChange={(e) => setMaxDeliveryDistanceKm(Number(e.target.value))}
                              className="w-full max-w-[200px] px-3.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-655 focus:outline-none focus:border-emerald-500"
                            />
                            <span className="text-[10px] text-slate-500 block">Batas jarak maksimal pengiriman dari toko.</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-850/50 pt-4">
                          {/* Pembulatan Jarak */}
                          <div className="flex flex-col gap-1">
                            <label className="text-[11px] font-bold text-slate-300">Pembulatan Jarak</label>
                            <select
                              value={distanceRoundingMode}
                              onChange={(e) => setDistanceRoundingMode(e.target.value as 'ceil' | 'round' | 'floor')}
                              className="w-full max-w-[200px] px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500 font-sans"
                            >
                              <option value="ceil">Ke atas (Ceil)</option>
                              <option value="round">Terdekat (Round)</option>
                              <option value="floor">Ke bawah (Floor)</option>
                            </select>
                            <span className="text-[10px] text-slate-500 block">Aturan pembulatan jarak desimal ke KM terdekat.</span>
                          </div>

                          {/* Mode Hitung Jarak */}
                          <div className="flex flex-col gap-1 border-t md:border-t-0 md:border-l border-slate-850/60 pt-4 md:pt-0 md:pl-4">
                            <label className="text-[11px] font-bold text-slate-300">Mode Hitung Jarak</label>
                            <select
                              value={distanceCalculationMode}
                              onChange={(e) => setDistanceCalculationMode(e.target.value as 'manual' | 'mock' | 'maps_api_later')}
                              className="w-full max-w-[200px] px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500 font-sans"
                            >
                              <option value="manual">Manual untuk Demo</option>
                              <option value="mock">Simulasi / Mock</option>
                              <option value="maps_api_later">Maps API Nanti</option>
                            </select>
                            <span className="text-[10px] text-slate-500 block">Bagaimana jarak dihitung di halaman checkout.</span>
                          </div>
                        </div>

                        {/* Free Delivery Section for Distance-based */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-850/50 pt-4">
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                              <div>
                                <h5 className="text-[11px] font-bold text-slate-300">Gratis Ongkir</h5>
                                <p className="text-[9px] text-slate-550">Gratiskan ongkir dengan minimal pembelian tertentu.</p>
                              </div>
                              <label className="relative inline-flex items-center cursor-pointer scale-90">
                                <input
                                  type="checkbox"
                                  checked={freeDeliveryEnabled}
                                  onChange={(e) => setFreeDeliveryEnabled(e.target.checked)}
                                  className="sr-only peer"
                                />
                                <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500 peer-checked:after:bg-slate-950 peer-checked:after:border-emerald-500"></div>
                              </label>
                            </div>
                            {freeDeliveryEnabled && (
                              <div className="mt-1 flex flex-col gap-1.5">
                                <input
                                  type="number"
                                  min="0"
                                  value={freeDeliveryMinimumAmount}
                                  onChange={(e) => setFreeDeliveryMinimumAmount(Number(e.target.value))}
                                  placeholder="50000"
                                  className="w-full max-w-[200px] px-3.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-655 focus:outline-none focus:border-emerald-500"
                                />
                                <p className="text-[9px] text-amber-400 italic">
                                  💡 Gratis ongkir akan otomatis diterapkan apabila subtotal belanja pelanggan &ge; {formatRupiah(freeDeliveryMinimumAmount)}.
                                </p>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex flex-col justify-center border-t md:border-t-0 md:border-l border-slate-850/60 pt-4 md:pt-0 md:pl-4 text-[10px] text-slate-450 italic font-sans leading-relaxed">
                            📢 <strong>Informasi:</strong> Saat ini jarak masih dihitung manual/simulasi. Integrasi Maps API akan dilakukan setelah database dan backend siap.
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Delivery Admin Fee Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-850/50 pt-4">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <h5 className="text-[11px] font-bold text-slate-300">Biaya Admin Delivery</h5>
                            <p className="text-[9px] text-slate-550">Biaya tambahan penanganan/packaging kiriman.</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer scale-90">
                            <input
                              type="checkbox"
                              checked={deliveryAdminFeeEnabled}
                              onChange={(e) => setDeliveryAdminFeeEnabled(e.target.checked)}
                              className="sr-only peer"
                            />
                            <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500 peer-checked:after:bg-slate-950 peer-checked:after:border-emerald-500"></div>
                          </label>
                        </div>
                        {deliveryAdminFeeEnabled && (
                          <div className="mt-2 flex flex-col gap-2.5">
                            <div className="flex gap-2">
                              <button
                                key="btn-fixed"
                                type="button"
                                onClick={() => setDeliveryAdminFeeType('fixed')}
                                className={`px-2.5 py-1 rounded text-[10px] font-bold border transition-all cursor-pointer ${
                                  deliveryAdminFeeType === 'fixed'
                                    ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                                }`}
                              >
                                Nominal (Rp)
                              </button>
                              <button
                                key="btn-pct"
                                type="button"
                                onClick={() => setDeliveryAdminFeeType('percentage')}
                                className={`px-2.5 py-1 rounded text-[10px] font-bold border transition-all cursor-pointer ${
                                  deliveryAdminFeeType === 'percentage'
                                    ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                                }`}
                              >
                                Persentase (%)
                              </button>
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min="0"
                                value={deliveryAdminFeeValue}
                                onChange={(e) => setDeliveryAdminFeeValue(Number(e.target.value))}
                                className="w-32 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white text-center focus:outline-none focus:border-emerald-500"
                              />
                              <span className="text-xs text-slate-400">
                                {deliveryAdminFeeType === 'percentage' ? '%' : 'Rupiah (Rp)'}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Delivery Instructions Section */}
                      <div className="flex flex-col gap-2 border-t md:border-t-0 md:border-l border-slate-850/60 pt-4 md:pt-0 md:pl-4">
                        <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Instruksi Pengiriman</label>
                        <textarea
                          value={deliveryInstruction}
                          onChange={(e) => setDeliveryInstruction(e.target.value)}
                          placeholder="Contoh: Pesanan delivery akan dikonfirmasi oleh kasir sebelum dikirim."
                          rows={2.5}
                          className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-655 focus:outline-none focus:border-emerald-500/50 transition-all resize-none font-sans"
                        />
                        <span className="text-[9px] text-slate-500 block">Pesan khusus/petunjuk yang akan ditampilkan pada halaman sukses order pelanggan.</span>
                      </div>
                    </div>

                  </div>
                )}
              </div>

              {/* ── ETA Settings Section ─────────────────────────────────── */}
              <div className="border-b border-slate-800 pb-3 pt-2">
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span>Estimasi Waktu Pesanan (ETA)</span>
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Tampilkan perkiraan waktu siap/sampai kepada pelanggan berdasarkan aturan waktu sederhana.</p>
              </div>

              <div className="flex flex-col gap-5 bg-slate-950/40 p-4 rounded-xl border border-slate-850">
                {/* ETA Enable Toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-200">Aktifkan Estimasi Waktu</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">Tampilkan ETA kepada pelanggan di halaman order, sukses, dan struk digital.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={etaEnabled}
                      onChange={(e) => setEtaEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500 peer-checked:after:bg-slate-950 peer-checked:after:border-amber-500"></div>
                  </label>
                </div>

                {etaEnabled && (
                  <div className="flex flex-col gap-4 pt-3 border-t border-slate-850/50">
                    {/* Display Mode */}
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Tampilan ETA</label>
                      <div className="flex gap-2">
                        {([
                          { value: 'minutes_only', label: 'Menit Saja' },
                          { value: 'estimated_time', label: 'Jam Perkiraan' },
                          { value: 'both', label: 'Keduanya' },
                        ] as { value: EtaDisplayMode; label: string }[]).map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setEtaDisplayMode(opt.value)}
                            className={`px-3 py-1.5 rounded-xl text-[10px] font-bold border transition-all cursor-pointer ${
                              etaDisplayMode === opt.value
                                ? 'bg-amber-500/10 border-amber-500 text-amber-400'
                                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Numeric Inputs Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Waktu Persiapan (mnt)</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number" min="1" max="120"
                            value={defaultPreparationMinutes}
                            onChange={(e) => setDefaultPreparationMinutes(Number(e.target.value))}
                            className="w-20 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white text-center focus:outline-none focus:border-amber-500"
                          />
                          <span className="text-[10px] text-slate-500">menit</span>
                        </div>
                        <span className="text-[9px] text-slate-600">Waktu dasar penyiapan semua order</span>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Buffer Jam Sibuk (mnt)</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number" min="0" max="60"
                            value={rushHourBufferMinutes}
                            onChange={(e) => setRushHourBufferMinutes(Number(e.target.value))}
                            className="w-20 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white text-center focus:outline-none focus:border-amber-500"
                          />
                          <span className="text-[10px] text-slate-500">menit</span>
                        </div>
                        <span className="text-[9px] text-slate-600">Ditambahkan ke semua tipe order</span>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Buffer Dine-in (mnt)</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number" min="0" max="30"
                            value={dineInServingBufferMinutes}
                            onChange={(e) => setDineInServingBufferMinutes(Number(e.target.value))}
                            className="w-20 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white text-center focus:outline-none focus:border-amber-500"
                          />
                          <span className="text-[10px] text-slate-500">menit</span>
                        </div>
                        <span className="text-[9px] text-slate-600">Waktu antar ke meja (dine-in)</span>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Buffer Pickup (mnt)</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number" min="0" max="30"
                            value={pickupBufferMinutes}
                            onChange={(e) => setPickupBufferMinutes(Number(e.target.value))}
                            className="w-20 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white text-center focus:outline-none focus:border-amber-500"
                          />
                          <span className="text-[10px] text-slate-500">menit</span>
                        </div>
                        <span className="text-[9px] text-slate-600">Waktu tambahan untuk ambil di toko</span>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Waktu Antar Awal (mnt)</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number" min="1" max="60"
                            value={deliveryBaseMinutes}
                            onChange={(e) => setDeliveryBaseMinutes(Number(e.target.value))}
                            className="w-20 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white text-center focus:outline-none focus:border-amber-500"
                          />
                          <span className="text-[10px] text-slate-500">menit</span>
                        </div>
                        <span className="text-[9px] text-slate-600">Waktu minimum pengiriman delivery</span>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Waktu / KM (mnt)</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number" min="1" max="30"
                            value={deliveryMinutesPerKm}
                            onChange={(e) => setDeliveryMinutesPerKm(Number(e.target.value))}
                            className="w-20 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white text-center focus:outline-none focus:border-amber-500"
                          />
                          <span className="text-[10px] text-slate-500">mnt/km</span>
                        </div>
                        <span className="text-[9px] text-slate-600">Tambahan waktu per kilometer</span>
                      </div>
                    </div>

                    {/* Formula Preview */}
                    <div className="bg-slate-950 border border-amber-500/10 rounded-xl p-3 flex flex-col gap-1.5">
                      <p className="text-[9px] font-mono text-amber-400/60 uppercase tracking-wider">Pratinjau Formula</p>
                      <div className="flex flex-col gap-1 text-[10px] text-slate-400 font-mono">
                        <span>Dine-in: {defaultPreparationMinutes} + {rushHourBufferMinutes} + {dineInServingBufferMinutes} = <span className="text-amber-400 font-bold">{defaultPreparationMinutes + rushHourBufferMinutes + dineInServingBufferMinutes} mnt</span></span>
                        <span>Pickup: {defaultPreparationMinutes} + {rushHourBufferMinutes} + {pickupBufferMinutes} = <span className="text-amber-400 font-bold">{defaultPreparationMinutes + rushHourBufferMinutes + pickupBufferMinutes} mnt</span></span>
                        <span>Delivery (2km): {defaultPreparationMinutes} + {rushHourBufferMinutes} + ({deliveryBaseMinutes} + 2×{deliveryMinutesPerKm}) = <span className="text-amber-400 font-bold">{defaultPreparationMinutes + rushHourBufferMinutes + deliveryBaseMinutes + 2 * deliveryMinutesPerKm} mnt</span></span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Form Action Buttons */}

              <div className="flex gap-3 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleResetProfile}
                  disabled={isActionLoading}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-350 hover:text-white font-bold text-xs transition-all flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Default</span>
                </button>
                <button
                  type="submit"
                  disabled={isActionLoading}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-bold text-xs transition-all shadow-md hover:shadow-emerald-500/10 flex items-center justify-center gap-2"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isActionLoading ? 'Menyimpan...' : 'Simpan Pengaturan'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Right Block: QR Menu Preview Generator */}
          <div className="flex flex-col gap-6">
            <div className="bg-slate-900 border border-slate-850 rounded-2xl p-6 flex flex-col gap-5">
              
              <div className="border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <QrCode className="w-4 h-4 text-emerald-400" />
                  <span>QR Menu &amp; Order</span>
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Tautan digital menu pelanggan mandiri.</p>
              </div>

              {/* QR Preview Wrapper */}
              <div className="flex flex-col items-center justify-center p-6 bg-slate-950 rounded-xl border border-slate-850">
                <div className="p-4 bg-white rounded-2xl shadow-xl flex items-center justify-center aspect-square">
                  {orderLink ? (
                    <QRCode
                      id="qr-code-svg"
                      value={orderLink}
                      size={180}
                      level="H"
                      className="w-full h-full"
                    />
                  ) : (
                    <div className="w-40 h-40 bg-slate-900 animate-pulse rounded-lg" />
                  )}
                </div>
                <div className="text-center mt-4">
                  <h4 className="text-xs font-black text-white">{businessName}</h4>
                  <p className="text-[9px] text-slate-500 font-mono mt-0.5 truncate max-w-xs">{orderLink || 'Link order belum dibuat'}</p>
                </div>
              </div>

              {/* Copy / Download Buttons */}
              <div className="flex flex-col gap-2.5">
                {!orderLink && (
                  <button
                    type="button"
                    onClick={handleCreateOrderLink}
                    disabled={isActionLoading}
                    className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>Buat Link Order</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleCopyLink}
                  disabled={!orderLink}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs rounded-xl border border-slate-700 transition-all flex items-center justify-center gap-2"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Salin Link Order</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadQR}
                  disabled={!orderLink}
                  className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh QR (Vector SVG)</span>
                </button>
              </div>

              {/* Instructions text */}
              <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-850 text-[10px] text-slate-500 leading-relaxed">
                <strong className="text-slate-400">Petunjuk Penggunaan:</strong>
                <p className="mt-1">
                  Cetak file QR code ini dan letakkan di meja kasir atau meja pelanggan. Pelanggan cukup memindai (scan) QR ini menggunakan kamera HP untuk langsung memesan menu mandiri.
                </p>
              </div>

            </div>
          </div>

        </div>
      )}

      {/* ── Tab Content: DEVELOPER DEMO TOOLS ────────────────────────────────── */}
      {activeTab === 'demo' && isDeveloperAccount && (
        <div className="flex flex-col gap-6 animate-in fade-in duration-100">
          
          {/* Stats Summary */}
          <div className="bg-slate-900 border border-slate-850 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest font-bold">
                Status Data Saat Ini
              </span>
              <button
                onClick={handleRefreshStats}
                className="flex items-center gap-1.5 text-[10px] text-slate-500 hover:text-emerald-400 transition-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>Perbarui</span>
              </button>
            </div>

            {stats ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {/* Products */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center">
                      <Package className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">Produk</span>
                  </div>
                  <span className="text-xl font-black text-white">{stats.totalProducts}</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/15 font-bold">
                      {stats.activeProducts} aktif
                    </span>
                    {stats.lowStockCount > 0 && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/15 font-bold">
                        {stats.lowStockCount} menipis
                      </span>
                    )}
                    {stats.outOfStockCount > 0 && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/15 font-bold">
                        {stats.outOfStockCount} habis
                      </span>
                    )}
                  </div>
                </div>

                {/* Orders */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center">
                      <ShoppingCart className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">Total Pesanan</span>
                  </div>
                  <span className="text-xl font-black text-white">{stats.totalOrders}</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 font-bold">
                      {stats.todayOrdersCount} hari ini
                    </span>
                  </div>
                </div>

                {/* Active Queue */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center">
                      <ListOrdered className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">Antrean Aktif</span>
                  </div>
                  <span className="text-xl font-black text-white">{stats.activeOrdersCount}</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/15 font-bold">
                      {stats.completedOrdersCount} selesai
                    </span>
                    {stats.cancelledOrdersCount > 0 && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-500 border border-slate-700 font-bold">
                        {stats.cancelledOrdersCount} batal
                      </span>
                    )}
                  </div>
                </div>

                {/* Revenue */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">Omzet Hari Ini</span>
                  </div>
                  <span className="text-xl font-black text-emerald-400">
                    {stats.todayRevenue > 0 ? formatRupiah(stats.todayRevenue) : '—'}
                  </span>
                  <span className="text-[9px] text-slate-655 mt-1">pesanan lunas + selesai</span>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-16 rounded-xl bg-slate-800 animate-pulse" />
                ))}
              </div>
            )}
          </div>

          {/* Action Zone: Danger */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-slate-850" />
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest px-3">
                Aksi Berbahaya
              </span>
              <div className="h-px flex-1 bg-slate-850" />
            </div>
            <p className="text-[11px] text-slate-500 text-center">
              Tindakan di bawah bersifat permanen dan tidak dapat dibatalkan.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Reset All */}
              <div className="bg-rose-950/20 border border-rose-500/20 rounded-2xl p-5 flex flex-col gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-rose-500/10 flex items-center justify-center flex-shrink-0">
                    <RotateCcw className="w-4.5 h-4.5 text-rose-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Reset Semua Data</h3>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                      Hapus seluruh pesanan dan kembalikan 7 produk seed ke kondisi awal. Cocok untuk memulai demo dari awal.
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleResetAll}
                  disabled={isActionLoading}
                  className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs transition-all flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset Semua Data
                </button>
              </div>

              {/* Clear Orders */}
              <div className="bg-amber-950/10 border border-amber-500/20 rounded-2xl p-5 flex flex-col gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                    <Trash2 className="w-4.5 h-4.5 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Bersihkan Semua Pesanan</h3>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                      Hapus seluruh riwayat pesanan dan antrean kasir. Katalog produk dan stok tidak terpengaruh.
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleClearOrders}
                  disabled={isActionLoading}
                  className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-bold text-xs transition-all flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Bersihkan Pesanan</span>
                </button>
              </div>
            </div>
          </div>

          {/* Action Zone: Generate */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-slate-850" />
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest px-3">
                Generate Data Demo
              </span>
              <div className="h-px flex-1 bg-slate-850" />
            </div>
            <p className="text-[11px] text-slate-500 text-center">
              Isi database lokal dengan data contoh yang realistis untuk pengujian sistem.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Generate Orders */}
              <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-2xl p-5 flex flex-col gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                    <Zap className="w-4.5 h-4.5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Buat Pesanan Contoh</h3>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                      Buat 8 pesanan hari ini dengan rincian biaya pajak & layanan (jika aktif). Mengisi kasir, dashboard, transaksi, dan insights.
                    </p>
                  </div>
                </div>

                <div className="bg-slate-950/40 rounded-xl border border-slate-900 p-3 flex flex-col gap-1.5">
                  <span className="text-[9px] font-mono text-emerald-400/80 uppercase font-bold tracking-widest mb-1">
                    Rincian data:
                  </span>
                  {[
                    { label: '3 pesanan Selesai', sub: 'Pendapatan langsung', color: 'text-emerald-400' },
                    { label: '3 pesanan Aktif', sub: 'Dapur & kasir', color: 'text-blue-400' },
                    { label: '1 pesanan Menunggu', sub: 'Antrean kasir', color: 'text-amber-400' },
                    { label: '1 pesanan Batal', sub: 'Stok dipulihkan', color: 'text-slate-500' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <ChevronRight className={`w-3 h-3 flex-shrink-0 ${item.color}`} />
                      <span className="text-[10px] text-slate-350 font-semibold">{item.label}</span>
                      <span className="text-[9px] text-slate-600">{item.sub}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleGenerateSampleOrders}
                  disabled={isActionLoading}
                  className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-bold text-xs transition-all shadow-lg hover:shadow-emerald-500/20 flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Generate Pesanan Demo
                </button>
              </div>

              {/* Low Stock Demo */}
              <div className="bg-amber-950/10 border border-amber-500/20 rounded-2xl p-5 flex flex-col gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-4.5 h-4.5 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Simulasi Stok Kritis</h3>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                      Set 3 produk ke stok menipis (2-4 unit) untuk memicu peringatan sistem di dashboard dan halaman inventaris.
                    </p>
                  </div>
                </div>

                <div className="bg-slate-950/40 rounded-xl border border-slate-900 p-3 flex flex-col gap-1.5">
                  <span className="text-[9px] font-mono text-amber-400/80 uppercase font-bold tracking-widest mb-1">
                    Produk target:
                  </span>
                  {[
                    { name: 'Es Kopi Susu Gula Aren', stock: '4 unit' },
                    { name: 'Roti Bakar Cokelat Keju', stock: '3 unit' },
                    { name: 'Paket Kenyang A', stock: '2 unit' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-3 h-3 text-amber-400 flex-shrink-0" />
                        <span className="text-[10px] text-slate-350">{item.name}</span>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-amber-400">{item.stock}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleSetLowStock}
                  disabled={isActionLoading}
                  className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-bold text-xs transition-all flex items-center justify-center gap-2"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Simulasikan Stok Kritis
                </button>
              </div>
            </div>
          </div>

          {/* Action Zone: Recovery */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-slate-850" />
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest px-3">
                Pemulihan Data
              </span>
              <div className="h-px flex-1 bg-slate-850" />
            </div>

            <div className="bg-blue-950/10 border border-blue-500/20 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-5">
              <div className="flex items-start gap-3 flex-1">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                  <PackageOpen className="w-4.5 h-4.5 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Pulihkan Katalog Produk</h3>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    Kembalikan 7 produk seed ke kondisi awal beserta stok semula. Riwayat pesanan tidak terpengaruh.
                  </p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {['Es Kopi Susu', 'Nasi Geprek', 'Mie Goreng', 'Roti Bakar', 'Es Teh', 'Kopi Hitam', 'Paket Kenyang'].map(
                      (name) => (
                        <span
                          key={name}
                          className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700"
                        >
                          {name}
                        </span>
                      ),
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={handleRestoreProducts}
                disabled={isActionLoading}
                className="flex-shrink-0 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs transition-all flex items-center gap-2 w-full sm:w-auto"
              >
                <PackageOpen className="w-3.5 h-3.5" />
                Pulihkan Produk
              </button>
            </div>
          </div>

          {/* ── Supabase Migration Panel ──────────────────────────────────────── */}
          <div className="bg-slate-900 border border-blue-500/20 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                <Database className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Migrasi Data Demo ke Supabase</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {isSupabaseActive
                    ? 'Import data lokal ke Supabase. Hanya data yang belum ada yang akan diimpor.'
                    : 'Login dengan akun Supabase untuk mengaktifkan fitur migrasi data.'}
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleImportBusinessProfile}
                disabled={!isSupabaseActive || isMigrationLoading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs transition-all"
              >
                <Database className="w-3.5 h-3.5" />
                Import Profil Bisnis Demo
              </button>
              <button
                onClick={handleImportProducts}
                disabled={!isSupabaseActive || isMigrationLoading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs transition-all"
              >
                <Database className="w-3.5 h-3.5" />
                Import Produk Demo
              </button>
            </div>
            {!isSupabaseActive && (
              <p className="text-[10px] text-slate-500 mt-3 text-center">
                Tombol aktif hanya saat login Supabase aktif (bukan demo mode).
              </p>
            )}
          </div>

          <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-850 text-[11px] text-slate-500 leading-relaxed">
            <strong className="text-slate-400">Catatan Pengembang:</strong> Semua perubahan di tab ini memengaruhi database localStorage lokal browser secara langsung. Refresh tab lainnya untuk memvalidasi perubahan Anda.
          </div>
        </div>
      )}
      {activeTab === 'payment' && (
        <div className="space-y-6 animate-fade-in">
          {/* Paket Bisnis Panel */}
          <div className="bg-slate-900 border border-slate-850 rounded-2xl p-6 shadow-xl flex flex-col gap-6">
            <div className="border-b border-slate-800 pb-3 flex justify-between items-center">
              <div>
                <h2 className="text-sm font-extrabold text-white flex items-center gap-2">
                  <Award className="w-5 h-5 text-emerald-450" />
                  <span>Paket Bisnis UMKM Anda</span>
                </h2>
                <p className="text-[11px] text-slate-400 mt-1">
                  Detail paket berlangganan SaaS yang aktif untuk pengelolaan limitasi dan fitur.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setUpgradeModalOpen(true)}
                className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-xs font-black text-slate-950 transition-all cursor-pointer shadow-md hover:shadow-emerald-500/10 border-none"
              >
                <span>Upgrade Paket</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Plan Info Card */}
              <div className="bg-slate-950/40 border border-slate-850 rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider block">Paket Aktif</span>
                  <h3 className="text-base font-black text-white mt-1 capitalize">
                    {activePlan ? activePlan.name : 'Free / Trial'}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                    {activePlan ? activePlan.description : 'Mencoba fitur dasar UMKM Pilot'}
                  </p>
                </div>
                <div className="border-t border-slate-850 pt-3 mt-4 flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 font-bold">Status subscription:</span>
                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    subDetails?.status === 'active' 
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}>
                    {subDetails?.status || 'active'}
                  </span>
                </div>
              </div>

              {/* Limits Card */}
              <div className="bg-slate-950/40 border border-slate-850 rounded-xl p-4 space-y-2.5">
                <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider block">Batasan Kuota / Limit</span>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Limit Produk:</span>
                  <span className="text-white font-bold">{activePlan ? activePlan.productLimit : 20} Produk</span>
                </div>
                <div className="flex justify-between items-center text-xs border-t border-slate-900 pt-2">
                  <span className="text-slate-400">Limit Pesanan:</span>
                  <span className="text-white font-bold">{activePlan ? activePlan.orderLimitMonthly : 100} / bln</span>
                </div>
                <div className="flex justify-between items-center text-xs border-t border-slate-900 pt-2">
                  <span className="text-slate-400">Limit Staf/Kasir:</span>
                  <span className="text-white font-bold">{activePlan ? activePlan.cashierLimit : 1} Akun</span>
                </div>
              </div>

              {/* Gating Status Card */}
              <div className="bg-slate-950/40 border border-slate-850 rounded-xl p-4 space-y-2.5">
                <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider block">Akses Fitur Utama</span>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Analisis AI Insights:</span>
                  <span className={activePlan?.aiEnabled ? 'text-emerald-400 font-bold' : 'text-slate-500 font-semibold'}>
                    {activePlan?.aiEnabled ? 'Tersedia' : 'Tidak Tersedia'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs border-t border-slate-900 pt-2">
                  <span className="text-slate-400">Midtrans Online Payment:</span>
                  <span className={activePlan?.midtransEnabled ? 'text-emerald-400 font-bold' : 'text-slate-500 font-semibold'}>
                    {activePlan?.midtransEnabled ? 'Tersedia' : 'Tidak Tersedia'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs border-t border-slate-900 pt-2">
                  <span className="text-slate-400">Ekspor Laporan (Excel/PDF):</span>
                  <span className={activePlan?.reportExportEnabled ? 'text-emerald-400 font-bold' : 'text-slate-500 font-semibold'}>
                    {activePlan?.reportExportEnabled ? 'Tersedia' : 'Tidak Tersedia'}
                  </span>
                </div>
              </div>
            </div>

            {subDetails?.trialEndsAt && (
              <div className="p-3.5 rounded-xl bg-indigo-500/5 border border-indigo-500/10 text-xs text-indigo-300">
                ⌛ Masa percobaan trial paket Anda akan berakhir pada tanggal <strong>{new Date(subDetails.trialEndsAt).toLocaleDateString('id-ID', { dateStyle: 'long' })}</strong>.
              </div>
            )}
          </div>

          {/* Health check header panel */}
          <div className="bg-slate-900 border border-slate-850 rounded-2xl p-6 shadow-xl flex flex-col gap-6">
            <div className="border-b border-slate-800 pb-3 flex justify-between items-center">
              <div>
                <h2 className="text-sm font-extrabold text-white flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-indigo-500" />
                  <span>Koneksi Midtrans &amp; Kesiapan Produksi</span>
                </h2>
                <p className="text-[11px] text-slate-400 mt-1">
                  Status integrasi gerbang pembayaran online (Online Payment Gateway) UMKM Pilot.
                </p>
              </div>
              <button
                type="button"
                onClick={fetchPaymentHealth}
                disabled={healthLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-xs font-bold text-slate-300 transition-all cursor-pointer border border-slate-750"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${healthLoading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>

            {healthLoading ? (
              <div className="text-slate-500 text-xs font-mono py-12 animate-pulse text-center">
                Mengecek konfigurasi sistem pembayaran...
              </div>
            ) : healthData ? (
              <div className="space-y-6">
                {/* Badges based on active environment */}
                <div>
                  {healthData.isProduction ? (
                    <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/8 flex items-center gap-3">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-xs font-black text-emerald-400">
                        Mode Production — transaksi nyata aktif
                      </span>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/8 flex items-center gap-3">
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                      <span className="text-xs font-black text-amber-400">
                        Mode Sandbox — tidak ada transaksi nyata
                      </span>
                    </div>
                  )}
                </div>

                {/* Warning message if production mode configured incorrectly */}
                {healthData.isProduction && healthData.productionEnabled && (
                  <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 text-xs text-amber-300 leading-relaxed font-semibold">
                    ⚠️ Pastikan webhook production, payment channel, dan settlement sudah diverifikasi di dashboard Midtrans Merchant.
                  </div>
                )}

                {/* Health parameters grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left Column: Technical Details */}
                  <div className="bg-slate-950/40 border border-slate-850 rounded-xl p-4 space-y-3">
                    <h3 className="text-xs font-bold text-indigo-400 mb-1">Rincian Integrasi</h3>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400">Provider:</span>
                      <span className="text-white font-semibold capitalize">{healthData.provider}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs border-t border-slate-900 pt-2.5">
                      <span className="text-slate-400">Environment:</span>
                      <span className="text-white font-semibold capitalize">{healthData.environment}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs border-t border-slate-900 pt-2.5">
                      <span className="text-slate-400">Online Payment:</span>
                      <span className={`font-bold ${healthData.canCreatePayment ? 'text-emerald-400' : 'text-rose-455'}`}>
                        {healthData.canCreatePayment ? 'Aktif' : 'Tidak Aktif'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs border-t border-slate-900 pt-2.5">
                      <span className="text-slate-400">Manual Sync:</span>
                      <span className="text-emerald-400 font-bold">Aktif</span>
                    </div>
                  </div>

                  {/* Right Column: Credentials check */}
                  <div className="bg-slate-950/40 border border-slate-850 rounded-xl p-4 space-y-3">
                    <h3 className="text-xs font-bold text-indigo-400 mb-1">Status Kredensial</h3>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400">Merchant ID:</span>
                      <span className={healthData.hasMerchantId ? 'text-emerald-400 font-bold' : 'text-slate-500 font-semibold'}>
                        {healthData.hasMerchantId ? 'Tersedia' : 'Kosong'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs border-t border-slate-900 pt-2.5">
                      <span className="text-slate-400">Client Key (Public):</span>
                      <span className={healthData.hasClientKey ? 'text-emerald-400 font-bold' : 'text-rose-455 font-bold'}>
                        {healthData.hasClientKey ? 'Tersedia' : 'Wajib Ada'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs border-t border-slate-900 pt-2.5">
                      <span className="text-slate-400">Server Key (Secret):</span>
                      <span className={healthData.hasServerKey ? 'text-emerald-400 font-bold' : 'text-rose-455 font-bold'}>
                        {healthData.hasServerKey ? 'Tersedia' : 'Wajib Ada'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs border-t border-slate-900 pt-2.5">
                      <span className="text-slate-400">Webhook Handshake:</span>
                      <span className="text-emerald-400 font-bold">Valid (SHA512)</span>
                    </div>
                  </div>
                </div>

                {/* URL and last webhook info */}
                <div className="bg-slate-950/40 border border-slate-850 rounded-xl p-4 space-y-3.5 text-xs">
                  <h3 className="text-xs font-bold text-indigo-400 mb-1">Rincian Endpoints</h3>
                  <div className="flex flex-col gap-1">
                    <span className="text-slate-500 font-semibold text-[9px] uppercase">Webhook Notification URL</span>
                    <span className="text-slate-200 font-mono text-[10.5px] select-all break-all">{healthData.webhookUrl}</span>
                  </div>
                  <div className="flex flex-col gap-1 border-t border-slate-900 pt-3">
                    <span className="text-slate-500 font-semibold text-[9px] uppercase">Webhook Terakhir Diterima</span>
                    <span className="text-slate-200 font-semibold">
                      {healthData.lastWebhookReceivedAt
                        ? new Date(healthData.lastWebhookReceivedAt).toLocaleString('id-ID')
                        : 'Belum ada webhook yang diterima (Menunggu transaksi pertama).'}
                    </span>
                  </div>
                </div>

                {/* Warning details list */}
                {healthData.warnings && healthData.warnings.length > 0 && (
                  <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/5 space-y-2">
                    <h4 className="text-xs font-black text-rose-400">Peringatan Konfigurasi:</h4>
                    <ul className="list-disc pl-4 text-xs text-rose-300 space-y-1">
                      {healthData.warnings.map((warn: string, idx: number) => (
                        <li key={idx}>{warn}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-rose-400 text-xs font-semibold py-8 text-center border border-rose-500/20 bg-rose-500/5 rounded-xl">
                Gagal memuat status kesehatan sistem pembayaran. Silakan periksa koneksi atau role login.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Confirmation Modal ────────────────────────────────────────────── */}
      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-150">

            {/* Modal Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${variantStyles[confirm.variant].iconBg}`}
                >
                  {confirm.variant === 'danger' && <RotateCcw className={`w-5 h-5 ${variantStyles[confirm.variant].icon}`} />}
                  {confirm.variant === 'warning' && <AlertTriangle className={`w-5 h-5 ${variantStyles[confirm.variant].icon}`} />}
                  {confirm.variant === 'info' && <PackageOpen className={`w-5 h-5 ${variantStyles[confirm.variant].icon}`} />}
                  {confirm.variant === 'success' && <Zap className={`w-5 h-5 ${variantStyles[confirm.variant].icon}`} />}
                </div>
                <h3 className="text-sm font-extrabold text-white">{confirm.title}</h3>
              </div>
              <button
                onClick={() => setConfirm(null)}
                className="text-slate-500 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Description */}
            <p className="text-xs text-slate-400 leading-relaxed">{confirm.description}</p>

            {/* Consequences list */}
            {confirm.consequences.length > 0 && (
              <div className={`p-3 rounded-xl border ${variantStyles[confirm.variant].border} bg-slate-950/30 flex flex-col gap-2`}>
                <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-500 mb-1">
                  Yang akan terjadi:
                </span>
                {confirm.consequences.map((c, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <ChevronRight className={`w-3 h-3 flex-shrink-0 mt-0.5 ${variantStyles[confirm.variant].icon}`} />
                    <span className="text-[11px] text-slate-300">{c}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Modal Action Buttons */}
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setConfirm(null)}
                className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-all"
              >
                Batal
              </button>
              <button
                onClick={confirm.onConfirm}
                className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-xs transition-all ${variantStyles[confirm.variant].button}`}
              >
                {confirm.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Upgrade Plan Modal */}
      {upgradeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                  <Award className="w-5 h-5 text-indigo-400" />
                </div>
                <h3 className="text-sm font-extrabold text-white">Upgrade Paket</h3>
              </div>
              <button
                onClick={() => setUpgradeModalOpen(false)}
                className="text-slate-500 hover:text-white transition-colors cursor-pointer border-none bg-transparent"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <p className="text-xs text-slate-400 leading-relaxed text-center py-4">
              Upgrade paket akan tersedia setelah versi production.
            </p>
            
            <button
              onClick={() => setUpgradeModalOpen(false)}
              className="py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all cursor-pointer border-none"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
