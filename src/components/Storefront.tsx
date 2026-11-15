import { useEffect, useRef, useState } from 'react';
import {
  ShoppingBag,
  X,
  Plus,
  Minus,
  ArrowLeft,
  CheckCircle2,
  Ticket,
  Palette,
  LayoutDashboard,
  MoreVertical,
  Mail,
  Building2,
  Home,
  Truck,
  Pencil,
  Wand2,
  ImagePlus,
} from 'lucide-react';
import type {
  CartItem,
  CurrencyCode,
  CustomDesignSpec,
  DeliveryMethod,
  DeliveryRatesMap,
  GarmentSize,
  Product,
  SiteDesignConfig,
  StoreOrder,
  StudioGarmentColor,
  VipRequestItem,
} from '../types';
import { CURRENCY_LABELS } from '../types';
import { HERO_APPAREL_IMAGE } from '../data/catalog';
import { ALGERIA_WILAYAS, findWilayaByCode } from '../data/algeriaWilayas';
import { CustomStudioModal } from './CustomStudioModal';
import { readHeroImageFile } from '../utils/imageUpload';

interface StorefrontProps {
  design: SiteDesignConfig;
  products: Product[];
  deliveryRates: DeliveryRatesMap;
  vipSession: Pick<VipRequestItem, 'id' | 'visitorName' | 'couponCode' | 'discountPercent' | 'status'> | null;
  vipToken: string | null;
  isOwnerAuthenticated: boolean;
  onOrderCreated: (order: StoreOrder) => void;
  onOpenPrivacy: () => void;
  onOpenVipModal: () => void;
  onOpenContact: () => void;
  onOwnerAddProduct: () => void;
  onOwnerOpenDesign: () => void;
  onOwnerOpenDelivery: () => void;
  onOwnerOpenDashboard: () => void;
  onQuickUpdateWilayaRate: (
    wilayaCode: string,
    postOfficePrice: number,
    homePrice: number
  ) => Promise<boolean>;
  onUpdateStudioColors: (colors: StudioGarmentColor[]) => Promise<boolean>;
  onUpdateHeroImage: (heroImage: string) => Promise<boolean>;
}

