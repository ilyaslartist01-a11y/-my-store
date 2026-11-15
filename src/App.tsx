import { useCallback, useEffect, useState } from 'react';
import type {
  DeliveryRatesMap,
  Product,
  SiteDesignConfig,
  StudioGarmentColor,
  VipRequestItem,
} from './types';
import { buildDefaultDeliveryRates } from './data/algeriaWilayas';
import { Storefront } from './components/Storefront';
import { OwnerPortal, type OwnerTab } from './components/OwnerPortal';
import { PrivacyPolicyModal } from './components/PrivacyPolicyModal';
import { VipJoinModal } from './components/VipJoinModal';
import { AddProductModal } from './components/AddProductModal';
import { ContactModal } from './components/ContactModal';
import { playMinecraftClick } from './utils/minecraftSound';

const VIP_TOKEN_KEY = 'skeleton_store_vip_token';
const OWNER_TOKEN_KEY = 'skeleton_store_owner_token';

type VipSessionPreview = Pick<
  VipRequestItem,
  'id' | 'visitorName' | 'couponCode' | 'discountPercent' | 'status'
>;

const FALLBACK_DESIGN: SiteDesignConfig = {
  brandName: 'Skeleton Store',
  heroEyebrow: 'دار الأزياء الخاصة · تشكيلة حصرية',
  heroTitle: 'ملابس مفصلة بعناية وإصدارات محدودة',
  heroSubtitle:
    'مجموعة أزياء مختارة بعناية وبتصميمك الشخصي حسب طلبك وذوقك.',
  heroImage: '/assets/aistudio/IMG_20261114_220710_aa9d7c03.png',
  bgColor: '#141812',
  surfaceColor: '#1E241A',
  textColor: '#F2ECE0',
  mutedColor: '#B0B5A6',
  accentColor: '#6BB83B',
  borderColor: '#34402C',
  gridColumns: 3,
  radiusStyle: 'sharp',
  defaultCurrency: 'USD',
  contactEmail: '',
  contactPhone: '',
  contactInstagram: '',
  studioColors: [
    { name: 'أسود فاحم', hex: '#141518' },
    { name: 'عاجي ناصع', hex: '#EFECE6' },
    { name: 'رمادي دخاني', hex: '#3E424B' },
    { name: 'بيج رملي', hex: '#C8B89D' },
    { name: 'بني إسبريسو', hex: '#3B2B23' },
    { name: 'كحلي ليلي', hex: '#17223B' },
    { name: 'عنابي ملكي', hex: '#5A1E28' },
    { name: 'أخضر غامق', hex: '#18362B' },
  ],
};

