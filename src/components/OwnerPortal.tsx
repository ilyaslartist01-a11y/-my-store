import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Shield,
  ShoppingBag,
  KeyRound,
  LogOut,
  ArrowRight,
  Search,
  Ticket,
  Trash2,
  Plus,
  Palette,
  Shirt,
  Pencil,
  Eye,
  Mail,
  Truck,
  Send,
  X,
  Upload,
  RotateCcw,
} from 'lucide-react';
import type { User } from 'firebase/auth';
import type {
  ContactMessage,
  CurrencyCode,
  DeliveryRatesMap,
  Product,
  RadiusStyle,
  RequestStatus,
  SiteDesignConfig,
  StoreOrder,
  VipCoupon,
  VipRequestItem,
} from '../types';
import { CURRENCY_LABELS } from '../types';
import { ALGERIA_WILAYAS, buildDefaultDeliveryRates } from '../data/algeriaWilayas';
import { HERO_APPAREL_IMAGE } from '../data/catalog';
import { readHeroImageFile } from '../utils/imageUpload';
import { AddProductModal } from './AddProductModal';
import { GoogleSignInButton } from './GoogleSignInButton';
import {
  getGmailAccessToken,
  initGmailAuth,
  logoutGmail,
  sendOrderNotificationViaGmail,
  signInWithGoogleForGmail,
} from '../utils/gmailAuth';

interface OwnerPortalProps {
  ownerConfigured: boolean;
  ownerToken: string | null;
  initialTab?: OwnerTab;
  onOwnerAuthenticated: (token: string) => void;
  onOwnerLoggedOut: () => void;
  onDesignUpdated: (design: SiteDesignConfig) => void;
  onProductsUpdated: (products: Product[]) => void;
  onDeliveryRatesUpdated: (rates: DeliveryRatesMap) => void;
  onBackToStore: () => void;
}

export type OwnerTab =
  | 'products'
  | 'design'
  | 'delivery'
  | 'vip'
  | 'orders'
  | 'gmail'
  | 'messages'
  | 'security';
type RequestFilter = 'all' | RequestStatus;

const DESIGN_PRESETS: Array<{ name: string; values: Partial<SiteDesignConfig> }> = [
  {
    name: 'ماين كرافت — عشب وغابة وعظم',
    values: {
      bgColor: '#141812',
      surfaceColor: '#1E241A',
      textColor: '#F2ECE0',
      mutedColor: '#B0B5A6',
      accentColor: '#6BB83B',
      borderColor: '#34402C',
      radiusStyle: 'sharp',
    },
  },
  {
    name: 'ماين كرافت — طاولة الصنع والخشب',
    values: {
      bgColor: '#1A1510',
      surfaceColor: '#251E17',
      textColor: '#F3EDE0',
      mutedColor: '#B9AF9E',
      accentColor: '#D49A45',
      borderColor: '#423629',
      radiusStyle: 'sharp',
    },
  },
  {
    name: 'ماين كرافت — كهف الألماس والأوبسيديان',
    values: {
      bgColor: '#10161B',
      surfaceColor: '#182128',
      textColor: '#ECF4F6',
      mutedColor: '#98ACB4',
      accentColor: '#43D4C8',
      borderColor: '#2B3A45',
      radiusStyle: 'sharp',
    },
  },
  {
    name: 'أوبسيديان داكن وذهبي',
    values: {
      bgColor: '#0D0E10',
      surfaceColor: '#15171A',
      textColor: '#F2EFE9',
      mutedColor: '#A6A29A',
      accentColor: '#C6A87D',
      borderColor: '#22252A',
    },
  },
  {
    name: 'أبيض عاجي وكلاسيكي',
    values: {
      bgColor: '#F8F6F1',
      surfaceColor: '#FFFFFF',
      textColor: '#18181B',
      mutedColor: '#636059',
      accentColor: '#5B9A32',
      borderColor: '#E5E0D5',
    },
  },
];

