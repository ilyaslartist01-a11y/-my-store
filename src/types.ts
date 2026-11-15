export type RequestStatus = 'pending' | 'approved' | 'denied' | 'revoked';
export type OrderStatus = 'pending' | 'approved' | 'completed' | 'rejected';
export type GarmentSize = 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL';
export type CurrencyCode = 'USD' | 'EUR' | 'DZD';
export type RadiusStyle = 'sharp' | 'balanced' | 'rounded';
export type DeliveryMethod = 'post_office' | 'home';
export type CustomGarmentType = 'tshirt' | 'hoodie';

export interface CustomDesignSpec {
  garmentType: CustomGarmentType;
  colorHex: string;
  colorName: string;
  previewImage: string;
  frontLayersCount: number;
  backLayersCount: number;
}

export interface WilayaDeliveryRate {
  postOfficePrice: number;
  homePrice: number;
}

export type DeliveryRatesMap = Record<string, WilayaDeliveryRate>;

export interface StudioGarmentColor {
  name: string;
  hex: string;
}

export interface SiteDesignConfig {
  brandName: string;
  heroEyebrow: string;
  heroTitle: string;
  heroSubtitle: string;
  heroImage: string;
  bgColor: string;
  surfaceColor: string;
  textColor: string;
  mutedColor: string;
  accentColor: string;
  borderColor: string;
  gridColumns: 2 | 3 | 4;
  radiusStyle: RadiusStyle;
  defaultCurrency: CurrencyCode;
  contactEmail: string;
  contactPhone: string;
  contactInstagram: string;
  studioColors: StudioGarmentColor[];
}

export interface Product {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  edition: string;
  fabric: string;
  cut: string;
  lengthCm: number;
  widthCm: number;
  stock: number;
  currency: CurrencyCode;
  sizes: GarmentSize[];
  price: number;
  image: string;
  description: string;
  createdAt?: string;
}

export interface VipCoupon {
  code: string;
  label: string;
  discountPercent: number;
  active: boolean;
  createdAt: string;
}

export interface VipRequestItem {
  id: string;
  visitorName: string;
  couponCode: string;
  couponValid: boolean;
  discountPercent: number;
  note: string;
  privacyAccepted: boolean;
  status: RequestStatus;
  createdAt: string;
  reviewedAt: string | null;
}

export interface OrderItem {
  id: string;
  title: string;
  size: string;
  price: number;
  currency: CurrencyCode;
  quantity: number;
  customDesign?: CustomDesignSpec;
}

export interface StoreOrder {
  id: string;
  visitorName: string;
  phone: string;
  wilayaCode: string;
  wilayaName: string;
  deliveryMethod: DeliveryMethod;
  deliveryFee: number;
  city: string;
  address: string;
  notes: string;
  couponCode: string | null;
  items: OrderItem[];
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  total: number;
  currency: CurrencyCode;
  status: OrderStatus;
  createdAt: string;
  gmailSentAt?: string | null;
}

export interface CartItem {
  cartKey: string;
  product: Product;
  size: GarmentSize;
  quantity: number;
  customDesign?: CustomDesignSpec;
}

export interface ContactMessage {
  id: string;
  senderName: string;
  senderContact: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export const CURRENCY_LABELS: Record<CurrencyCode, string> = {
  USD: '$',
  EUR: '€',
  DZD: 'د.ج',
};