function isOwnerRouteActive(): boolean {
  const path = window.location.pathname.replace(/\/+$/, '').toLowerCase();
  const hash = window.location.hash.replace(/^#\/?/, '').toLowerCase();
  return (
    path === '/admin' ||
    path.endsWith('/admin') ||
    hash === 'admin' ||
    path === '/owner' ||
    hash === 'owner'
  );
}

export default function App() {
  const [viewMode, setViewMode] = useState<'store' | 'owner'>(() =>
    isOwnerRouteActive() ? 'owner' : 'store'
  );
  const [ownerInitialTab, setOwnerInitialTab] = useState<OwnerTab>('products');
  const [ownerConfigured, setOwnerConfigured] = useState(true);
  const [ownerToken, setOwnerToken] = useState<string | null>(() =>
    sessionStorage.getItem(OWNER_TOKEN_KEY)
  );

  const [design, setDesign] = useState<SiteDesignConfig>(FALLBACK_DESIGN);
  const [products, setProducts] = useState<Product[]>([]);
  const [deliveryRates, setDeliveryRates] = useState<DeliveryRatesMap>(() =>
    buildDefaultDeliveryRates('USD')
  );
  const [loadingInit, setLoadingInit] = useState(true);

  const [vipToken, setVipToken] = useState<string | null>(() =>
    localStorage.getItem(VIP_TOKEN_KEY)
  );
  const [vipSession, setVipSession] = useState<VipSessionPreview | null>(null);

  const [privacyModalOpen, setPrivacyModalOpen] = useState(false);
  const [vipModalOpen, setVipModalOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [contactModalOpen, setContactModalOpen] = useState(false);

  const fetchBootstrap = useCallback(async () => {
    try {
      const [storeRes, ownerRes] = await Promise.all([
        fetch('/api/store/bootstrap'),
        fetch('/api/owner/status'),
      ]);
      if (storeRes.ok) {
        const storeData = await storeRes.json();
        if (storeData.design) setDesign(storeData.design);
        if (Array.isArray(storeData.products)) setProducts(storeData.products);
        if (storeData.deliveryRates) setDeliveryRates(storeData.deliveryRates);
      }
      if (ownerRes.ok) {
        const ownerData = await ownerRes.json();
        setOwnerConfigured(Boolean(ownerData.ownerConfigured));
      }
    } catch {
      // Ignore network hiccup
    }
  }, []);

  const fetchVipSession = useCallback(async (token: string) => {
    try {
      const res = await fetch('/api/vip/session', {
        headers: { 'x-vip-token': token },
      });
      if (!res.ok) {
        localStorage.removeItem(VIP_TOKEN_KEY);
        setVipToken(null);
        setVipSession(null);
        return;
      }
      const data = await res.json();
      setVipSession(data.request);
    } catch {
      // Ignore
    }
  }, []);

  useEffect(() => {
    let active = true;
    async function init() {
      await fetchBootstrap();
      const storedVip = localStorage.getItem(VIP_TOKEN_KEY);
      if (storedVip && active) {
        await fetchVipSession(storedVip);
      }
      if (active) setLoadingInit(false);
    }
    init();
    return () => {
      active = false;
    };
  }, [fetchBootstrap, fetchVipSession]);

  // Listen to hidden owner URL hash/path & keyboard shortcut (Ctrl+Shift+O or Alt+Shift+O)
  useEffect(() => {
    function handleNavigation() {
      setViewMode(isOwnerRouteActive() ? 'owner' : 'store');
    }
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.altKey) && e.shiftKey && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        setViewMode((prev) => {
          const next = prev === 'owner' ? 'store' : 'owner';
          if (next === 'owner') {
            window.history.pushState(null, '', '/admin');
          } else {
            window.history.replaceState(null, '', '/');
          }
          return next;
        });
      }
    }
    window.addEventListener('hashchange', handleNavigation);
    window.addEventListener('popstate', handleNavigation);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('hashchange', handleNavigation);
      window.removeEventListener('popstate', handleNavigation);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Global Minecraft-style UI click sound for all interactive buttons, links, and controls
  useEffect(() => {
    function handleGlobalClick(e: MouseEvent) {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const interactive = target.closest(
        'button, a, [role="button"], [role="menuitem"], label.mc-btn, label.mc-btn-sm, input[type="checkbox"]'
      ) as HTMLElement | null;
      if (!interactive) return;
      if (
        (interactive as HTMLButtonElement).disabled ||
        interactive.getAttribute('aria-disabled') === 'true'
      ) {
        return;
      }
      const isSoft =
        interactive.classList.contains('mc-btn-sm') ||
        interactive.tagName === 'INPUT' ||
        interactive.getAttribute('role') === 'menuitem';
      playMinecraftClick(isSoft ? 'soft' : 'primary');
    }

    document.addEventListener('click', handleGlobalClick, { capture: true });
    return () => {
      document.removeEventListener('click', handleGlobalClick, { capture: true });
    };
  }, []);

  // Live public WebSocket for design updates, product updates, and VIP status
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const tokenQuery = vipToken ? `&token=${encodeURIComponent(vipToken)}` : '';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws?role=public${tokenQuery}`);

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'store:design_updated' && msg.design) {
          setDesign(msg.design);
        } else if (msg.type === 'store:products_updated' && Array.isArray(msg.products)) {
          setProducts(msg.products);
        } else if (msg.type === 'store:delivery_updated' && msg.deliveryRates) {
          setDeliveryRates(msg.deliveryRates);
        } else if (msg.type === 'vip:status' && msg.request) {
          setVipSession(msg.request);
        }
      } catch {
        // Ignore
      }
    };

    return () => {
      ws.close();
    };
  }, [vipToken]);

  const handleOwnerLoggedOut = useCallback(() => {
    sessionStorage.removeItem(OWNER_TOKEN_KEY);
    setOwnerToken(null);
  }, []);

  function handleOwnerAuthenticated(token: string) {
    sessionStorage.setItem(OWNER_TOKEN_KEY, token);
    setOwnerToken(token);
    setOwnerConfigured(true);
  }

  function openStoreView() {
    window.history.replaceState(null, '', '/');
    setViewMode('store');
    fetchBootstrap();
  }

  function openOwnerView(tab: OwnerTab) {
    setOwnerInitialTab(tab);
    window.history.pushState(null, '', '/admin');
    setViewMode('owner');
  }

  async function handleQuickUpdateWilayaRate(
    wilayaCode: string,
    postOfficePrice: number,
    homePrice: number
  ): Promise<boolean> {
    if (!ownerToken) return false;
    try {
      const res = await fetch('/api/owner/delivery-rates', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-owner-token': ownerToken,
        },
        body: JSON.stringify({
          deliveryRates: {
            [wilayaCode]: { postOfficePrice, homePrice },
          },
        }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      if (data.deliveryRates) setDeliveryRates(data.deliveryRates);
      return true;
    } catch {
      return false;
    }
  }

  async function handleUpdateStudioColors(colors: StudioGarmentColor[]): Promise<boolean> {
    if (!ownerToken) return false;
    try {
      const res = await fetch('/api/owner/studio-colors', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-owner-token': ownerToken,
        },
        body: JSON.stringify({ studioColors: colors }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      if (data.design) setDesign(data.design);
      return true;
    } catch {
      return false;
    }
  }

  async function handleUpdateHeroImage(heroImage: string): Promise<boolean> {
    if (!ownerToken) return false;
    try {
      const res = await fetch('/api/owner/hero-image', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-owner-token': ownerToken,
        },
        body: JSON.stringify({ heroImage }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      if (data.design) setDesign(data.design);
      return true;
    } catch {
      return false;
    }
  }

  if (loadingInit) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#141812] text-sm text-[#B0B5A6]">
        جاري التحميل...
      </div>
    );
  }

  return (
    <>
      {viewMode === 'owner' ? (
        <OwnerPortal
          ownerConfigured={ownerConfigured}
          ownerToken={ownerToken}
          initialTab={ownerInitialTab}
          onOwnerAuthenticated={handleOwnerAuthenticated}
          onOwnerLoggedOut={handleOwnerLoggedOut}
          onDesignUpdated={(nextDesign) => setDesign(nextDesign)}
          onProductsUpdated={(nextProducts) => setProducts(nextProducts)}
          onDeliveryRatesUpdated={(nextRates) => setDeliveryRates(nextRates)}
          onBackToStore={openStoreView}
        />
      ) : (
        <Storefront
          design={design}
          products={products}
          deliveryRates={deliveryRates}
          vipSession={vipSession}
          vipToken={vipToken}
          isOwnerAuthenticated={Boolean(ownerToken)}
          onOrderCreated={() => {
            fetchBootstrap();
          }}
          onOpenPrivacy={() => setPrivacyModalOpen(true)}
          onOpenVipModal={() => setVipModalOpen(true)}
          onOpenContact={() => setContactModalOpen(true)}
          onOwnerAddProduct={() => setQuickAddOpen(true)}
          onOwnerOpenDesign={() => openOwnerView('design')}
          onOwnerOpenDelivery={() => openOwnerView('delivery')}
          onOwnerOpenDashboard={() => openOwnerView('products')}
          onQuickUpdateWilayaRate={handleQuickUpdateWilayaRate}
          onUpdateStudioColors={handleUpdateStudioColors}
          onUpdateHeroImage={handleUpdateHeroImage}
        />
      )}

      <ContactModal
        isOpen={contactModalOpen}
        design={design}
        onClose={() => setContactModalOpen(false)}
      />

      <PrivacyPolicyModal
        isOpen={privacyModalOpen}
        design={design}
        onClose={() => setPrivacyModalOpen(false)}
      />

      <VipJoinModal
        isOpen={vipModalOpen}
        design={design}
        vipSession={vipSession}
        onClose={() => setVipModalOpen(false)}
        onSubmitted={(token, request) => {
          localStorage.setItem(VIP_TOKEN_KEY, token);
          setVipToken(token);
          setVipSession(request);
        }}
        onReset={() => {
          localStorage.removeItem(VIP_TOKEN_KEY);
          setVipToken(null);
          setVipSession(null);
        }}
        onOpenPrivacy={() => {
          setVipModalOpen(false);
          setPrivacyModalOpen(true);
        }}
      />

      {ownerToken && (
        <AddProductModal
          isOpen={quickAddOpen}
          ownerToken={ownerToken}
          defaultCurrency={design.defaultCurrency}
          design={design}
          onClose={() => setQuickAddOpen(false)}
          onSaved={(saved, isEdit) => {
            setProducts((prev) =>
              isEdit ? prev.map((p) => (p.id === saved.id ? saved : p)) : [saved, ...prev]
            );
          }}
        />
      )}
    </>
  );
}