export function OwnerPortal({
  ownerConfigured,
  ownerToken,
  initialTab = 'products',
  onOwnerAuthenticated,
  onOwnerLoggedOut,
  onDesignUpdated,
  onProductsUpdated,
  onDeliveryRatesUpdated,
  onBackToStore,
}: OwnerPortalProps) {
  const [setupOwnerPass, setSetupOwnerPass] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  const [activeTab, setActiveTab] = useState<OwnerTab>(initialTab);
  const [products, setProducts] = useState<Product[]>([]);
  const [designDraft, setDesignDraft] = useState<SiteDesignConfig | null>(null);
  const [deliveryDraft, setDeliveryDraft] = useState<DeliveryRatesMap>(() =>
    buildDefaultDeliveryRates('USD')
  );
  const [wilayaSearch, setWilayaSearch] = useState('');
  const [bulkPostPrice, setBulkPostPrice] = useState('500');
  const [bulkHomePrice, setBulkHomePrice] = useState('800');
  const [deliverySaving, setDeliverySaving] = useState(false);
  const [deliveryMsg, setDeliveryMsg] = useState<string | null>(null);

  const [vipRequests, setVipRequests] = useState<VipRequestItem[]>([]);
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [vipCoupons, setVipCoupons] = useState<VipCoupon[]>([]);
  const [contactMessages, setContactMessages] = useState<ContactMessage[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [wsLive, setWsLive] = useState(false);

  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [designSaving, setDesignSaving] = useState(false);
  const [designMsg, setDesignMsg] = useState<string | null>(null);

  const [filter, setFilter] = useState<RequestFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [couponLabelInput, setCouponLabelInput] = useState('');
  const [couponDiscountInput, setCouponDiscountInput] = useState('15');
  const [couponFeedback, setCouponFeedback] = useState<string | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);

  const [currentOwnerPass, setCurrentOwnerPass] = useState('');
  const [nextOwnerPass, setNextOwnerPass] = useState('');
  const [settingsMsg, setSettingsMsg] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  const [newStudioColorHex, setNewStudioColorHex] = useState('#2D4F4A');
  const [newStudioColorName, setNewStudioColorName] = useState('');

  const [gmailUser, setGmailUser] = useState<User | null>(null);
  const [needsGmailAuth, setNeedsGmailAuth] = useState(true);
  const [gmailConnecting, setGmailConnecting] = useState(false);
  const [gmailTargetEmail, setGmailTargetEmail] = useState('');
  const [gmailFeedback, setGmailFeedback] = useState<string | null>(null);
  const [gmailError, setGmailError] = useState<string | null>(null);
  const [pendingGmailOrders, setPendingGmailOrders] = useState<StoreOrder[] | null>(null);
  const [sendingGmailOrders, setSendingGmailOrders] = useState(false);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    const unsubscribe = initGmailAuth(
      (user) => {
        setGmailUser(user);
        setNeedsGmailAuth(false);
        if (user.email) {
          setGmailTargetEmail((prev) => prev || user.email || '');
        }
      },
      () => {
        setNeedsGmailAuth(true);
      }
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!ownerToken) return;
    let cancelled = false;

    async function loadOverview() {
      setLoadingData(true);
      try {
        const res = await fetch('/api/owner/overview', {
          headers: { 'x-owner-token': ownerToken! },
        });
        if (res.status === 401) {
          if (!cancelled) onOwnerLoggedOut();
          return;
        }
        const data = await res.json();
        if (!cancelled && res.ok) {
          setProducts(data.products || []);
          setDesignDraft(data.design || null);
          if (data.deliveryRates) setDeliveryDraft(data.deliveryRates);
          setVipRequests(data.vipRequests || []);
          setOrders(data.orders || []);
          setVipCoupons(data.vipCoupons || []);
          setContactMessages(data.contactMessages || []);
        }
      } finally {
        if (!cancelled) setLoadingData(false);
      }
    }

    loadOverview();

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(
      `${protocol}//${window.location.host}/ws?role=owner&token=${encodeURIComponent(ownerToken)}`
    );

    ws.onopen = () => {
      if (!cancelled) setWsLive(true);
    };
    ws.onclose = () => {
      if (!cancelled) setWsLive(false);
    };
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'owner:init') {
          setVipRequests(msg.vipRequests || []);
          setOrders(msg.orders || []);
          setVipCoupons(msg.vipCoupons || []);
          setProducts(msg.products || []);
          setContactMessages(msg.contactMessages || []);
          if (msg.deliveryRates) setDeliveryDraft(msg.deliveryRates);
          if (msg.design) setDesignDraft(msg.design);
        } else if (msg.type === 'owner:new_vip_request' && msg.request) {
          setVipRequests((prev) =>
            prev.some((r) => r.id === msg.request.id) ? prev : [msg.request, ...prev]
          );
        } else if (msg.type === 'owner:vip_updated' && msg.request) {
          setVipRequests((prev) =>
            prev.map((r) => (r.id === msg.request.id ? msg.request : r))
          );
        } else if (msg.type === 'owner:new_order' && msg.order) {
          setOrders((prev) =>
            prev.some((o) => o.id === msg.order.id) ? prev : [msg.order, ...prev]
          );
        } else if (msg.type === 'owner:order_updated' && msg.order) {
          setOrders((prev) =>
            prev.map((o) => (o.id === msg.order.id ? msg.order : o))
          );
        } else if (msg.type === 'owner:products_updated' && msg.products) {
          setProducts(msg.products);
        } else if (msg.type === 'owner:delivery_updated' && msg.deliveryRates) {
          setDeliveryDraft(msg.deliveryRates);
        } else if (msg.type === 'owner:new_message' && msg.contactMessage) {
          setContactMessages((prev) =>
            prev.some((m) => m.id === msg.contactMessage.id)
              ? prev
              : [msg.contactMessage, ...prev]
          );
        }
      } catch {
        // Ignore malformed messages
      }
    };

    return () => {
      cancelled = true;
      ws.close();
    };
  }, [ownerToken, onOwnerLoggedOut]);

  async function handleSetupSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);
    try {
      const res = await fetch('/api/owner/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ownerPassword: setupOwnerPass }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || 'تعذر إتمام الإعداد.');
        return;
      }
      onOwnerAuthenticated(data.ownerToken);
    } catch {
      setAuthError('حدث خطأ في الاتصال بالخادم.');
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleOwnerLogin(e: React.FormEvent) {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);
    try {
      const res = await fetch('/api/owner/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ownerPassword: loginPass }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || 'كلمة مرور المالك غير صحيحة.');
        return;
      }
      onOwnerAuthenticated(data.ownerToken);
      setLoginPass('');
    } catch {
      setAuthError('حدث خطأ في الاتصال بالخادم.');
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleDeleteProduct(id: string) {
    if (!ownerToken) return;
    const res = await fetch(`/api/owner/products/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { 'x-owner-token': ownerToken },
    });
    if (res.ok) {
      const next = products.filter((p) => p.id !== id);
      setProducts(next);
      onProductsUpdated(next);
    }
  }

  async function handleSaveDesign(e: React.FormEvent) {
    e.preventDefault();
    if (!ownerToken || !designDraft) return;
    setDesignSaving(true);
    setDesignMsg(null);
    try {
      const res = await fetch('/api/owner/design', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-owner-token': ownerToken,
        },
        body: JSON.stringify(designDraft),
      });
      const data = await res.json();
      if (res.ok) {
        setDesignDraft(data.design);
        onDesignUpdated(data.design);
        setDesignMsg('تم حفظ ونشر تصميم المتجر بنجاح لجميع الزوار.');
      }
    } finally {
      setDesignSaving(false);
    }
  }

  async function handleSaveDeliveryRates(e: React.FormEvent) {
    e.preventDefault();
    if (!ownerToken) return;
    setDeliverySaving(true);
    setDeliveryMsg(null);
    try {
      const res = await fetch('/api/owner/delivery-rates', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-owner-token': ownerToken,
        },
        body: JSON.stringify({ deliveryRates: deliveryDraft }),
      });
      const data = await res.json();
      if (res.ok && data.deliveryRates) {
        setDeliveryDraft(data.deliveryRates);
        onDeliveryRatesUpdated(data.deliveryRates);
        setDeliveryMsg('تم حفظ وتحديث أسعار التوصيل لجميع الولايات الـ 69 بنجاح.');
      }
    } finally {
      setDeliverySaving(false);
    }
  }

  function applyBulkDeliveryRates() {
    const p = Math.max(0, Math.round(Number(bulkPostPrice) || 0));
    const h = Math.max(0, Math.round(Number(bulkHomePrice) || 0));
    setDeliveryDraft((prev) => {
      const next: DeliveryRatesMap = { ...prev };
      for (const w of ALGERIA_WILAYAS) {
        next[w.code] = { postOfficePrice: p, homePrice: h };
      }
      return next;
    });
  }

  async function handleVipDecision(id: string, decision: 'approved' | 'denied' | 'revoked') {
    if (!ownerToken) return;
    const res = await fetch(`/api/owner/vip-requests/${encodeURIComponent(id)}/decision`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-owner-token': ownerToken,
      },
      body: JSON.stringify({ decision }),
    });
    if (res.ok) {
      const data = await res.json();
      setVipRequests((prev) => prev.map((r) => (r.id === id ? data.request : r)));
    }
  }

  async function handleCreateCoupon(e: React.FormEvent) {
    e.preventDefault();
    if (!ownerToken) return;
    setCouponError(null);
    setCouponFeedback(null);

    const res = await fetch('/api/owner/coupons', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-owner-token': ownerToken,
      },
      body: JSON.stringify({
        code: couponCodeInput,
        label: couponLabelInput,
        discountPercent: Number(couponDiscountInput) || 0,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setCouponError(data.error || 'تعذر إنشاء الكوبون.');
      return;
    }
    setVipCoupons((prev) => [data.coupon, ...prev]);
    setCouponCodeInput('');
    setCouponLabelInput('');
    setCouponFeedback(`تم إنشاء الكوبون ${data.coupon.code} بنجاح.`);
  }

  async function handleToggleCoupon(code: string) {
    if (!ownerToken) return;
    const res = await fetch(`/api/owner/coupons/${encodeURIComponent(code)}/toggle`, {
      method: 'PATCH',
      headers: { 'x-owner-token': ownerToken },
    });
    if (res.ok) {
      const data = await res.json();
      setVipCoupons((prev) => prev.map((c) => (c.code === code ? data.coupon : c)));
    }
  }

  async function handleDeleteCoupon(code: string) {
    if (!ownerToken) return;
    const res = await fetch(`/api/owner/coupons/${encodeURIComponent(code)}`, {
      method: 'DELETE',
      headers: { 'x-owner-token': ownerToken },
    });
    if (res.ok) {
      setVipCoupons((prev) => prev.filter((c) => c.code !== code));
    }
  }

  async function handleOrderStatus(id: string, status: 'approved' | 'completed' | 'rejected') {
    if (!ownerToken) return;
    const res = await fetch(`/api/owner/orders/${encodeURIComponent(id)}/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-owner-token': ownerToken,
      },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      const data = await res.json();
      setOrders((prev) => prev.map((o) => (o.id === id ? data.order : o)));
    }
  }

  async function handleMarkMessageRead(id: string) {
    if (!ownerToken) return;
    const res = await fetch(`/api/owner/messages/${encodeURIComponent(id)}/read`, {
      method: 'PATCH',
      headers: { 'x-owner-token': ownerToken },
    });
    if (res.ok) {
      const data = await res.json();
      setContactMessages((prev) => prev.map((m) => (m.id === id ? data.contactMessage : m)));
    }
  }

  async function handleDeleteMessage(id: string) {
    if (!ownerToken) return;
    const res = await fetch(`/api/owner/messages/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { 'x-owner-token': ownerToken },
    });
    if (res.ok) {
      setContactMessages((prev) => prev.filter((m) => m.id !== id));
    }
  }

  async function handleUpdateOwnerPass(e: React.FormEvent) {
    e.preventDefault();
    if (!ownerToken) return;
    setSettingsMsg(null);
    setSettingsError(null);
    const res = await fetch('/api/owner/admin-password', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-owner-token': ownerToken,
      },
      body: JSON.stringify({
        currentPassword: currentOwnerPass,
        newPassword: nextOwnerPass,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setSettingsError(data.error || 'تعذر تحديث كلمة مرور المالك.');
      return;
    }
    setCurrentOwnerPass('');
    setNextOwnerPass('');
    setSettingsMsg('تم تغيير كلمة مرور المالك بنجاح.');
  }

  async function handleConnectGmail() {
    setGmailError(null);
    setGmailFeedback(null);
    setGmailConnecting(true);
    try {
      const result = await signInWithGoogleForGmail();
      setGmailUser(result.user);
      setNeedsGmailAuth(false);
      if (result.user.email) {
        setGmailTargetEmail((prev) => prev || result.user.email || '');
      }
      setGmailFeedback(`تم ربط حساب Gmail بنجاح (${result.user.email ?? 'متصل'}).`);
    } catch (err) {
      setGmailError(
        err instanceof Error ? err.message : 'تعذر ربط حساب Gmail. يرجى المحاولة مجدداً.'
      );
    } finally {
      setGmailConnecting(false);
    }
  }

  async function handleDisconnectGmail() {
    await logoutGmail();
    setGmailUser(null);
    setNeedsGmailAuth(true);
    setGmailFeedback(null);
  }

  function requestSendOrdersToGmail(targetOrders: StoreOrder[]) {
    setGmailError(null);
    setGmailFeedback(null);
    if (targetOrders.length === 0) return;
    const token = getGmailAccessToken();
    if (!token || needsGmailAuth) {
      setGmailError('يرجى تسجيل الدخول بحساب Google / Gmail أولاً لتفعيل الإرسال.');
      setActiveTab('gmail');
      return;
    }
    setPendingGmailOrders(targetOrders);
  }

  async function confirmSendOrdersToGmail() {
    if (!pendingGmailOrders || pendingGmailOrders.length === 0) return;
    const accessToken = await getGmailAccessToken();
    if (!accessToken) {
      setPendingGmailOrders(null);
      setNeedsGmailAuth(true);
      setGmailError('انتهت صلاحية جلسة Gmail. يرجى إعادة تسجيل الدخول بحساب Google.');
      return;
    }
    const recipient = (
      gmailTargetEmail.trim() ||
      gmailUser?.email ||
      designDraft?.contactEmail?.trim() ||
      ''
    ).trim();
    if (!recipient) {
      setPendingGmailOrders(null);
      setGmailError('يرجى تحديد عنوان Gmail المستلم.');
      return;
    }

    setSendingGmailOrders(true);
    setGmailError(null);
    setGmailFeedback(null);
    const brandName = designDraft?.brandName || 'Skeleton Store';
    const sentIds: string[] = [];

    try {
      for (const order of pendingGmailOrders) {
        await sendOrderNotificationViaGmail(accessToken, recipient, order, brandName);
        sentIds.push(order.id);
      }

      if (sentIds.length > 0 && ownerToken) {
        const markRes = await fetch('/api/owner/orders/mark-gmail-sent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-owner-token': ownerToken,
          },
          body: JSON.stringify({ orderIds: sentIds }),
        });
        if (markRes.ok) {
          const nowIso = new Date().toISOString();
          setOrders((prev) =>
            prev.map((o) => (sentIds.includes(o.id) ? { ...o, gmailSentAt: nowIso } : o))
          );
        }
      }

      setGmailFeedback(
        sentIds.length === 1
          ? `تم إرسال تفاصيل الطلبية ${sentIds[0]} إلى ${recipient} بنجاح.`
          : `تم إرسال ${sentIds.length} طلبيات إلى ${recipient} بنجاح.`
      );
      setPendingGmailOrders(null);
    } catch (err) {
      setPendingGmailOrders(null);
      if (!getGmailAccessToken()) {
        setNeedsGmailAuth(true);
      }
      setGmailError(err instanceof Error ? err.message : 'تعذر إرسال الطلبيات عبر Gmail.');
    } finally {
      setSendingGmailOrders(false);
    }
  }

  async function handleLogout() {
    if (ownerToken) {
      await fetch('/api/owner/logout', {
        method: 'POST',
        headers: { 'x-owner-token': ownerToken },
      }).catch(() => undefined);
    }
    onOwnerLoggedOut();
  }

  if (!ownerToken) {
    return (
      <div className="min-h-screen bg-[#0D0E10] px-6 py-12 text-[#F2EFE9]">
        <div className="mx-auto max-w-lg space-y-6">
          <button
            type="button"
            onClick={onBackToStore}
            className="inline-flex items-center gap-2 text-sm text-[#A6A29A] transition-colors hover:text-[#F2EFE9]"
          >
            <ArrowRight className="h-4 w-4" />
            <span>العودة إلى واجهة المتجر</span>
          </button>

          <div className="rounded-xl border border-[#22252A] bg-[#15171A] p-7 sm:p-9">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-[#2D3138] bg-[#1C1F24] text-[#C6A87D]">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-[#F2EFE9]">
                  {ownerConfigured ? 'دخول إدارة المتجر (المالك)' : 'تعيين كلمة مرور المالك لأول مرة'}
                </h1>
                <p className="text-xs text-[#A6A29A]">
                  {ownerConfigured
                    ? 'مساحة خاصة مخفية لإدارة الملابس، تعديل الديزاين، ومراجعة الطلبات.'
                    : 'عيّن كلمة مرور سرية خاصة بك لحماية لوحة التحكم وإدارة المتجر.'}
                </p>
              </div>
            </div>

            {authError && (
              <div className="mb-5 rounded-lg border border-rose-500/40 bg-rose-950/30 px-4 py-3 text-sm text-rose-200">
                {authError}
              </div>
            )}

            {!ownerConfigured ? (
              <form onSubmit={handleSetupSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-[#D4D0C8]">
                    كلمة مرور المالك
                  </label>
                  <input
                    type="password"
                    required
                    minLength={4}
                    value={setupOwnerPass}
                    onChange={(e) => setSetupOwnerPass(e.target.value)}
                    placeholder="4 أحرف على الأقل"
                    className="w-full rounded-lg border border-[#2A2D34] bg-[#0D0E10] px-4 py-2.5 text-sm text-[#F2EFE9] focus:border-[#C6A87D] focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full rounded-lg bg-[#C6A87D] px-5 py-3 text-sm font-semibold text-[#0D0E10] hover:bg-[#D4B992] disabled:opacity-60"
                >
                  {authLoading ? 'جاري الحفظ...' : 'حفظ وفتح لوحة المالك'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleOwnerLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-[#D4D0C8]">
                    كلمة مرور المالك
                  </label>
                  <input
                    type="password"
                    required
                    value={loginPass}
                    onChange={(e) => setLoginPass(e.target.value)}
                    placeholder="أدخل كلمة مرور المالك"
                    className="w-full rounded-lg border border-[#2A2D34] bg-[#0D0E10] px-4 py-2.5 text-sm text-[#F2EFE9] focus:border-[#C6A87D] focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full rounded-lg bg-[#C6A87D] px-5 py-3 text-sm font-semibold text-[#0D0E10] hover:bg-[#D4B992] disabled:opacity-60"
                >
                  {authLoading ? 'جاري التحقق...' : 'دخول إلى لوحة المالك'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  const pendingVipCount = vipRequests.filter((r) => r.status === 'pending').length;
  const unreadMessagesCount = contactMessages.filter((m) => !m.read).length;
  const filteredVip = vipRequests.filter((r) => {
    const matchesFilter = filter === 'all' || r.status === filter;
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      r.visitorName.toLowerCase().includes(q) ||
      r.couponCode.toLowerCase().includes(q);
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#141812] text-[#F2ECE0]">
      <header className="border-b border-[#34402C] bg-[#1E241A]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3 text-sm">
            <span className="minecraft-wordmark pb-0.5 text-xs sm:text-sm text-[#F2ECE0]">
              {designDraft?.brandName || 'Skeleton Store'}
            </span>
            <span className="text-[#4E5C45]">/</span>
            <span className="font-medium text-[#6BB83B]">إدارة المالك المخفية</span>
            <span className="hidden text-xs text-[#B0B5A6] sm:inline">
              · {wsLive ? 'بث مباشر متصل' : 'مزامنة نشطة'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                setEditingProduct(null);
                setProductModalOpen(true);
              }}
              className="mc-btn inline-flex items-center gap-1.5 whitespace-nowrap bg-[#6BB83B] px-3.5 py-2 text-xs font-semibold text-[#0D0E10]"
            >
              <Plus className="h-4 w-4" />
              <span>إضافة ملابس</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('design')}
              className="mc-btn-sm inline-flex items-center gap-1.5 whitespace-nowrap bg-[#141812] px-3.5 py-2 text-xs font-medium text-[#F2ECE0]"
            >
              <Palette className="h-3.5 w-3.5 text-[#6BB83B]" />
              <span>تعديل الديزاين</span>
            </button>
            <button
              type="button"
              onClick={onBackToStore}
              className="mc-btn-sm inline-flex items-center gap-1.5 whitespace-nowrap bg-[#141812] px-3.5 py-2 text-xs font-medium text-[#D8D7CC]"
            >
              <Eye className="h-3.5 w-3.5" />
              <span>معاينة المتجر</span>
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="mc-btn-sm inline-flex items-center gap-1.5 whitespace-nowrap bg-[#141812] px-3.5 py-2 text-xs font-medium text-[#D8D7CC] hover:text-rose-300"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>خروج</span>
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-6 py-8 lg:grid-cols-12">
        <aside className="space-y-2 lg:col-span-3">
          <button
            type="button"
            onClick={() => setActiveTab('products')}
            className={`flex w-full items-center justify-between rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'products'
                ? 'border border-[#2E323A] bg-[#1B1E23] text-[#F2EFE9]'
                : 'text-[#A6A29A] hover:bg-[#15171A] hover:text-[#F2EFE9]'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Shirt className="h-4 w-4 text-[#C6A87D]" />
              <span>الملابس والمخزون</span>
            </span>
            <span className="font-mono text-xs tabular-nums text-[#A6A29A]">{products.length}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('design')}
            className={`flex w-full items-center justify-between rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'design'
                ? 'border border-[#2E323A] bg-[#1B1E23] text-[#F2EFE9]'
                : 'text-[#A6A29A] hover:bg-[#15171A] hover:text-[#F2EFE9]'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Palette className="h-4 w-4 text-[#C6A87D]" />
              <span>تعديل ديزاين الموقع</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('delivery')}
            className={`flex w-full items-center justify-between rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'delivery'
                ? 'border border-[#2E323A] bg-[#1B1E23] text-[#F2EFE9]'
                : 'text-[#A6A29A] hover:bg-[#15171A] hover:text-[#F2EFE9]'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Truck className="h-4 w-4 text-[#C6A87D]" />
              <span>أسعار التوصيل (69)</span>
            </span>
            <span className="font-mono text-xs tabular-nums text-[#A6A29A]">69</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('vip')}
            className={`flex w-full items-center justify-between rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'vip'
                ? 'border border-[#2E323A] bg-[#1B1E23] text-[#F2EFE9]'
                : 'text-[#A6A29A] hover:bg-[#15171A] hover:text-[#F2EFE9]'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Ticket className="h-4 w-4 text-[#C6A87D]" />
              <span>الزوار المقربون والكوبونات</span>
            </span>
            <span className="font-mono text-xs tabular-nums text-[#C6A87D]">{pendingVipCount}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`flex w-full items-center justify-between rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'orders'
                ? 'border border-[#2E323A] bg-[#1B1E23] text-[#F2EFE9]'
                : 'text-[#A6A29A] hover:bg-[#15171A] hover:text-[#F2EFE9]'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <ShoppingBag className="h-4 w-4 text-[#C6A87D]" />
              <span>طلبيات الملابس</span>
            </span>
            <span className="font-mono text-xs tabular-nums text-[#A6A29A]">{orders.length}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('gmail')}
            className={`flex w-full items-center justify-between rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'gmail'
                ? 'border border-[#2E323A] bg-[#1B1E23] text-[#F2EFE9]'
                : 'text-[#A6A29A] hover:bg-[#15171A] hover:text-[#F2EFE9]'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Send className="h-4 w-4 text-[#C6A87D]" />
              <span>ربط Gmail للطلبيات</span>
            </span>
            <span
              className={`h-2 w-2 rounded-full ${
                !needsGmailAuth && gmailUser ? 'bg-emerald-400' : 'bg-[#4B4F58]'
              }`}
            />
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('messages')}
            className={`flex w-full items-center justify-between rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'messages'
                ? 'border border-[#2E323A] bg-[#1B1E23] text-[#F2EFE9]'
                : 'text-[#A6A29A] hover:bg-[#15171A] hover:text-[#F2EFE9]'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Mail className="h-4 w-4 text-[#C6A87D]" />
              <span>رسائل التواصل</span>
            </span>
            <span className="font-mono text-xs tabular-nums text-[#C6A87D]">
              {unreadMessagesCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`flex w-full items-center justify-between rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'security'
                ? 'border border-[#2E323A] bg-[#1B1E23] text-[#F2EFE9]'
                : 'text-[#A6A29A] hover:bg-[#15171A] hover:text-[#F2EFE9]'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <KeyRound className="h-4 w-4 text-[#C6A87D]" />
              <span>أمان المالك</span>
            </span>
          </button>
        </aside>

        <section className="space-y-8 lg:col-span-9">
          {activeTab === 'products' && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#22252A] pb-4">
                <div>
                  <h2 className="text-xl font-semibold text-[#F2EFE9]">إدارة الملابس والمقاسات</h2>
                  <p className="mt-1 text-xs text-[#A6A29A]">
                    أضف ملابس جديدة مع الطول والعرض والعدد المتوفر والعملة، أو عدّل القطع الحالية.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingProduct(null);
                    setProductModalOpen(true);
                  }}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#C6A87D] px-4 py-2.5 text-xs font-semibold text-[#0D0E10] hover:bg-[#D4B992]"
                >
                  <Plus className="h-4 w-4" />
                  <span>إضافة ملابس جديدة</span>
                </button>
              </div>

              {loadingData ? (
                <div className="rounded-xl border border-[#22252A] bg-[#15171A] p-8 text-center text-sm text-[#A6A29A]">
                  جاري التحميل...
                </div>
              ) : products.length === 0 ? (
                <div className="rounded-xl border border-[#22252A] bg-[#15171A] p-10 text-center">
                  <p className="text-sm text-[#D4D0C8]">لا توجد ملابس مضافة حالياً.</p>
                </div>
              ) : (
                <div className="divide-y divide-[#22252A] rounded-xl border border-[#22252A] bg-[#15171A]">
                  {products.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center"
                    >
                      <div className="flex items-center gap-4">
                        <img
                          src={item.image}
                          alt={item.title}
                          referrerPolicy="no-referrer"
                          className="h-16 w-20 shrink-0 rounded-lg border border-[#2A2D34] object-cover"
                        />
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2 text-sm">
                            <span className="font-semibold text-[#F2EFE9]">{item.title}</span>
                            <span className="text-[#4B4F58]">·</span>
                            <span className="text-xs text-[#C6A87D]">{item.category}</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 font-mono text-xs tabular-nums text-[#A6A29A]">
                            <span>
                              {item.price.toLocaleString('en-US')}{' '}
                              {CURRENCY_LABELS[item.currency] ?? item.currency}
                            </span>
                            <span>·</span>
                            <span>الطول {item.lengthCm} سم</span>
                            <span>·</span>
                            <span>العرض {item.widthCm} سم</span>
                            <span>·</span>
                            <span>العدد المتوفر: {item.stock}</span>
                          </div>
                          <div className="text-xs text-[#8D8980]">
                            المقاسات: {item.sizes.join(' / ')}
                          </div>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingProduct(item);
                            setProductModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-[#2D3138] px-3 py-1.5 text-xs text-[#D4D0C8] hover:bg-[#1E2126]"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          <span>تعديل</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteProduct(item.id)}
                          className="rounded-lg border border-[#2D3138] p-2 text-[#A6A29A] hover:border-rose-500/40 hover:text-rose-300"
                          aria-label={`حذف ${item.title}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'design' && designDraft && (
            <form onSubmit={handleSaveDesign} className="space-y-6">
              <div className="border-b border-[#22252A] pb-4">
                <h2 className="text-xl font-semibold text-[#F2EFE9]">تعديل ديزاين الموقع والمظهر</h2>
                <p className="mt-1 text-xs text-[#A6A29A]">
                  خصص ألوان الموقع، اسم المتجر، النصوص الرئيسية، عدد الأعمدة، وشكل الحواف.
                </p>
              </div>

              {designMsg && (
                <div className="rounded-lg border border-emerald-500/40 bg-emerald-950/25 px-4 py-3 text-sm text-emerald-200">
                  {designMsg}
                </div>
              )}

              <div className="space-y-3 rounded-xl border border-[#22252A] bg-[#15171A] p-6">
                <h3 className="text-sm font-semibold text-[#F2EFE9]">قوالب الألوان الجاهزة</h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {DESIGN_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => setDesignDraft((prev) => (prev ? { ...prev, ...preset.values } : prev))}
                      className="flex items-center gap-2.5 rounded-lg border border-[#2A2D34] bg-[#0D0E10] p-3 text-right text-xs hover:border-[#C6A87D]"
                    >
                      <span
                        className="h-5 w-5 shrink-0 rounded-full border border-white/20"
                        style={{ backgroundColor: preset.values.bgColor }}
                      />
                      <span className="text-[#D4D0C8]">{preset.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 rounded-xl border border-[#22252A] bg-[#15171A] p-6 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="block text-xs text-[#D4D0C8]">اسم المتجر</label>
                  <input
                    type="text"
                    value={designDraft.brandName}
                    onChange={(e) =>
                      setDesignDraft((p) => (p ? { ...p, brandName: e.target.value } : p))
                    }
                    className="w-full rounded-lg border border-[#2A2D34] bg-[#0D0E10] px-3.5 py-2 text-sm text-[#F2EFE9] focus:border-[#C6A87D] focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs text-[#D4D0C8]">العنوان الصغير أعلى الهيرو</label>
                  <input
                    type="text"
                    value={designDraft.heroEyebrow}
                    onChange={(e) =>
                      setDesignDraft((p) => (p ? { ...p, heroEyebrow: e.target.value } : p))
                    }
                    className="w-full rounded-lg border border-[#2A2D34] bg-[#0D0E10] px-3.5 py-2 text-sm text-[#F2EFE9] focus:border-[#C6A87D] focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="block text-xs text-[#D4D0C8]">العنوان الرئيسي في الصفحة</label>
                  <input
                    type="text"
                    value={designDraft.heroTitle}
                    onChange={(e) =>
                      setDesignDraft((p) => (p ? { ...p, heroTitle: e.target.value } : p))
                    }
                    className="w-full rounded-lg border border-[#2A2D34] bg-[#0D0E10] px-3.5 py-2 text-sm text-[#F2EFE9] focus:border-[#C6A87D] focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="block text-xs text-[#D4D0C8]">الوصف الترحيبي</label>
                  <textarea
                    rows={2}
                    value={designDraft.heroSubtitle}
                    onChange={(e) =>
                      setDesignDraft((p) => (p ? { ...p, heroSubtitle: e.target.value } : p))
                    }
                    className="w-full rounded-lg border border-[#2A2D34] bg-[#0D0E10] px-3.5 py-2 text-sm text-[#F2EFE9] focus:border-[#C6A87D] focus:outline-none"
                  />
                </div>

                <div className="space-y-3 border border-[#34402C] bg-[#141812] p-4 md:col-span-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-[#F2ECE0]">
                        الصورة الأولى في الصفحة الرئيسية (صورة الواجهة)
                      </label>
                      <p className="mt-0.5 text-[11px] text-[#B0B5A6]">
                        يمكنك رفع صورة جديدة من جهازك أو وضع رابط صورة ثم الضغط على حفظ تغييرات الديزاين.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="mc-btn-sm inline-flex cursor-pointer items-center gap-1.5 bg-[#6BB83B] px-3 py-1.5 text-xs font-semibold text-[#0D0E10]">
                        <Upload className="h-3.5 w-3.5" />
                        <span>رفع صورة من جهازك</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            e.target.value = '';
                            if (!file) return;
                            const dataUrl = await readHeroImageFile(file);
                            setDesignDraft((p) => (p ? { ...p, heroImage: dataUrl } : p));
                          }}
                          className="hidden"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          setDesignDraft((p) =>
                            p ? { ...p, heroImage: HERO_APPAREL_IMAGE } : p
                          )
                        }
                        className="mc-btn-sm inline-flex items-center gap-1.5 bg-[#1E241A] px-3 py-1.5 text-xs font-medium text-[#D8D7CC]"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        <span>الصورة الافتراضية</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                    <img
                      src={designDraft.heroImage || HERO_APPAREL_IMAGE}
                      alt="معاينة الصورة الرئيسية"
                      className="h-28 w-40 shrink-0 border border-[#34402C] object-cover object-[50%_58%]"
                    />
                    <div className="w-full flex-1 space-y-1.5">
                      <label className="block text-[11px] text-[#B0B5A6]">
                        أو أدخل رابط الصورة مباشرة
                      </label>
                      <input
                        type="text"
                        dir="ltr"
                        value={
                          (designDraft.heroImage ?? '').startsWith('data:')
                            ? ''
                            : (designDraft.heroImage ?? HERO_APPAREL_IMAGE)
                        }
                        onChange={(e) =>
                          setDesignDraft((p) => (p ? { ...p, heroImage: e.target.value } : p))
                        }
                        placeholder={
                          (designDraft.heroImage ?? '').startsWith('data:')
                            ? 'تم رفع صورة من جهازك (أو الصق رابطاً جديداً للاستبدال)'
                            : '/assets/aistudio/IMG_20261114_220710_aa9d7c03.png'
                        }
                        className="w-full border border-[#34402C] bg-[#1E241A] px-3 py-2 font-mono text-xs text-[#F2ECE0] focus:border-[#6BB83B] focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:col-span-2">
                  {(
                    [
                      { key: 'bgColor', label: 'لون الخلفية' },
                      { key: 'surfaceColor', label: 'لون البطاقات' },
                      { key: 'textColor', label: 'لون النص' },
                      { key: 'mutedColor', label: 'النص الثانوي' },
                      { key: 'accentColor', label: 'اللون المميز والأزرار' },
                      { key: 'borderColor', label: 'لون الحدود' },
                    ] as const
                  ).map((item) => (
                    <div key={item.key} className="space-y-1.5">
                      <label className="block text-xs text-[#D4D0C8]">{item.label}</label>
                      <div className="flex items-center gap-2 rounded-lg border border-[#2A2D34] bg-[#0D0E10] px-2.5 py-1.5">
                        <input
                          type="color"
                          value={designDraft[item.key]}
                          onChange={(e) =>
                            setDesignDraft((p) => (p ? { ...p, [item.key]: e.target.value } : p))
                          }
                          className="h-7 w-8 cursor-pointer rounded border-0 bg-transparent p-0"
                        />
                        <span className="font-mono text-xs text-[#A6A29A]">{designDraft[item.key]}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs text-[#D4D0C8]">عدد أعمدة عرض الملابس</label>
                  <select
                    value={designDraft.gridColumns}
                    onChange={(e) =>
                      setDesignDraft((p) =>
                        p ? { ...p, gridColumns: Number(e.target.value) as 2 | 3 | 4 } : p
                      )
                    }
                    className="w-full rounded-lg border border-[#2A2D34] bg-[#0D0E10] px-3.5 py-2 text-sm text-[#F2EFE9]"
                  >
                    <option value={2}>عمودان (2)</option>
                    <option value={3}>3 أعمدة (متوازن)</option>
                    <option value={4}>4 أعمدة (واسع)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs text-[#D4D0C8]">استدارة الحواف</label>
                  <select
                    value={designDraft.radiusStyle}
                    onChange={(e) =>
                      setDesignDraft((p) =>
                        p ? { ...p, radiusStyle: e.target.value as RadiusStyle } : p
                      )
                    }
                    className="w-full rounded-lg border border-[#2A2D34] bg-[#0D0E10] px-3.5 py-2 text-sm text-[#F2EFE9]"
                  >
                    <option value="sharp">حادة ومعمارية</option>
                    <option value="balanced">متوازنة</option>
                    <option value="rounded">دائرية ناعمة</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs text-[#D4D0C8]">العملة الافتراضية</label>
                  <select
                    value={designDraft.defaultCurrency}
                    onChange={(e) =>
                      setDesignDraft((p) =>
                        p ? { ...p, defaultCurrency: e.target.value as CurrencyCode } : p
                      )
                    }
                    className="w-full rounded-lg border border-[#2A2D34] bg-[#0D0E10] px-3.5 py-2 text-sm text-[#F2EFE9]"
                  >
                    {(['USD', 'EUR', 'DZD'] as const).map((c) => (
                      <option key={c} value={c}>
                        {c} ({CURRENCY_LABELS[c]})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs text-[#D4D0C8]">البريد الإلكتروني للتواصل</label>
                  <input
                    type="email"
                    dir="ltr"
                    value={designDraft.contactEmail ?? ''}
                    onChange={(e) =>
                      setDesignDraft((p) => (p ? { ...p, contactEmail: e.target.value } : p))
                    }
                    placeholder="name@example.com"
                    className="w-full rounded-lg border border-[#2A2D34] bg-[#0D0E10] px-3.5 py-2 text-sm text-[#F2EFE9] focus:border-[#C6A87D] focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs text-[#D4D0C8]">رقم الهاتف / واتساب للتواصل</label>
                  <input
                    type="text"
                    dir="ltr"
                    value={designDraft.contactPhone ?? ''}
                    onChange={(e) =>
                      setDesignDraft((p) => (p ? { ...p, contactPhone: e.target.value } : p))
                    }
                    placeholder="+213 ..."
                    className="w-full rounded-lg border border-[#2A2D34] bg-[#0D0E10] px-3.5 py-2 text-sm text-[#F2EFE9] focus:border-[#C6A87D] focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs text-[#D4D0C8]">حساب انستغرام</label>
                  <input
                    type="text"
                    dir="ltr"
                    value={designDraft.contactInstagram ?? ''}
                    onChange={(e) =>
                      setDesignDraft((p) => (p ? { ...p, contactInstagram: e.target.value } : p))
                    }
                    placeholder="@skeleton.store"
                    className="w-full rounded-lg border border-[#2A2D34] bg-[#0D0E10] px-3.5 py-2 text-sm text-[#F2EFE9] focus:border-[#C6A87D] focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-4 rounded-xl border border-[#22252A] bg-[#15171A] p-6">
                <div>
                  <h3 className="text-sm font-semibold text-[#F2EFE9]">
                    الألوان المتوفرة في استوديو التصميم
                  </h3>
                  <p className="mt-1 text-xs text-[#A6A29A]">
                    أضف ألوان التيشيرت والهودي المتوفرة للزبائن في استوديو التصميم أو أزل الألوان غير المتوفرة، ثم احفظ التغييرات.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2.5">
                  {(designDraft.studioColors ?? []).map((c) => (
                    <div
                      key={c.hex}
                      className="inline-flex items-center gap-2 rounded-lg border border-[#2A2D34] bg-[#0D0E10] px-3 py-1.5 text-xs"
                    >
                      <span
                        className="h-4 w-4 rounded-full border border-white/25"
                        style={{ backgroundColor: c.hex }}
                      />
                      <span className="text-[#F2EFE9]">{c.name}</span>
                      <span className="font-mono text-[11px] text-[#8D8980]" dir="ltr">
                        {c.hex}
                      </span>
                      {(designDraft.studioColors?.length ?? 0) > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            setDesignDraft((p) =>
                              p
                                ? {
                                    ...p,
                                    studioColors: (p.studioColors ?? []).filter(
                                      (item) => item.hex.toUpperCase() !== c.hex.toUpperCase()
                                    ),
                                  }
                                : p
                            )
                          }
                          title={`حذف ${c.name}`}
                          className="text-[#A6A29A] hover:text-rose-300"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <input
                    type="color"
                    value={newStudioColorHex}
                    onChange={(e) => setNewStudioColorHex(e.target.value)}
                    className="h-9 w-10 cursor-pointer rounded border-0 bg-transparent p-0"
                  />
                  <input
                    type="text"
                    value={newStudioColorName}
                    onChange={(e) => setNewStudioColorName(e.target.value)}
                    placeholder="اسم اللون (مثال: أزرق بحري)"
                    className="min-w-[180px] flex-1 rounded-lg border border-[#2A2D34] bg-[#0D0E10] px-3.5 py-2 text-sm text-[#F2EFE9] focus:border-[#C6A87D] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const cleanHex = newStudioColorHex.trim().toUpperCase();
                      const cleanName = newStudioColorName.trim() || cleanHex;
                      setDesignDraft((p) => {
                        if (!p) return p;
                        const list = p.studioColors ?? [];
                        if (list.some((item) => item.hex.toUpperCase() === cleanHex)) return p;
                        return {
                          ...p,
                          studioColors: [...list, { name: cleanName, hex: cleanHex }],
                        };
                      });
                      setNewStudioColorName('');
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#2D3138] bg-[#1C1F24] px-4 py-2 text-xs font-medium text-[#F2EFE9] hover:border-[#C6A87D]"
                  >
                    <Plus className="h-3.5 w-3.5 text-[#C6A87D]" />
                    <span>إضافة لون للاستوديو</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  type="submit"
                  disabled={designSaving}
                  className="rounded-lg bg-[#C6A87D] px-6 py-2.5 text-sm font-semibold text-[#0D0E10] hover:bg-[#D4B992] disabled:opacity-60"
                >
                  {designSaving ? 'جاري النشر...' : 'حفظ ونشر الديزاين على المتجر'}
                </button>
              </div>
            </form>
          )}

          {activeTab === 'delivery' && (
            <form onSubmit={handleSaveDeliveryRates} className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#22252A] pb-4">
                <div>
                  <h2 className="text-xl font-semibold text-[#F2EFE9]">أسعار التوصيل للولايات الـ 69</h2>
                  <p className="mt-1 text-xs text-[#A6A29A]">
                    حدد سعر التوصيل إلى المكتب البريدي وسعر التوصيل إلى المنزل لكل ولاية بالترتيب (العملة الافتراضية الحالية:{' '}
                    {CURRENCY_LABELS[designDraft?.defaultCurrency ?? 'USD'] ?? 'USD'}).
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={deliverySaving}
                  className="rounded-lg bg-[#C6A87D] px-5 py-2.5 text-xs font-semibold text-[#0D0E10] hover:bg-[#D4B992] disabled:opacity-60"
                >
                  {deliverySaving ? 'جاري الحفظ...' : 'حفظ أسعار التوصيل'}
                </button>
              </div>

              {deliveryMsg && (
                <div className="rounded-lg border border-emerald-500/40 bg-emerald-950/25 px-4 py-3 text-sm text-emerald-200">
                  {deliveryMsg}
                </div>
              )}

              <div className="space-y-4 rounded-xl border border-[#22252A] bg-[#15171A] p-5">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div className="flex flex-wrap items-end gap-3">
                    <div>
                      <label className="mb-1 block text-xs text-[#A6A29A]">سعر موحد للمكتب البريدي</label>
                      <input
                        type="number"
                        min={0}
                        value={bulkPostPrice}
                        onChange={(e) => setBulkPostPrice(e.target.value)}
                        className="w-32 rounded-lg border border-[#2A2D34] bg-[#0D0E10] px-3 py-2 font-mono text-xs tabular-nums text-[#F2EFE9]"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-[#A6A29A]">سعر موحد للمنزل</label>
                      <input
                        type="number"
                        min={0}
                        value={bulkHomePrice}
                        onChange={(e) => setBulkHomePrice(e.target.value)}
                        className="w-32 rounded-lg border border-[#2A2D34] bg-[#0D0E10] px-3 py-2 font-mono text-xs tabular-nums text-[#F2EFE9]"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={applyBulkDeliveryRates}
                      className="rounded-lg border border-[#2D3138] px-4 py-2 text-xs text-[#F2EFE9] hover:bg-[#1E2126]"
                    >
                      تطبيق على جميع الولايات (69)
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setDeliveryDraft(buildDefaultDeliveryRates('DZD'))}
                      className="rounded-lg border border-[#2A2D34] px-3 py-2 text-xs text-[#D4D0C8] hover:border-[#C6A87D]"
                    >
                      تعريفة افتراضية بالدينار (DZD)
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeliveryDraft(buildDefaultDeliveryRates('USD'))}
                      className="rounded-lg border border-[#2A2D34] px-3 py-2 text-xs text-[#D4D0C8] hover:border-[#C6A87D]"
                    >
                      تعريفة افتراضية ($ / €)
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <Search className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-[#6F6C65]" />
                  <input
                    type="text"
                    value={wilayaSearch}
                    onChange={(e) => setWilayaSearch(e.target.value)}
                    placeholder="ابحث برقم الولاية (01 - 69) أو اسم الولاية..."
                    className="w-full rounded-lg border border-[#2A2D34] bg-[#0D0E10] py-2 pr-9 pl-3 text-sm text-[#F2EFE9] focus:border-[#C6A87D] focus:outline-none"
                  />
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border border-[#22252A] bg-[#15171A]">
                <div className="grid grid-cols-12 border-b border-[#22252A] bg-[#121417] px-4 py-3 text-xs font-medium text-[#A6A29A]">
                  <span className="col-span-2">الرقم</span>
                  <span className="col-span-4">الولاية</span>
                  <span className="col-span-3">المكتب البريدي</span>
                  <span className="col-span-3">التوصيل للمنزل</span>
                </div>
                <div className="max-h-[540px] divide-y divide-[#22252A] overflow-y-auto">
                  {ALGERIA_WILAYAS.filter((w) => {
                    const q = wilayaSearch.trim();
                    if (!q) return true;
                    return w.code.includes(q) || w.name.includes(q);
                  }).map((w) => {
                    const rate = deliveryDraft[w.code] ?? { postOfficePrice: 0, homePrice: 0 };
                    return (
                      <div key={w.code} className="grid grid-cols-12 items-center gap-2 px-4 py-2.5 text-sm">
                        <span className="col-span-2 font-mono text-xs font-semibold tabular-nums text-[#C6A87D]">
                          {w.code}
                        </span>
                        <span className="col-span-4 text-xs font-medium text-[#F2EFE9] sm:text-sm">
                          {w.name}
                        </span>
                        <div className="col-span-3">
                          <input
                            type="number"
                            min={0}
                            value={rate.postOfficePrice}
                            onChange={(e) => {
                              const val = Math.max(0, Math.round(Number(e.target.value) || 0));
                              setDeliveryDraft((prev) => ({
                                ...prev,
                                [w.code]: { ...rate, postOfficePrice: val },
                              }));
                            }}
                            className="w-full rounded-md border border-[#2A2D34] bg-[#0D0E10] px-2.5 py-1.5 font-mono text-xs tabular-nums text-[#F2EFE9] focus:border-[#C6A87D] focus:outline-none"
                          />
                        </div>
                        <div className="col-span-3">
                          <input
                            type="number"
                            min={0}
                            value={rate.homePrice}
                            onChange={(e) => {
                              const val = Math.max(0, Math.round(Number(e.target.value) || 0));
                              setDeliveryDraft((prev) => ({
                                ...prev,
                                [w.code]: { ...rate, homePrice: val },
                              }));
                            }}
                            className="w-full rounded-md border border-[#2A2D34] bg-[#0D0E10] px-2.5 py-1.5 font-mono text-xs tabular-nums text-[#F2EFE9] focus:border-[#C6A87D] focus:outline-none"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </form>
          )}

          {activeTab === 'vip' && (
            <div className="space-y-6">
              <div className="rounded-xl border border-[#22252A] bg-[#15171A] p-6">
                <div className="mb-4">
                  <h2 className="text-lg font-semibold text-[#F2EFE9]">كوبونات الزوار المقربين</h2>
                  <p className="mt-1 text-xs text-[#A6A29A]">
                    أنشئ أكواد كوبون لمشاركتها مع زوارك المقربين؛ عند إدخالهم الاسم والكوبون يمكنك قبولهم ليحصلوا على الخصم.
                  </p>
                </div>

                {couponFeedback && (
                  <div className="mb-4 rounded-lg border border-emerald-500/40 bg-emerald-950/25 px-4 py-2.5 text-xs text-emerald-200">
                    {couponFeedback}
                  </div>
                )}
                {couponError && (
                  <div className="mb-4 rounded-lg border border-rose-500/40 bg-rose-950/30 px-4 py-2.5 text-xs text-rose-200">
                    {couponError}
                  </div>
                )}

                <form onSubmit={handleCreateCoupon} className="grid grid-cols-1 gap-3 sm:grid-cols-12">
                  <input
                    type="text"
                    required
                    value={couponCodeInput}
                    onChange={(e) => setCouponCodeInput(e.target.value.toUpperCase())}
                    placeholder="رمز الكوبون (مثال: VIP-2026)"
                    className="rounded-lg border border-[#2A2D34] bg-[#0D0E10] px-3.5 py-2 font-mono text-sm uppercase text-[#F2EFE9] focus:border-[#C6A87D] focus:outline-none sm:col-span-4"
                  />
                  <input
                    type="text"
                    value={couponLabelInput}
                    onChange={(e) => setCouponLabelInput(e.target.value)}
                    placeholder="وصف الدعوة"
                    className="rounded-lg border border-[#2A2D34] bg-[#0D0E10] px-3.5 py-2 text-sm text-[#F2EFE9] focus:border-[#C6A87D] focus:outline-none sm:col-span-4"
                  />
                  <div className="flex items-center gap-2 sm:col-span-2">
                    <input
                      type="number"
                      min={0}
                      max={80}
                      value={couponDiscountInput}
                      onChange={(e) => setCouponDiscountInput(e.target.value)}
                      className="w-full rounded-lg border border-[#2A2D34] bg-[#0D0E10] px-3 py-2 font-mono text-sm tabular-nums text-[#F2EFE9] focus:border-[#C6A87D] focus:outline-none"
                    />
                    <span className="text-xs text-[#A6A29A]">%</span>
                  </div>
                  <button
                    type="submit"
                    className="whitespace-nowrap rounded-lg bg-[#C6A87D] px-4 py-2 text-xs font-semibold text-[#0D0E10] hover:bg-[#D4B992] sm:col-span-2"
                  >
                    إضافة كوبون
                  </button>
                </form>

                {vipCoupons.length > 0 && (
                  <div className="mt-5 divide-y divide-[#22252A] border-t border-[#22252A] pt-2">
                    {vipCoupons.map((coupon) => (
                      <div key={coupon.code} className="flex flex-wrap items-center justify-between gap-3 py-3 text-xs">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="font-mono text-sm font-semibold text-[#C6A87D]">{coupon.code}</span>
                          <span className="text-[#4B4F58]">·</span>
                          <span className="text-[#D4D0C8]">{coupon.label}</span>
                          <span className="text-[#4B4F58]">·</span>
                          <span className="font-mono tabular-nums text-[#A6A29A]">خصم {coupon.discountPercent}%</span>
                          <span className="text-[#4B4F58]">·</span>
                          <span className={coupon.active ? 'text-emerald-400' : 'text-[#8D8980]'}>
                            {coupon.active ? 'مفعّل' : 'موقوف'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleCoupon(coupon.code)}
                            className="rounded-md border border-[#2A2D34] px-3 py-1 text-xs text-[#D4D0C8] hover:bg-[#1C1F24]"
                          >
                            {coupon.active ? 'إيقاف' : 'تفعيل'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCoupon(coupon.code)}
                            className="rounded-md border border-[#2A2D34] p-1.5 text-[#A6A29A] hover:border-rose-500/40 hover:text-rose-300"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex flex-col justify-between gap-4 border-b border-[#22252A] pb-4 sm:flex-row sm:items-center">
                  <div>
                    <h3 className="text-lg font-semibold text-[#F2EFE9]">طلبات قائمة الزوار المقربين</h3>
                    <p className="text-xs text-[#A6A29A]">الأسماء والكوبونات المرسلة من الزوار للموافقة عليها.</p>
                  </div>
                  <div className="relative w-full sm:w-64">
                    <Search className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-[#6F6C65]" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="ابحث بالاسم أو الكوبون..."
                      className="w-full rounded-lg border border-[#2A2D34] bg-[#15171A] py-2 pr-9 pl-3 text-sm text-[#F2EFE9] focus:border-[#C6A87D] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-[#22252A] bg-[#15171A] p-1">
                  {(
                    [
                      { key: 'all', label: 'الكل' },
                      { key: 'pending', label: 'قيد المراجعة' },
                      { key: 'approved', label: 'المقبولون' },
                      { key: 'denied', label: 'المرفوضة' },
                    ] as const
                  ).map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setFilter(item.key)}
                      className={`rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors ${
                        filter === item.key ? 'bg-[#C6A87D] text-[#0D0E10]' : 'text-[#A6A29A] hover:text-[#F2EFE9]'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                {filteredVip.length === 0 ? (
                  <div className="rounded-xl border border-[#22252A] bg-[#15171A] p-10 text-center text-sm text-[#A6A29A]">
                    لا توجد طلبات مقربين مسجلة حالياً.
                  </div>
                ) : (
                  <div className="divide-y divide-[#22252A] rounded-xl border border-[#22252A] bg-[#15171A]">
                    {filteredVip.map((req) => (
                      <div key={req.id} className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2 text-sm">
                            <span className="font-semibold text-[#F2EFE9]">{req.visitorName}</span>
                            <span className="text-[#4B4F58]">·</span>
                            <span className="font-mono text-xs text-[#C6A87D]">{req.couponCode}</span>
                            <span className="text-[#4B4F58]">·</span>
                            <span className={req.couponValid ? 'inline-flex items-center gap-1 text-xs text-emerald-400' : 'text-xs text-amber-400'}>
                              {req.couponValid ? (
                                <>
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  <span>مفعّل (خصم {req.discountPercent}%)</span>
                                </>
                              ) : (
                                <span>غير مدرج ضمن الأكواد المفعلة</span>
                              )}
                            </span>
                          </div>
                          {req.note && <p className="text-xs text-[#D4D0C8]">ملاحظة: {req.note}</p>}
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                          {req.status !== 'approved' ? (
                            <button
                              type="button"
                              onClick={() => handleVipDecision(req.id, 'approved')}
                              className="rounded-lg bg-[#C6A87D] px-4 py-2 text-xs font-semibold text-[#0D0E10] hover:bg-[#D4B992]"
                            >
                              قبول في القائمة
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleVipDecision(req.id, 'revoked')}
                              className="rounded-lg border border-[#2D3138] px-4 py-2 text-xs text-[#D4D0C8] hover:border-rose-500/40 hover:text-rose-300"
                            >
                              إلغاء العضوية
                            </button>
                          )}
                          {req.status === 'pending' && (
                            <button
                              type="button"
                              onClick={() => handleVipDecision(req.id, 'denied')}
                              className="rounded-lg border border-rose-500/35 px-4 py-2 text-xs text-rose-300 hover:bg-rose-950/30"
                            >
                              رفض
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#22252A] pb-4">
                <div>
                  <h2 className="text-xl font-semibold text-[#F2EFE9]">طلبيات الملابس</h2>
                  <p className="mt-1 text-xs text-[#A6A29A]">
                    مراجعة طلبيات الشراء الواردة من الزوار مع المقاسات والكميات وإرسالها إلى بريدك في Gmail.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {needsGmailAuth || !gmailUser ? (
                    <GoogleSignInButton
                      onClick={() => void handleConnectGmail()}
                      disabled={gmailConnecting}
                      label="Sign in with Google"
                    />
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          requestSendOrdersToGmail(orders.filter((o) => !o.gmailSentAt))
                        }
                        disabled={orders.filter((o) => !o.gmailSentAt).length === 0}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#C6A87D] px-3.5 py-2 text-xs font-semibold text-[#0D0E10] hover:bg-[#D4B992] disabled:opacity-50"
                      >
                        <Send className="h-3.5 w-3.5" />
                        <span>
                          إرسال الطلبيات الجديدة إلى Gmail ({orders.filter((o) => !o.gmailSentAt).length})
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('gmail')}
                        className="rounded-lg border border-[#2A2D34] px-3 py-2 text-xs text-[#D4D0C8] hover:bg-[#1C1F24]"
                      >
                        إعدادات Gmail
                      </button>
                    </>
                  )}
                </div>
              </div>

              {gmailFeedback && (
                <div className="rounded-lg border border-emerald-500/40 bg-emerald-950/25 px-4 py-3 text-sm text-emerald-200">
                  {gmailFeedback}
                </div>
              )}
              {gmailError && (
                <div className="rounded-lg border border-rose-500/40 bg-rose-950/30 px-4 py-3 text-sm text-rose-200">
                  {gmailError}
                </div>
              )}

              {orders.length === 0 ? (
                <div className="rounded-xl border border-[#22252A] bg-[#15171A] p-10 text-center text-sm text-[#A6A29A]">
                  لا توجد طلبيات ملابس مسجلة بعد.
                </div>
              ) : (
                <div className="divide-y divide-[#22252A] rounded-xl border border-[#22252A] bg-[#15171A]">
                  {orders.map((order) => (
                    <div key={order.id} className="space-y-3 p-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                          <span className="font-mono font-semibold tabular-nums text-[#C6A87D]">{order.id}</span>
                          <span className="text-[#4B4F58]">·</span>
                          <span className="font-semibold text-[#F2EFE9]">{order.visitorName}</span>
                          <span className="text-[#4B4F58]">·</span>
                          <span className="text-xs text-[#A6A29A]">{order.city}</span>
                          <span className="text-[#4B4F58]">·</span>
                          <span className="font-mono text-xs tabular-nums text-[#A6A29A]">{order.phone}</span>
                        </div>
                        <span className="font-mono text-sm font-semibold tabular-nums text-[#F2EFE9]">
                          {order.total.toLocaleString('en-US')}{' '}
                          {CURRENCY_LABELS[order.currency] ?? order.currency}
                        </span>
                      </div>

                      <div className="space-y-2">
                        {order.items.map((it, idx) => (
                          <div
                            key={`${order.id}-${it.id}-${it.size}-${idx}`}
                            className="flex items-center gap-3 rounded-lg border border-[#22252A] bg-[#0D0E10]/70 px-3 py-2 text-xs text-[#D4D0C8]"
                          >
                            {it.customDesign?.previewImage && (
                              <img
                                src={it.customDesign.previewImage}
                                alt={it.title}
                                className="h-14 w-12 shrink-0 rounded border border-[#2A2D34] object-cover"
                              />
                            )}
                            <div className="space-y-1">
                              <div className="font-medium text-[#F2EFE9]">
                                {it.title} — مقاس {it.size} (×{it.quantity})
                              </div>
                              {it.customDesign && (
                                <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#A6A29A]">
                                  <span
                                    className="inline-block h-2.5 w-2.5 rounded-full border border-white/25"
                                    style={{ backgroundColor: it.customDesign.colorHex }}
                                  />
                                  <span>لون: {it.customDesign.colorName}</span>
                                  <span>·</span>
                                  <span>
                                    صور أمام: {it.customDesign.frontLayersCount} / خلف: {it.customDesign.backLayersCount}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-[#A6A29A]">
                        <span>
                          الولاية: {order.wilayaCode} — {order.wilayaName}
                        </span>
                        <span className="text-[#4B4F58]">·</span>
                        <span>
                          {order.deliveryMethod === 'post_office'
                            ? 'توصيل للمكتب البريدي'
                            : 'توصيل للمنزل'}
                        </span>
                        <span className="text-[#4B4F58]">·</span>
                        <span className="font-mono tabular-nums">
                          التوصيل: {(order.deliveryFee ?? 0).toLocaleString('en-US')}{' '}
                          {CURRENCY_LABELS[order.currency] ?? order.currency}
                        </span>
                      </div>
                      <div className="text-xs text-[#8D8980]">العنوان: {order.address}</div>

                      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                        <div className="flex flex-wrap items-center gap-3 text-xs">
                          <span className="text-[#A6A29A]">
                            الحالة:{' '}
                            {order.status === 'pending'
                              ? 'قيد المراجعة'
                              : order.status === 'approved'
                              ? 'تمت الموافقة'
                              : order.status === 'completed'
                              ? 'مكتملة'
                              : 'مرفوضة'}
                          </span>
                          {order.gmailSentAt && (
                            <span className="inline-flex items-center gap-1 text-emerald-400">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>تم الإرسال إلى Gmail</span>
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => requestSendOrdersToGmail([order])}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-[#2D3138] px-3 py-1.5 text-xs text-[#D4D0C8] hover:border-[#C6A87D] hover:text-[#F2EFE9]"
                          >
                            <Send className="h-3.5 w-3.5 text-[#C6A87D]" />
                            <span>{order.gmailSentAt ? 'إعادة إرسال إلى Gmail' : 'إرسال إلى Gmail'}</span>
                          </button>
                          {order.status === 'pending' && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleOrderStatus(order.id, 'approved')}
                                className="rounded-lg bg-[#C6A87D] px-3.5 py-1.5 text-xs font-semibold text-[#0D0E10]"
                              >
                                الموافقة على الطلبية
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOrderStatus(order.id, 'rejected')}
                                className="rounded-lg border border-rose-500/35 px-3.5 py-1.5 text-xs text-rose-300"
                              >
                                رفض
                              </button>
                            </>
                          )}
                          {order.status === 'approved' && (
                            <button
                              type="button"
                              onClick={() => handleOrderStatus(order.id, 'completed')}
                              className="rounded-lg border border-[#2D3138] px-3.5 py-1.5 text-xs text-[#F2EFE9]"
                            >
                              تحديد كمكتملة
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'gmail' && (
            <div className="space-y-6">
              <div className="border-b border-[#22252A] pb-4">
                <h2 className="text-xl font-semibold text-[#F2EFE9]">الربط بحساب Gmail لاستلام الطلبيات</h2>
                <p className="mt-1 text-xs text-[#A6A29A]">
                  اربط حسابك في Google لتلقي تفاصيل الطلبيات (اسم العميل، الولاية، التوصيل، القطع، والتصاميم المخصصة) في بريدك الوارد على Gmail.
                </p>
              </div>

              {gmailFeedback && (
                <div className="rounded-lg border border-emerald-500/40 bg-emerald-950/25 px-4 py-3 text-sm text-emerald-200">
                  {gmailFeedback}
                </div>
              )}
              {gmailError && (
                <div className="rounded-lg border border-rose-500/40 bg-rose-950/30 px-4 py-3 text-sm text-rose-200">
                  {gmailError}
                </div>
              )}

              <div className="space-y-5 rounded-xl border border-[#22252A] bg-[#15171A] p-6">
                {needsGmailAuth || !gmailUser ? (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <h3 className="text-base font-semibold text-[#F2EFE9]">تسجيل الدخول بحساب Google</h3>
                      <p className="text-xs text-[#A6A29A]">
                        اضغط أدناه لمنح الإذن بإرسال ملخصات الطلبيات الجديدة إلى حساب Gmail الخاص بك.
                      </p>
                    </div>
                    <GoogleSignInButton
                      onClick={() => void handleConnectGmail()}
                      disabled={gmailConnecting}
                      label={gmailConnecting ? 'Connecting...' : 'Sign in with Google'}
                    />
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#22252A] pb-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm font-semibold text-emerald-400">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>حساب Gmail مرتبط ونشط</span>
                        </div>
                        <p className="font-mono text-xs text-[#D4D0C8]" dir="ltr">
                          {gmailUser.email}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleDisconnectGmail()}
                        className="rounded-lg border border-[#2D3138] px-3.5 py-2 text-xs text-[#D4D0C8] hover:border-rose-500/40 hover:text-rose-300"
                      >
                        فصل حساب Gmail
                      </button>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs text-[#D4D0C8]">
                        بريد Gmail المستلم للطلبيات
                      </label>
                      <input
                        type="email"
                        dir="ltr"
                        value={gmailTargetEmail}
                        onChange={(e) => setGmailTargetEmail(e.target.value)}
                        placeholder={gmailUser.email || 'your@gmail.com'}
                        className="w-full max-w-md rounded-lg border border-[#2A2D34] bg-[#0D0E10] px-3.5 py-2 text-sm text-[#F2EFE9] focus:border-[#C6A87D] focus:outline-none"
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-3 pt-1">
                      <button
                        type="button"
                        onClick={() =>
                          requestSendOrdersToGmail(orders.filter((o) => !o.gmailSentAt))
                        }
                        disabled={orders.filter((o) => !o.gmailSentAt).length === 0}
                        className="inline-flex items-center gap-2 rounded-lg bg-[#C6A87D] px-5 py-2.5 text-xs font-semibold text-[#0D0E10] hover:bg-[#D4B992] disabled:opacity-50"
                      >
                        <Send className="h-4 w-4" />
                        <span>
                          إرسال الطلبيات الجديدة إلى Gmail ({orders.filter((o) => !o.gmailSentAt).length})
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('orders')}
                        className="rounded-lg border border-[#2D3138] px-4 py-2.5 text-xs text-[#D4D0C8] hover:bg-[#1C1F24]"
                      >
                        عرض جميع الطلبيات
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'messages' && (
            <div className="space-y-5">
              <div className="border-b border-[#22252A] pb-4">
                <h2 className="text-xl font-semibold text-[#F2EFE9]">رسائل التواصل معي</h2>
                <p className="mt-1 text-xs text-[#A6A29A]">
                  الرسائل المرسلة من نافذة «التواصل معي» في قائمة الثلاث نقاط.
                </p>
              </div>

              {contactMessages.length === 0 ? (
                <div className="rounded-xl border border-[#22252A] bg-[#15171A] p-10 text-center text-sm text-[#A6A29A]">
                  لا توجد رسائل تواصل مسجلة حالياً.
                </div>
              ) : (
                <div className="divide-y divide-[#22252A] rounded-xl border border-[#22252A] bg-[#15171A]">
                  {contactMessages.map((item) => (
                    <div key={item.id} className="space-y-3 p-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                          <span className="font-mono text-xs text-[#C6A87D]">{item.id}</span>
                          <span className="text-[#4B4F58]">·</span>
                          <span className="font-semibold text-[#F2EFE9]">{item.senderName}</span>
                          <span className="text-[#4B4F58]">·</span>
                          <span className="font-mono text-xs text-[#A6A29A]" dir="ltr">
                            {item.senderContact}
                          </span>
                        </div>
                        <span className={item.read ? 'text-xs text-[#8D8980]' : 'text-xs font-medium text-emerald-400'}>
                          {item.read ? 'تمت القراءة' : 'جديدة'}
                        </span>
                      </div>

                      <p className="text-sm leading-relaxed text-[#D4D0C8]">{item.message}</p>

                      <div className="flex items-center justify-end gap-2">
                        {!item.read && (
                          <button
                            type="button"
                            onClick={() => handleMarkMessageRead(item.id)}
                            className="rounded-lg border border-[#2D3138] px-3 py-1.5 text-xs text-[#D4D0C8] hover:bg-[#1E2126]"
                          >
                            تحديد كمقروءة
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteMessage(item.id)}
                          className="rounded-lg border border-[#2D3138] p-1.5 text-[#A6A29A] hover:border-rose-500/40 hover:text-rose-300"
                          aria-label={`حذف رسالة ${item.senderName}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
              <div className="border-b border-[#22252A] pb-4">
                <h2 className="text-xl font-semibold text-[#F2EFE9]">أمان لوحة المالك المخفية</h2>
                <p className="mt-1 text-xs text-[#A6A29A]">
                  الرابط الخاص بالمالك هو <span className="font-mono text-[#C6A87D]" dir="ltr">/admin</span> أو{' '}
                  <span className="font-mono text-[#C6A87D]" dir="ltr">/#admin</span> ولا يظهر للزوار.
                </p>
              </div>

              {settingsMsg && (
                <div className="rounded-lg border border-emerald-500/40 bg-emerald-950/25 px-4 py-3 text-sm text-emerald-200">
                  {settingsMsg}
                </div>
              )}
              {settingsError && (
                <div className="rounded-lg border border-rose-500/40 bg-rose-950/30 px-4 py-3 text-sm text-rose-200">
                  {settingsError}
                </div>
              )}

              <form
                onSubmit={handleUpdateOwnerPass}
                className="max-w-md space-y-4 rounded-xl border border-[#22252A] bg-[#15171A] p-6"
              >
                <h3 className="text-base font-semibold text-[#F2EFE9]">تحديث كلمة مرور المالك</h3>
                <div className="space-y-1.5">
                  <label className="block text-xs text-[#D4D0C8]">كلمة المرور الحالية</label>
                  <input
                    type="password"
                    required
                    value={currentOwnerPass}
                    onChange={(e) => setCurrentOwnerPass(e.target.value)}
                    className="w-full rounded-lg border border-[#2A2D34] bg-[#0D0E10] px-3.5 py-2 text-sm text-[#F2EFE9] focus:border-[#C6A87D] focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs text-[#D4D0C8]">كلمة المرور الجديدة</label>
                  <input
                    type="password"
                    required
                    minLength={4}
                    value={nextOwnerPass}
                    onChange={(e) => setNextOwnerPass(e.target.value)}
                    className="w-full rounded-lg border border-[#2A2D34] bg-[#0D0E10] px-3.5 py-2 text-sm text-[#F2EFE9] focus:border-[#C6A87D] focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="rounded-lg bg-[#C6A87D] px-5 py-2.5 text-xs font-semibold text-[#0D0E10] hover:bg-[#D4B992]"
                >
                  تحديث كلمة المرور
                </button>
              </form>
            </div>
          )}
        </section>
      </div>

      <AddProductModal
        isOpen={productModalOpen}
        ownerToken={ownerToken}
        defaultCurrency={designDraft?.defaultCurrency ?? 'USD'}
        design={designDraft ?? undefined}
        editingProduct={editingProduct}
        onClose={() => {
          setProductModalOpen(false);
          setEditingProduct(null);
        }}
        onSaved={(saved, isEdit) => {
          const next = isEdit
            ? products.map((p) => (p.id === saved.id ? saved : p))
            : [saved, ...products];
          setProducts(next);
          onProductsUpdated(next);
        }}
      />

      {pendingGmailOrders && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md space-y-4 rounded-xl border border-[#2A2D34] bg-[#15171A] p-6 text-[#F2EFE9] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#22252A] pb-3">
              <div className="flex items-center gap-2">
                <Send className="h-4 w-4 text-[#C6A87D]" />
                <h3 className="text-base font-semibold">تأكيد الإرسال عبر Gmail</h3>
              </div>
              <button
                type="button"
                disabled={sendingGmailOrders}
                onClick={() => setPendingGmailOrders(null)}
                className="text-[#A6A29A] hover:text-[#F2EFE9]"
                aria-label="إلغاء"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs leading-relaxed text-[#D4D0C8]">
              <p>
                سيتم إرسال تفاصيل{' '}
                <strong>
                  {pendingGmailOrders.length === 1
                    ? `الطلبية ${pendingGmailOrders[0].id}`
                    : `${pendingGmailOrders.length} طلبيات`}
                </strong>{' '}
                إلى البريد الإلكتروني:
              </p>
              <p className="rounded-lg border border-[#22252A] bg-[#0D0E10] px-3 py-2 font-mono text-[#C6A87D]" dir="ltr">
                {gmailTargetEmail.trim() || gmailUser?.email || designDraft?.contactEmail || ''}
              </p>
              <div className="max-h-36 space-y-1.5 overflow-y-auto pt-1">
                {pendingGmailOrders.map((o) => (
                  <div
                    key={o.id}
                    className="flex items-center justify-between rounded border border-[#22252A] bg-[#0D0E10]/60 px-2.5 py-1.5"
                  >
                    <span>
                      {o.id} — {o.visitorName}
                    </span>
                    <span className="font-mono tabular-nums text-[#C6A87D]">
                      {o.total.toLocaleString('en-US')} {CURRENCY_LABELS[o.currency] ?? o.currency}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={sendingGmailOrders}
                onClick={() => setPendingGmailOrders(null)}
                className="rounded-lg border border-[#2D3138] px-4 py-2 text-xs text-[#D4D0C8] hover:bg-[#1C1F24]"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={sendingGmailOrders}
                onClick={() => void confirmSendOrdersToGmail()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#C6A87D] px-4 py-2 text-xs font-semibold text-[#0D0E10] hover:bg-[#D4B992] disabled:opacity-60"
              >
                <Send className="h-3.5 w-3.5" />
                <span>{sendingGmailOrders ? 'جاري الإرسال...' : 'تأكيد الإرسال إلى Gmail'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