export function Storefront({
  design,
  products,
  deliveryRates,
  vipSession,
  vipToken,
  isOwnerAuthenticated,
  onOrderCreated,
  onOpenPrivacy,
  onOpenVipModal,
  onOpenContact,
  onOwnerAddProduct,
  onOwnerOpenDesign,
  onOwnerOpenDelivery,
  onOwnerOpenDashboard,
  onQuickUpdateWilayaRate,
  onUpdateStudioColors,
  onUpdateHeroImage,
}: StorefrontProps) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [studioOpen, setStudioOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedSizes, setSelectedSizes] = useState<Record<string, GarmentSize>>({});
  const [categoryFilter, setCategoryFilter] = useState<string>('الكل');
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const [recentOrders, setRecentOrders] = useState<StoreOrder[]>([]);

  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [wilayaCode, setWilayaCode] = useState('16');
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('post_office');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [orderSuccess, setOrderSuccess] = useState<string | null>(null);

  const [editingDeliveryRate, setEditingDeliveryRate] = useState(false);
  const [quickPostPrice, setQuickPostPrice] = useState('');
  const [quickHomePrice, setQuickHomePrice] = useState('');
  const [savingQuickRate, setSavingQuickRate] = useState(false);
  const [savingHeroImage, setSavingHeroImage] = useState(false);

  useEffect(() => {
    setFailedImages((prev) => {
      if (!prev['hero']) return prev;
      const next = { ...prev };
      delete next['hero'];
      return next;
    });
  }, [design.heroImage]);

  useEffect(() => {
    if (!moreMenuOpen) return;
    function handlePointerDown(e: MouseEvent) {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setMoreMenuOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setMoreMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [moreMenuOpen]);

  const categories = ['الكل', ...Array.from(new Set(products.map((p) => p.category)))];
  const visibleProducts =
    categoryFilter === 'الكل'
      ? products
      : products.filter((p) => p.category === categoryFilter);

  const radiusClass =
    design.radiusStyle === 'sharp'
      ? 'rounded-none'
      : design.radiusStyle === 'rounded'
      ? 'rounded-2xl'
      : 'rounded-xl';

  const gridColsClass =
    design.gridColumns === 2
      ? 'md:grid-cols-2'
      : design.gridColumns === 4
      ? 'md:grid-cols-2 lg:grid-cols-4'
      : 'md:grid-cols-2 lg:grid-cols-3';

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const activeCurrency = cart[0]?.product.currency ?? design.defaultCurrency;
  const activeWilaya = findWilayaByCode(wilayaCode) ?? ALGERIA_WILAYAS[0];
  const activeRate = deliveryRates[activeWilaya.code] ?? { postOfficePrice: 0, homePrice: 0 };
  const deliveryFee =
    deliveryMethod === 'post_office' ? activeRate.postOfficePrice : activeRate.homePrice;
  const discountPercent =
    vipSession && vipSession.status === 'approved' ? vipSession.discountPercent : 0;
  const discountAmount = Math.round((subtotal * discountPercent) / 100);
  const finalTotal = Math.max(0, subtotal - discountAmount) + deliveryFee;

  function getSelectedSize(product: Product): GarmentSize {
    const chosen = selectedSizes[product.id];
    if (chosen && product.sizes.includes(chosen)) return chosen;
    return product.sizes[0] ?? 'M';
  }

  function addToCart(product: Product, size: GarmentSize) {
    if (product.stock <= 0) return;
    const key = `${product.id}-${size}`;
    setCart((prev) => {
      const existing = prev.find((item) => item.cartKey === key);
      if (existing) {
        return prev.map((item) =>
          item.cartKey === key
            ? { ...item, quantity: Math.min(product.stock, item.quantity + 1) }
            : item
        );
      }
      return [...prev, { cartKey: key, product, size, quantity: 1 }];
    });
    setCartOpen(true);
  }

  function addCustomToCart(item: {
    id: 'custom-tshirt' | 'custom-hoodie';
    title: string;
    size: GarmentSize;
    price: number;
    currency: CurrencyCode;
    customDesign: CustomDesignSpec;
  }) {
    const customProduct: Product = {
      id: item.id,
      title: item.title,
      subtitle: `لون: ${item.customDesign.colorName}`,
      category: 'تصميم خاص',
      edition: 'Custom Studio',
      fabric: item.customDesign.garmentType === 'hoodie' ? 'فليس قطني فاخر 420غ' : 'قطن عضوي ثقيل 260غ',
      cut: 'قصة عصرية مخصصة',
      lengthCm: 72,
      widthCm: 56,
      stock: 20,
      currency: item.currency,
      sizes: [item.size],
      price: item.price,
      image: item.customDesign.previewImage,
      description: `تصميم مخصص (${item.customDesign.colorName})`,
    };
    const cartKey = `custom-${item.customDesign.garmentType}-${item.customDesign.colorHex}-${item.size}-${Date.now()}`;
    setCart((prev) => [
      ...prev,
      {
        cartKey,
        product: customProduct,
        size: item.size,
        quantity: 1,
        customDesign: item.customDesign,
      },
    ]);
    setStudioOpen(false);
    setCartOpen(true);
  }

  function updateQty(cartKey: string, delta: number) {
    setCart((prev) =>
      prev
        .map((item) =>
          item.cartKey === cartKey
            ? { ...item, quantity: Math.min(item.product.stock, item.quantity + delta) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  }

  async function handleCheckout(e: React.FormEvent) {
    e.preventDefault();
    setOrderError(null);
    setOrderSuccess(null);

    if (cart.length === 0) return;
    const effectiveName = customerName.trim() || vipSession?.visitorName || '';
    if (!effectiveName || !phone.trim() || !wilayaCode) {
      setOrderError('يرجى إدخال الاسم ورقم الهاتف واختيار الولاية.');
      return;
    }
    if (deliveryMethod === 'home' && !address.trim()) {
      setOrderError('يرجى إدخال العنوان التفصيلي للتوصيل إلى المنزل.');
      return;
    }

    setSubmittingOrder(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (vipToken) headers['x-vip-token'] = vipToken;

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          visitorName: effectiveName,
          items: cart.map((c) => ({
            id: c.product.id,
            size: c.size,
            quantity: c.quantity,
            customDesign: c.customDesign,
          })),
          phone: phone.trim(),
          wilayaCode,
          deliveryMethod,
          city: city.trim(),
          address: address.trim(),
          notes: notes.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setOrderError(data.error || 'تعذر إرسال الطلبية.');
        return;
      }
      onOrderCreated(data.order);
      setRecentOrders((prev) => [data.order, ...prev]);
      setCart([]);
      setPhone('');
      setCity('');
      setAddress('');
      setNotes('');
      setOrderSuccess(`تم استلام طلبية الملابس رقم ${data.order.id} بنجاح.`);
    } catch {
      setOrderError('حدث خطأ في الاتصال بالخادم.');
    } finally {
      setSubmittingOrder(false);
    }
  }

  async function handleSaveQuickRate() {
    const p = Math.max(0, Math.round(Number(quickPostPrice) || 0));
    const h = Math.max(0, Math.round(Number(quickHomePrice) || 0));
    setSavingQuickRate(true);
    const ok = await onQuickUpdateWilayaRate(activeWilaya.code, p, h);
    setSavingQuickRate(false);
    if (ok) setEditingDeliveryRate(false);
  }

  async function handleQuickHeroImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setSavingHeroImage(true);
    try {
      const dataUrl = await readHeroImageFile(file);
      await onUpdateHeroImage(dataUrl);
    } finally {
      setSavingHeroImage(false);
    }
  }

  return (
    <div
      className="min-h-screen transition-colors duration-200"
      style={{ backgroundColor: design.bgColor, color: design.textColor }}
    >
      {/* Top Bar Contract: strictly 3 zones, no owner links visible to visitors */}
      <header
        className="sticky top-0 z-30 border-b backdrop-blur-md"
        style={{
          backgroundColor: `${design.bgColor}E6`,
          borderColor: design.borderColor,
        }}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-8 px-6 py-4">
          <a
            href="#top"
            className="minecraft-wordmark pb-0.5 text-sm tracking-wide whitespace-nowrap shrink-0 sm:text-base"
            style={{ color: design.textColor }}
          >
            {design.brandName}
          </a>

          <nav className="hidden items-center gap-6 text-sm md:flex" style={{ color: design.mutedColor }}>
            <a href="#collection" className="whitespace-nowrap shrink-0 hover:opacity-80">
              تشكيلة الملابس
            </a>
            <a href="#craft" className="whitespace-nowrap shrink-0 hover:opacity-80">
              الأقمشة والتفصيل
            </a>
            <button
              type="button"
              onClick={onOpenPrivacy}
              className="whitespace-nowrap shrink-0 hover:opacity-80"
            >
              سياسة الخصوصية
            </button>
          </nav>

          <div className="flex shrink-0 items-center gap-2.5">
            <button
              type="button"
              onClick={() => setCartOpen(true)}
              className="mc-btn inline-flex items-center gap-2 whitespace-nowrap shrink-0 px-4 py-2 text-sm font-semibold text-[#0D0E10]"
              style={{ backgroundColor: design.accentColor }}
            >
              <ShoppingBag className="h-4 w-4" />
              <span className="tabular-nums">الحقيبة ({totalItems})</span>
            </button>

            <div className="relative" ref={moreMenuRef}>
              <button
                type="button"
                onClick={() => setMoreMenuOpen((prev) => !prev)}
                aria-label="خيارات المتجر"
                aria-expanded={moreMenuOpen}
                aria-haspopup="menu"
                className="mc-btn-sm inline-flex h-9 w-9 items-center justify-center"
                style={{
                  backgroundColor: design.surfaceColor,
                  color: design.textColor,
                }}
              >
                <MoreVertical className="h-4 w-4" />
              </button>

              {moreMenuOpen && (
                <div
                  role="menu"
                  className="absolute left-0 top-full z-50 mt-2 w-60 overflow-hidden rounded-xl border p-1.5 shadow-2xl backdrop-blur-md"
                  style={{
                    backgroundColor: design.surfaceColor,
                    borderColor: design.borderColor,
                    color: design.textColor,
                  }}
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMoreMenuOpen(false);
                      onOpenVipModal();
                    }}
                    className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-right text-sm transition-colors hover:bg-white/5"
                  >
                    <Ticket className="h-4 w-4 shrink-0" style={{ color: design.accentColor }} />
                    <span>
                      {vipSession?.status === 'approved'
                        ? 'عضوية المقربين مفعلة'
                        : 'كوبون الزوار المقربين'}
                    </span>
                  </button>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMoreMenuOpen(false);
                      onOpenContact();
                    }}
                    className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-right text-sm transition-colors hover:bg-white/5"
                  >
                    <Mail className="h-4 w-4 shrink-0" style={{ color: design.accentColor }} />
                    <span>التواصل معي</span>
                  </button>

                  <div className="my-1 border-t md:hidden" style={{ borderColor: design.borderColor }} />
                  <div className="space-y-0.5 md:hidden">
                    <a
                      href="#collection"
                      onClick={() => setMoreMenuOpen(false)}
                      className="block rounded-lg px-3.5 py-2 text-right text-xs transition-colors hover:bg-white/5"
                      style={{ color: design.mutedColor }}
                    >
                      تشكيلة الملابس
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        setMoreMenuOpen(false);
                        onOpenPrivacy();
                      }}
                      className="block w-full rounded-lg px-3.5 py-2 text-right text-xs transition-colors hover:bg-white/5"
                      style={{ color: design.mutedColor }}
                    >
                      سياسة الخصوصية
                    </button>
                  </div>

                  {isOwnerAuthenticated && (
                    <>
                      <div className="my-1.5 border-t" style={{ borderColor: design.borderColor }} />
                      <div
                        className="px-3.5 py-1 text-[11px] font-medium"
                        style={{ color: design.mutedColor }}
                      >
                        أدوات المالك
                      </div>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setMoreMenuOpen(false);
                          onOwnerAddProduct();
                        }}
                        className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-right text-sm transition-colors hover:bg-white/5"
                      >
                        <Plus className="h-4 w-4 shrink-0" style={{ color: design.accentColor }} />
                        <span>إضافة ملابس</span>
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setMoreMenuOpen(false);
                          onOwnerOpenDesign();
                        }}
                        className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-right text-sm transition-colors hover:bg-white/5"
                      >
                        <Palette className="h-4 w-4 shrink-0" style={{ color: design.accentColor }} />
                        <span>الديزاين</span>
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setMoreMenuOpen(false);
                          onOwnerOpenDelivery();
                        }}
                        className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-right text-sm transition-colors hover:bg-white/5"
                      >
                        <Truck className="h-4 w-4 shrink-0" style={{ color: design.accentColor }} />
                        <span>أسعار التوصيل (69)</span>
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setMoreMenuOpen(false);
                          onOwnerOpenDashboard();
                        }}
                        className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-right text-sm transition-colors hover:bg-white/5"
                      >
                        <LayoutDashboard className="h-4 w-4 shrink-0" style={{ color: design.accentColor }} />
                        <span>الإدارة</span>
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <section id="top" className="mx-auto max-w-7xl px-6 py-12 lg:py-16">
        <div className="grid grid-cols-1 items-stretch gap-8 lg:grid-cols-12">
          <div className="flex flex-col justify-center space-y-6 lg:col-span-5">
            <p className="text-xs font-medium" style={{ color: design.accentColor }}>
              {design.heroEyebrow}
              {vipSession?.status === 'approved'
                ? ` · عضو مقرب (${vipSession.visitorName})`
                : ''}
            </p>
            <h1 className="font-display text-4xl font-semibold leading-tight sm:text-5xl">
              {design.heroTitle}
            </h1>
            <p className="max-w-md text-base leading-relaxed" style={{ color: design.mutedColor }}>
              {design.heroSubtitle}
            </p>
            <div className="flex flex-col items-start gap-3">
              <a
                href="#collection"
                className="mc-btn inline-flex items-center gap-2 whitespace-nowrap px-6 py-3 text-sm font-semibold text-[#0D0E10]"
                style={{ backgroundColor: design.accentColor }}
              >
                <span>تصفح تشكيلة الملابس</span>
                <ArrowLeft className="h-4 w-4" />
              </a>
              <button
                type="button"
                onClick={() => setStudioOpen(true)}
                className="mc-btn inline-flex items-center gap-2 whitespace-nowrap px-6 py-3 text-sm font-semibold"
                style={{
                  backgroundColor: design.surfaceColor,
                  color: design.textColor,
                }}
              >
                <Wand2 className="h-4 w-4" style={{ color: design.accentColor }} />
                <span>صمّم تيشيرتك أو الهودي الخاص بك</span>
              </button>
            </div>
          </div>

          <div
            className={`relative overflow-hidden border lg:col-span-7 ${radiusClass}`}
            style={{ backgroundColor: design.surfaceColor, borderColor: design.borderColor }}
          >
            {!failedImages['hero'] ? (
              <img
                src={design.heroImage || HERO_APPAREL_IMAGE}
                alt={`صالة أزياء ${design.brandName}`}
                referrerPolicy="no-referrer"
                onError={() => setFailedImages((prev) => ({ ...prev, hero: true }))}
                className="aspect-[4/3] w-full object-cover object-[50%_58%] lg:h-[520px]"
              />
            ) : (
              <div className="flex aspect-[4/3] w-full items-center justify-center lg:h-[520px]">
                <span className="minecraft-wordmark text-xl sm:text-2xl" style={{ color: design.accentColor }}>
                  {design.brandName}
                </span>
              </div>
            )}

            {isOwnerAuthenticated && (
              <label
                className="mc-btn-sm absolute bottom-3 left-3 inline-flex cursor-pointer items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#0D0E10]"
                style={{ backgroundColor: design.accentColor }}
                title="تغيير الصورة الرئيسية"
              >
                <ImagePlus className="h-3.5 w-3.5" />
                <span>{savingHeroImage ? 'جاري التحديث...' : 'تغيير الصورة'}</span>
                <input
                  type="file"
                  accept="image/*"
                  disabled={savingHeroImage}
                  onChange={handleQuickHeroImageUpload}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </div>
      </section>

      <section
        id="collection"
        className="mx-auto max-w-7xl border-t px-6 py-14"
        style={{ borderColor: design.borderColor }}
      >
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-2xl font-semibold sm:text-3xl">المجموعة الموسمية</h2>
            <p className="mt-1.5 text-sm" style={{ color: design.mutedColor }}>
              تصفح القطع المتوفرة مع تفاصيل الطول والعرض والمقاسات والكمية المتبقية.
            </p>
          </div>

          <div
            className="flex flex-wrap items-center gap-1.5 border p-1.5"
            style={{ backgroundColor: design.surfaceColor, borderColor: design.borderColor }}
          >
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className="mc-btn-sm whitespace-nowrap px-3.5 py-1.5 text-xs font-semibold"
                style={
                  categoryFilter === cat
                    ? { backgroundColor: design.accentColor, color: '#0D0E10' }
                    : { backgroundColor: design.bgColor, color: design.mutedColor }
                }
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className={`grid grid-cols-1 gap-8 ${gridColsClass}`}>
          {visibleProducts.map((product) => {
            const activeSize = getSelectedSize(product);
            const currencyLabel = CURRENCY_LABELS[product.currency] ?? product.currency;
            return (
              <article
                key={product.id}
                className={`group flex flex-col overflow-hidden border transition-transform duration-200 hover:-translate-y-0.5 ${radiusClass}`}
                style={{ backgroundColor: design.surfaceColor, borderColor: design.borderColor }}
              >
                <button
                  type="button"
                  onClick={() => setSelectedProduct(product)}
                  className="relative aspect-[4/3] w-full overflow-hidden text-right"
                  style={{ backgroundColor: design.bgColor }}
                >
                  {!failedImages[product.id] ? (
                    <img
                      src={product.image}
                      alt={product.title}
                      referrerPolicy="no-referrer"
                      onError={() => setFailedImages((prev) => ({ ...prev, [product.id]: true }))}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center p-6">
                      <span className="font-display text-xl" style={{ color: design.accentColor }}>
                        {product.subtitle}
                      </span>
                    </div>
                  )}
                </button>

                <div className="flex flex-1 flex-col justify-between gap-4 p-6">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2 text-xs" style={{ color: design.mutedColor }}>
                      <span>{product.category}</span>
                      <span aria-hidden="true">·</span>
                      <span>{product.edition}</span>
                    </div>
                    <h3 className="text-lg font-semibold">{product.title}</h3>
                    <p className="text-xs leading-relaxed" style={{ color: design.mutedColor }}>
                      {product.description}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 pt-1 font-mono text-xs tabular-nums" style={{ color: design.mutedColor }}>
                      <span>الطول: {product.lengthCm} سم</span>
                      <span aria-hidden="true">·</span>
                      <span>العرض: {product.widthCm} سم</span>
                      <span aria-hidden="true">·</span>
                      <span>المتوفر: {product.stock}</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs" style={{ color: design.mutedColor }}>
                        المقاس:
                      </span>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {product.sizes.map((sz) => (
                          <button
                            key={sz}
                            type="button"
                            onClick={() => setSelectedSizes((prev) => ({ ...prev, [product.id]: sz }))}
                            className="mc-btn-sm h-8 min-w-[34px] px-2 font-mono text-xs font-semibold"
                            style={
                              activeSize === sz
                                ? {
                                    backgroundColor: design.accentColor,
                                    color: '#0D0E10',
                                  }
                                : {
                                    backgroundColor: design.bgColor,
                                    color: design.textColor,
                                  }
                            }
                          >
                            {sz}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div
                      className="flex items-center justify-between border-t pt-4"
                      style={{ borderColor: design.borderColor }}
                    >
                      <span className="font-mono text-base font-semibold tabular-nums">
                        {product.price.toLocaleString('en-US')} {currencyLabel}
                      </span>
                      <button
                        type="button"
                        disabled={product.stock <= 0}
                        onClick={() => addToCart(product, activeSize)}
                        className="mc-btn whitespace-nowrap px-4 py-2 text-xs font-semibold text-[#0D0E10] disabled:opacity-40"
                        style={{ backgroundColor: design.accentColor }}
                      >
                        {product.stock > 0 ? 'أضف إلى الحقيبة' : 'نفدت الكمية'}
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section
        id="craft"
        className="mx-auto max-w-7xl border-t px-6 py-14"
        style={{ borderColor: design.borderColor }}
      >
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          <div className="space-y-2">
            <h3 className="text-base font-semibold">01. أقمشة بجودة عالية</h3>
            <p className="text-sm leading-relaxed" style={{ color: design.mutedColor }}>
              نختار قماش عالي الجودة يعزز ثقتكم بمنتوجاتنا.
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="text-base font-semibold">02. مقاسات دقيقة ومفصلة</h3>
            <p className="text-sm leading-relaxed" style={{ color: design.mutedColor }}>
              تأتي كل قطعة ببيانات واضحة للطول والعرض والمقاسات المتاحة لتسهيل اختيار القياس الدقيق.
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="text-base font-semibold">03. امتيازات الزوار المقربين</h3>
            <p className="text-sm leading-relaxed" style={{ color: design.mutedColor }}>
              يمكن لحاملي كوبونات الزوار المقربين تسجيل أسمائهم للاستفادة من الخصومات الخاصة عند الشراء.
            </p>
          </div>
        </div>
      </section>

      {recentOrders.length > 0 && (
        <section
          className="mx-auto max-w-7xl border-t px-6 py-12"
          style={{ borderColor: design.borderColor }}
        >
          <h2 className="text-xl font-semibold">طلبياتك المسجلة في هذه الجلسة</h2>
          <div
            className="mt-4 divide-y rounded-xl border"
            style={{ backgroundColor: design.surfaceColor, borderColor: design.borderColor }}
          >
            {recentOrders.map((order) => (
              <div key={order.id} className="flex flex-wrap items-center justify-between gap-4 p-5">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-mono font-semibold tabular-nums" style={{ color: design.accentColor }}>
                      {order.id}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">
                      {order.total.toLocaleString('en-US')} {CURRENCY_LABELS[order.currency] ?? order.currency}
                    </span>
                  </div>
                  <p className="text-xs" style={{ color: design.mutedColor }}>
                    {order.items
                      .map((it) => `${it.title} — مقاس ${it.size} (×${it.quantity})`)
                      .join(' · ')}
                  </p>
                  <p className="text-xs" style={{ color: design.mutedColor }}>
                    ولاية {order.wilayaCode} - {order.wilayaName} ·{' '}
                    {order.deliveryMethod === 'post_office' ? 'المكتب البريدي' : 'التوصيل للمنزل'}
                  </p>
                </div>
                <span className="text-xs font-medium">تم الاستلام</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Footer strictly clean for visitors — NO owner portal link visible to visitors */}
      <footer className="border-t" style={{ borderColor: design.borderColor }}>
        <div
          className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-6 text-xs"
          style={{ color: design.mutedColor }}
        >
          <span className="flex items-center gap-1.5">
            <span>© 2026</span>
            <span className="minecraft-wordmark-sm text-[11px]" style={{ color: design.textColor }}>
              {design.brandName}
            </span>
            <span>· متجر الأزياء</span>
          </span>
          <div className="flex flex-wrap items-center gap-5">
            <button type="button" onClick={onOpenPrivacy} className="hover:opacity-80">
              سياسة الخصوصية
            </button>
          </div>
        </div>
      </footer>

      {selectedProduct && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div
            className={`grid max-h-[90vh] w-full max-w-3xl grid-cols-1 overflow-y-auto border md:grid-cols-2 ${radiusClass}`}
            style={{ backgroundColor: design.surfaceColor, borderColor: design.borderColor }}
          >
            <div style={{ backgroundColor: design.bgColor }}>
              <img
                src={selectedProduct.image}
                alt={selectedProduct.title}
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="flex flex-col justify-between gap-6 p-6 sm:p-8">
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs" style={{ color: design.accentColor }}>
                      {selectedProduct.category} · {selectedProduct.edition}
                    </p>
                    <h3 className="mt-1 text-xl font-semibold">{selectedProduct.title}</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedProduct(null)}
                    className="rounded-lg p-1.5 hover:opacity-80"
                    style={{ color: design.mutedColor }}
                    aria-label="إغلاق تفاصيل القطعة"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: design.mutedColor }}>
                  {selectedProduct.description}
                </p>
                <div
                  className="space-y-2 border-t pt-4 text-xs"
                  style={{ borderColor: design.borderColor }}
                >
                  <div className="flex justify-between gap-4">
                    <span style={{ color: design.mutedColor }}>القماش</span>
                    <span className="text-left">{selectedProduct.fabric}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span style={{ color: design.mutedColor }}>القصّة</span>
                    <span className="text-left">{selectedProduct.cut}</span>
                  </div>
                  <div className="flex justify-between gap-4 font-mono tabular-nums">
                    <span style={{ color: design.mutedColor }}>الأبعاد (الطول × العرض)</span>
                    <span>
                      {selectedProduct.lengthCm} سم × {selectedProduct.widthCm} سم
                    </span>
                  </div>
                  <div className="flex justify-between gap-4 font-mono tabular-nums">
                    <span style={{ color: design.mutedColor }}>العدد المتوفر</span>
                    <span>{selectedProduct.stock} قطعة</span>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs" style={{ color: design.mutedColor }}>
                    اختر المقاس:
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {selectedProduct.sizes.map((sz) => {
                      const active = getSelectedSize(selectedProduct) === sz;
                      return (
                        <button
                          key={sz}
                          type="button"
                          onClick={() =>
                            setSelectedSizes((prev) => ({ ...prev, [selectedProduct.id]: sz }))
                          }
                          className="mc-btn-sm h-8 min-w-[34px] px-2 font-mono text-xs font-semibold"
                          style={
                            active
                              ? {
                                  backgroundColor: design.accentColor,
                                  color: '#0D0E10',
                                }
                              : {
                                  backgroundColor: design.bgColor,
                                  color: design.textColor,
                                }
                          }
                        >
                          {sz}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div
                className="flex items-center justify-between border-t pt-4"
                style={{ borderColor: design.borderColor }}
              >
                <span className="font-mono text-lg font-semibold tabular-nums">
                  {selectedProduct.price.toLocaleString('en-US')}{' '}
                  {CURRENCY_LABELS[selectedProduct.currency] ?? selectedProduct.currency}
                </span>
                <button
                  type="button"
                  disabled={selectedProduct.stock <= 0}
                  onClick={() => {
                    const sz = getSelectedSize(selectedProduct);
                    addToCart(selectedProduct, sz);
                    setSelectedProduct(null);
                  }}
                  className="mc-btn whitespace-nowrap px-5 py-2.5 text-sm font-semibold text-[#0D0E10] disabled:opacity-40"
                  style={{ backgroundColor: design.accentColor }}
                >
                  {selectedProduct.stock > 0 ? 'أضف إلى الحقيبة' : 'نفدت الكمية'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {cartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm">
          <div
            className="flex h-full w-full max-w-md flex-col border-r"
            style={{
              backgroundColor: design.surfaceColor,
              borderColor: design.borderColor,
              color: design.textColor,
            }}
          >
            <div
              className="flex items-center justify-between border-b px-6 py-4"
              style={{ borderColor: design.borderColor }}
            >
              <h2 className="text-lg font-semibold">حقيبة الملابس</h2>
              <button
                type="button"
                onClick={() => setCartOpen(false)}
                className="rounded-lg p-1.5 hover:opacity-80"
                style={{ color: design.mutedColor }}
                aria-label="إغلاق الحقيبة"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto p-6">
              {orderSuccess && (
                <div className="flex items-start gap-2.5 rounded-lg border border-emerald-500/40 bg-emerald-950/30 p-4 text-sm text-emerald-200">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{orderSuccess}</span>
                </div>
              )}

              {cart.length === 0 ? (
                <p className="py-10 text-center text-sm" style={{ color: design.mutedColor }}>
                  حقيبة التسوق فارغة حالياً.
                </p>
              ) : (
                <>
                  <div className="divide-y" style={{ borderColor: design.borderColor }}>
                    {cart.map((item) => (
                      <div
                        key={item.cartKey}
                        className="flex items-center justify-between gap-3 py-4"
                      >
                        <div className="flex items-center gap-3">
                          {(item.customDesign?.previewImage || item.product.image) && (
                            <img
                              src={item.customDesign?.previewImage || item.product.image}
                              alt={item.product.title}
                              className="h-14 w-12 shrink-0 rounded-lg border object-cover"
                              style={{ borderColor: design.borderColor }}
                            />
                          )}
                          <div className="space-y-1">
                            <p className="text-sm font-medium">{item.product.title}</p>
                            {item.customDesign && (
                              <div className="flex flex-wrap items-center gap-1.5 text-[11px]" style={{ color: design.mutedColor }}>
                                <span
                                  className="inline-block h-2.5 w-2.5 rounded-full border border-white/25"
                                  style={{ backgroundColor: item.customDesign.colorHex }}
                                />
                                <span>{item.customDesign.colorName}</span>
                                <span>·</span>
                                <span>
                                  صور: {item.customDesign.frontLayersCount + item.customDesign.backLayersCount}
                                </span>
                              </div>
                            )}
                            <p className="font-mono text-xs tabular-nums" style={{ color: design.mutedColor }}>
                              مقاس {item.size} · {item.product.price.toLocaleString('en-US')}{' '}
                              {CURRENCY_LABELS[item.product.currency] ?? item.product.currency}
                            </p>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => updateQty(item.cartKey, -1)}
                            className="mc-btn-sm p-1.5"
                            style={{ backgroundColor: design.bgColor, color: design.textColor }}
                            aria-label="إنقاص الكمية"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="w-6 text-center font-mono text-xs tabular-nums">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateQty(item.cartKey, 1)}
                            className="mc-btn-sm p-1.5"
                            style={{ backgroundColor: design.bgColor, color: design.textColor }}
                            aria-label="زيادة الكمية"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <form
                    onSubmit={handleCheckout}
                    className="space-y-3.5 border-t pt-5"
                    style={{ borderColor: design.borderColor }}
                  >
                    <h3 className="text-sm font-semibold">بيانات إتمام الطلب</h3>
                    {orderError && (
                      <div className="rounded-lg border border-rose-500/40 bg-rose-950/30 px-3.5 py-2.5 text-xs text-rose-200">
                        {orderError}
                      </div>
                    )}
                    <input
                      type="text"
                      required
                      value={customerName || vipSession?.visitorName || ''}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="الاسم الكامل"
                      className="w-full rounded-lg border px-3.5 py-2.5 text-sm focus:outline-none"
                      style={{
                        backgroundColor: design.bgColor,
                        borderColor: design.borderColor,
                        color: design.textColor,
                      }}
                    />
                    <input
                      type="text"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="رقم الهاتف للتواصل"
                      className="w-full rounded-lg border px-3.5 py-2.5 text-sm focus:outline-none"
                      style={{
                        backgroundColor: design.bgColor,
                        borderColor: design.borderColor,
                        color: design.textColor,
                      }}
                    />
                    <div className="space-y-1.5">
                      <label className="block text-xs" style={{ color: design.mutedColor }}>
                        الولاية (ولايات الجزائر 69)
                      </label>
                      <select
                        required
                        value={wilayaCode}
                        onChange={(e) => {
                          setWilayaCode(e.target.value);
                          setEditingDeliveryRate(false);
                        }}
                        className="w-full rounded-lg border px-3.5 py-2.5 text-sm focus:outline-none"
                        style={{
                          backgroundColor: design.bgColor,
                          borderColor: design.borderColor,
                          color: design.textColor,
                        }}
                      >
                        {ALGERIA_WILAYAS.map((w) => (
                          <option key={w.code} value={w.code}>
                            {w.code} — {w.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs" style={{ color: design.mutedColor }}>
                          طريقة التوصيل
                        </label>
                        {isOwnerAuthenticated && (
                          <button
                            type="button"
                            onClick={() => {
                              setQuickPostPrice(String(activeRate.postOfficePrice));
                              setQuickHomePrice(String(activeRate.homePrice));
                              setEditingDeliveryRate((prev) => !prev);
                            }}
                            title="تغيير سعر التوصيل لهذه الولاية"
                            className="inline-flex items-center gap-1 text-[11px] hover:opacity-80"
                            style={{ color: design.accentColor }}
                          >
                            <Pencil className="h-3 w-3" />
                            <span>تغيير سعر التوصيل</span>
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <button
                          type="button"
                          onClick={() => setDeliveryMethod('post_office')}
                          className="mc-btn flex flex-col items-start gap-1 p-3 text-right"
                          style={
                            deliveryMethod === 'post_office'
                              ? {
                                  backgroundColor: `${design.accentColor}26`,
                                  color: design.textColor,
                                }
                              : {
                                  backgroundColor: design.bgColor,
                                  color: design.mutedColor,
                                }
                          }
                        >
                          <div className="flex w-full items-center justify-between gap-2">
                            <Building2
                              className="h-4 w-4 shrink-0"
                              style={{
                                color:
                                  deliveryMethod === 'post_office'
                                    ? design.accentColor
                                    : design.mutedColor,
                              }}
                            />
                            <span className="font-mono text-xs font-semibold tabular-nums">
                              {activeRate.postOfficePrice.toLocaleString('en-US')}{' '}
                              {CURRENCY_LABELS[activeCurrency] ?? activeCurrency}
                            </span>
                          </div>
                          <span className="text-xs font-medium">المكتب البريدي</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setDeliveryMethod('home')}
                          className="mc-btn flex flex-col items-start gap-1 p-3 text-right"
                          style={
                            deliveryMethod === 'home'
                              ? {
                                  backgroundColor: `${design.accentColor}26`,
                                  color: design.textColor,
                                }
                              : {
                                  backgroundColor: design.bgColor,
                                  color: design.mutedColor,
                                }
                          }
                        >
                          <div className="flex w-full items-center justify-between gap-2">
                            <Home
                              className="h-4 w-4 shrink-0"
                              style={{
                                color:
                                  deliveryMethod === 'home'
                                    ? design.accentColor
                                    : design.mutedColor,
                              }}
                            />
                            <span className="font-mono text-xs font-semibold tabular-nums">
                              {activeRate.homePrice.toLocaleString('en-US')}{' '}
                              {CURRENCY_LABELS[activeCurrency] ?? activeCurrency}
                            </span>
                          </div>
                          <span className="text-xs font-medium">التوصيل للمنزل</span>
                        </button>
                      </div>
                    </div>

                    {isOwnerAuthenticated && editingDeliveryRate && (
                      <div
                        className="space-y-2.5 rounded-lg border p-3"
                        style={{
                          backgroundColor: design.bgColor,
                          borderColor: design.accentColor,
                        }}
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium">
                            تعديل سعر التوصيل: {activeWilaya.code} — {activeWilaya.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setCartOpen(false);
                              onOwnerOpenDelivery();
                            }}
                            className="text-[11px] underline hover:opacity-80"
                            style={{ color: design.accentColor }}
                          >
                            كل الولايات (69)
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="mb-1 block text-[11px]" style={{ color: design.mutedColor }}>
                              المكتب البريدي ({CURRENCY_LABELS[activeCurrency] ?? activeCurrency})
                            </label>
                            <input
                              type="number"
                              min={0}
                              value={quickPostPrice}
                              onChange={(e) => setQuickPostPrice(e.target.value)}
                              className="w-full rounded-md border px-2.5 py-1.5 font-mono text-xs tabular-nums focus:outline-none"
                              style={{
                                backgroundColor: design.surfaceColor,
                                borderColor: design.borderColor,
                                color: design.textColor,
                              }}
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-[11px]" style={{ color: design.mutedColor }}>
                              المنزل ({CURRENCY_LABELS[activeCurrency] ?? activeCurrency})
                            </label>
                            <input
                              type="number"
                              min={0}
                              value={quickHomePrice}
                              onChange={(e) => setQuickHomePrice(e.target.value)}
                              className="w-full rounded-md border px-2.5 py-1.5 font-mono text-xs tabular-nums focus:outline-none"
                              style={{
                                backgroundColor: design.surfaceColor,
                                borderColor: design.borderColor,
                                color: design.textColor,
                              }}
                            />
                          </div>
                        </div>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingDeliveryRate(false)}
                            className="mc-btn-sm px-2.5 py-1 text-xs"
                            style={{ backgroundColor: design.surfaceColor, color: design.mutedColor }}
                          >
                            إلغاء
                          </button>
                          <button
                            type="button"
                            disabled={savingQuickRate}
                            onClick={handleSaveQuickRate}
                            className="mc-btn-sm px-3 py-1 text-xs font-semibold text-[#0D0E10]"
                            style={{ backgroundColor: design.accentColor }}
                          >
                            {savingQuickRate ? 'حفظ...' : 'حفظ السعر'}
                          </button>
                        </div>
                      </div>
                    )}

                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="البلدية / الدائرة (اختياري)"
                      className="w-full rounded-lg border px-3.5 py-2.5 text-sm focus:outline-none"
                      style={{
                        backgroundColor: design.bgColor,
                        borderColor: design.borderColor,
                        color: design.textColor,
                      }}
                    />
                    <input
                      type="text"
                      required={deliveryMethod === 'home'}
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder={
                        deliveryMethod === 'home'
                          ? 'العنوان التفصيلي للمنزل'
                          : 'اسم مكتب التوصيل / البريد (اختياري)'
                      }
                      className="w-full rounded-lg border px-3.5 py-2.5 text-sm focus:outline-none"
                      style={{
                        backgroundColor: design.bgColor,
                        borderColor: design.borderColor,
                        color: design.textColor,
                      }}
                    />
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="ملاحظات التوصيل (اختياري)"
                      className="w-full rounded-lg border px-3.5 py-2.5 text-sm focus:outline-none"
                      style={{
                        backgroundColor: design.bgColor,
                        borderColor: design.borderColor,
                        color: design.textColor,
                      }}
                    />

                    <div
                      className="space-y-1.5 border-t pt-3 text-sm"
                      style={{ borderColor: design.borderColor }}
                    >
                      <div className="flex items-center justify-between text-xs" style={{ color: design.mutedColor }}>
                        <span>المجموع الفرعي</span>
                        <span className="font-mono tabular-nums">
                          {subtotal.toLocaleString('en-US')} {CURRENCY_LABELS[activeCurrency] ?? activeCurrency}
                        </span>
                      </div>
                      {discountPercent > 0 && (
                        <div className="flex items-center justify-between text-xs text-emerald-400">
                          <span>خصم كوبون المقربين ({discountPercent}%)</span>
                          <span className="font-mono tabular-nums">
                            -{discountAmount.toLocaleString('en-US')} {CURRENCY_LABELS[activeCurrency] ?? activeCurrency}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-xs" style={{ color: design.mutedColor }}>
                        <span className="flex items-center gap-1.5">
                          <span>
                            التوصيل ({activeWilaya.code} {activeWilaya.name} ·{' '}
                            {deliveryMethod === 'post_office' ? 'المكتب البريدي' : 'المنزل'})
                          </span>
                          {isOwnerAuthenticated && (
                            <button
                              type="button"
                              onClick={() => {
                                setQuickPostPrice(String(activeRate.postOfficePrice));
                                setQuickHomePrice(String(activeRate.homePrice));
                                setEditingDeliveryRate((prev) => !prev);
                              }}
                              title="تغيير سعر التوصيل"
                              className="rounded p-0.5 hover:opacity-80"
                              style={{ color: design.accentColor }}
                              aria-label="تغيير سعر التوصيل"
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                          )}
                        </span>
                        <span className="font-mono tabular-nums">
                          {deliveryFee.toLocaleString('en-US')} {CURRENCY_LABELS[activeCurrency] ?? activeCurrency}
                        </span>
                      </div>
                      <div className="flex items-center justify-between pt-1">
                        <span>الإجمالي النهائي</span>
                        <span className="font-mono text-base font-semibold tabular-nums">
                          {finalTotal.toLocaleString('en-US')} {CURRENCY_LABELS[activeCurrency] ?? activeCurrency}
                        </span>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={submittingOrder}
                      className="mc-btn w-full whitespace-nowrap px-5 py-3 text-sm font-semibold text-[#0D0E10] disabled:opacity-60"
                      style={{ backgroundColor: design.accentColor }}
                    >
                      {submittingOrder ? 'جاري إرسال الطلبية...' : 'تأكيد وإرسال الطلبية'}
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <CustomStudioModal
        isOpen={studioOpen}
        design={design}
        isOwnerAuthenticated={isOwnerAuthenticated}
        onUpdateStudioColors={onUpdateStudioColors}
        onClose={() => setStudioOpen(false)}
        onAddToCart={addCustomToCart}
      />
    </div>
  );
}
