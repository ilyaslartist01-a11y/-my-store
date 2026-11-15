import express from 'express';
import http from 'http';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import {
  ALGERIA_WILAYAS,
  buildDefaultDeliveryRates,
  findWilayaByCode,
} from './src/data/algeriaWilayas.ts';
import type { DeliveryRatesMap } from './src/data/algeriaWilayas.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'store-state.json');

type RequestStatus = 'pending' | 'approved' | 'denied' | 'revoked';
type OrderStatus = 'pending' | 'approved' | 'completed' | 'rejected';
type GarmentSize = 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL';
type CurrencyCode = 'USD' | 'EUR' | 'DZD';
type RadiusStyle = 'sharp' | 'balanced' | 'rounded';
type DeliveryMethod = 'post_office' | 'home';

interface StoreConfig {
  ownerConfigured: boolean;
  ownerPasswordHash: string | null;
  updatedAt: string | null;
}

interface StudioGarmentColorRecord {
  name: string;
  hex: string;
}

interface SiteDesignConfig {
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
  studioColors: StudioGarmentColorRecord[];
}

interface ProductRecord {
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
  createdAt: string;
}

interface VipCouponRecord {
  code: string;
  label: string;
  discountPercent: number;
  active: boolean;
  createdAt: string;
}

interface VipRequestRecord {
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
  sessionToken: string;
}

interface CustomDesignRecord {
  garmentType: 'tshirt' | 'hoodie';
  colorHex: string;
  colorName: string;
  previewImage: string;
  frontLayersCount: number;
  backLayersCount: number;
}

interface OrderItemRecord {
  id: string;
  title: string;
  size: string;
  price: number;
  currency: CurrencyCode;
  quantity: number;
  customDesign?: CustomDesignRecord;
}

interface StoreOrderRecord {
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
  items: OrderItemRecord[];
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  total: number;
  currency: CurrencyCode;
  status: OrderStatus;
  createdAt: string;
  gmailSentAt?: string | null;
}

interface OwnerTokenRecord {
  token: string;
  createdAt: number;
}

interface ContactMessageRecord {
  id: string;
  senderName: string;
  senderContact: string;
  message: string;
  read: boolean;
  createdAt: string;
}

interface PersistedState {
  config: StoreConfig;
  design: SiteDesignConfig;
  products: ProductRecord[];
  deliveryRates: DeliveryRatesMap;
  vipCoupons: VipCouponRecord[];
  vipRequests: VipRequestRecord[];
  orders: StoreOrderRecord[];
  contactMessages: ContactMessageRecord[];
  ownerTokens: OwnerTokenRecord[];
}

const DEFAULT_STUDIO_COLORS: StudioGarmentColorRecord[] = [
  { name: 'أسود فاحم', hex: '#141518' },
  { name: 'عاجي ناصع', hex: '#EFECE6' },
  { name: 'رمادي دخاني', hex: '#3E424B' },
  { name: 'بيج رملي', hex: '#C8B89D' },
  { name: 'بني إسبريسو', hex: '#3B2B23' },
  { name: 'كحلي ليلي', hex: '#17223B' },
  { name: 'عنابي ملكي', hex: '#5A1E28' },
  { name: 'أخضر غامق', hex: '#18362B' },
];

const DEFAULT_DESIGN: SiteDesignConfig = {
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
  studioColors: DEFAULT_STUDIO_COLORS,
};

const DEFAULT_PRODUCTS: ProductRecord[] = [
  {
    id: 'wool-overcoat',
    title: 'معطف صوف فاحم مزدوج الصدر',
    subtitle: 'Double-Breasted Wool Overcoat',
    category: 'المعاطف',
    edition: 'إصدار الخريف · 01',
    fabric: 'صوف بكر إيطالي 100% بوزن 580 جم',
    cut: 'قصّة كلاسيكية مهيكلة بأكتاف محددة',
    lengthCm: 112,
    widthCm: 56,
    stock: 8,
    currency: 'USD',
    sizes: ['S', 'M', 'L', 'XL'],
    price: 1850,
    image: '/src/assets/images/product_wool_coat_1794528340802.jpg',
    description:
      'معطف رسمي طويل مفصّل بدقة من الصوف الفاحم الثقيل مع طية صدر عريضة وبطانة داخلية ناعمة توفر ثباتاً وأناقة عالية في المناسبات الرسمية.',
    createdAt: '2026-11-12T10:00:00.000Z',
  },
  {
    id: 'silk-shirt',
    title: 'قميص حريري مقصّب بلون العاج',
    subtitle: 'Structured Ivory Silk-Cotton Shirt',
    category: 'القمصان',
    edition: 'إصدار الاستوديو · 02',
    fabric: 'مزيج حرير التوت والقطن المصري طويل التيلة',
    cut: 'قصّة رسمية متوازنة مع ياقة مقوّاة',
    lengthCm: 76,
    widthCm: 52,
    stock: 14,
    currency: 'USD',
    sizes: ['S', 'M', 'L', 'XL'],
    price: 690,
    image: '/src/assets/images/product_silk_shirt_1794528340066.jpg',
    description:
      'قميص رسمي بلون العاج الدافئ بأزرار صدفية طبيعية وأساور فرنسية دقيقة، مصمم ليمنح مظهراً رصيناً ومريحاً طوال اليوم.',
    createdAt: '2026-11-12T10:05:00.000Z',
  },
  {
    id: 'cashmere-set',
    title: 'كنزة كشمير فاخرة وسروال صوف مفصّل',
    subtitle: 'Cashmere Knit & Tailored Trousers',
    category: 'التريكو والبنطلونات',
    edition: 'مجموعة المقربين · 03',
    fabric: 'كشمير خالص مزدوج الخيط مع صوف ميرينو',
    cut: 'قصّة مريحة متناسقة بخصر متوسط الارتفاع',
    lengthCm: 70,
    widthCm: 54,
    stock: 10,
    currency: 'USD',
    sizes: ['S', 'M', 'L', 'XL'],
    price: 1240,
    image: '/src/assets/images/product_cashmere_knit_1794528340747.jpg',
    description:
      'طقم أنيق يجمع بين كنزة محبوكة من الكشمير الرمادي الداكن وسروال رسمي بطيّات أمامية حادة، يجمع بين الفخامة والراحة العملية.',
    createdAt: '2026-11-12T10:10:00.000Z',
  },
];

const VALID_SIZES = new Set<GarmentSize>(['XS', 'S', 'M', 'L', 'XL', 'XXL']);
const VALID_CURRENCIES = new Set<CurrencyCode>(['USD', 'EUR', 'DZD']);

function normalizeCurrency(val: unknown, fallback: CurrencyCode = 'USD'): CurrencyCode {
  return typeof val === 'string' && VALID_CURRENCIES.has(val as CurrencyCode)
    ? (val as CurrencyCode)
    : fallback;
}

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadState(): PersistedState {
  ensureDataDir();
  if (fs.existsSync(DATA_FILE)) {
    try {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<PersistedState>;
      const legacyRequests = Array.isArray((parsed as { requests?: unknown[] }).requests)
        ? ((parsed as { requests?: Array<Partial<VipRequestRecord> & { accessType?: string }> }).requests ?? [])
            .filter((r) => r.accessType === 'vip_coupon' && r.couponCode)
            .map((r) => ({
              id: r.id || `VIP-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
              visitorName: r.visitorName || 'زائر',
              couponCode: r.couponCode || '',
              couponValid: Boolean(r.couponValid),
              discountPercent: Number(r.discountPercent) || 0,
              note: r.note || '',
              privacyAccepted: Boolean(r.privacyAccepted),
              status: (r.status as RequestStatus) || 'pending',
              createdAt: r.createdAt || new Date().toISOString(),
              reviewedAt: r.reviewedAt ?? null,
              sessionToken: r.sessionToken || crypto.randomBytes(16).toString('hex'),
            }))
        : [];

      const sanitizeStudioColors = (raw: unknown): StudioGarmentColorRecord[] => {
        if (!Array.isArray(raw)) return DEFAULT_STUDIO_COLORS;
        const cleaned = raw
          .filter(
            (item): item is { name?: unknown; hex?: unknown } =>
              Boolean(item && typeof item === 'object')
          )
          .map((item) => ({
            name: typeof item.name === 'string' && item.name.trim() ? item.name.trim().slice(0, 40) : 'لون مخصص',
            hex: typeof item.hex === 'string' && /^#[0-9a-fA-F]{6}$/.test(item.hex.trim()) ? item.hex.trim().toUpperCase() : '',
          }))
          .filter((item) => item.hex !== '');
        return cleaned.length > 0 ? cleaned.slice(0, 30) : DEFAULT_STUDIO_COLORS;
      };

      const mergedDesign: SiteDesignConfig = {
        ...DEFAULT_DESIGN,
        ...(parsed.design ?? {}),
        heroImage:
          typeof parsed.design?.heroImage === 'string' && parsed.design.heroImage.trim()
            ? parsed.design.heroImage.trim()
            : DEFAULT_DESIGN.heroImage,
        defaultCurrency: normalizeCurrency(parsed.design?.defaultCurrency, DEFAULT_DESIGN.defaultCurrency),
        studioColors: sanitizeStudioColors(parsed.design?.studioColors),
      };

      const defaults = buildDefaultDeliveryRates(mergedDesign.defaultCurrency);
      const savedRates = parsed.deliveryRates && typeof parsed.deliveryRates === 'object' ? parsed.deliveryRates : {};
      const normalizedRates: DeliveryRatesMap = {};
      for (const w of ALGERIA_WILAYAS) {
        const entry = savedRates[w.code];
        const postOfficeNum = Number(entry?.postOfficePrice);
        const homeNum = Number(entry?.homePrice);
        normalizedRates[w.code] = {
          postOfficePrice: Number.isFinite(postOfficeNum) && postOfficeNum >= 0
            ? Math.round(postOfficeNum)
            : defaults[w.code].postOfficePrice,
          homePrice: Number.isFinite(homeNum) && homeNum >= 0
            ? Math.round(homeNum)
            : defaults[w.code].homePrice,
        };
      }

      return {
        config: {
          ownerConfigured: Boolean(parsed.config?.ownerConfigured),
          ownerPasswordHash: parsed.config?.ownerPasswordHash ?? null,
          updatedAt: parsed.config?.updatedAt ?? null,
        },
        design: mergedDesign,
        products:
          Array.isArray(parsed.products) && parsed.products.length > 0
            ? parsed.products.map((p) => ({
                ...p,
                currency: normalizeCurrency(p.currency, mergedDesign.defaultCurrency),
              }))
            : DEFAULT_PRODUCTS,
        deliveryRates: normalizedRates,
        vipCoupons: Array.isArray(parsed.vipCoupons) ? parsed.vipCoupons : [],
        vipRequests: Array.isArray(parsed.vipRequests) ? parsed.vipRequests : legacyRequests,
        orders: Array.isArray(parsed.orders)
          ? parsed.orders.map((o) => ({
              ...o,
              wilayaCode: o.wilayaCode ?? '16',
              wilayaName: o.wilayaName ?? 'الجزائر',
              deliveryMethod: o.deliveryMethod === 'post_office' ? 'post_office' : 'home',
              deliveryFee: Number.isFinite(Number(o.deliveryFee)) ? Number(o.deliveryFee) : 0,
              couponCode: o.couponCode ?? null,
              currency: normalizeCurrency(o.currency, mergedDesign.defaultCurrency),
              items: Array.isArray(o.items)
                ? o.items.map((it) => ({
                    ...it,
                    currency: normalizeCurrency(it.currency, mergedDesign.defaultCurrency),
                  }))
                : [],
            }))
          : [],
        contactMessages: Array.isArray(parsed.contactMessages) ? parsed.contactMessages : [],
        ownerTokens: Array.isArray(parsed.ownerTokens) ? parsed.ownerTokens : [],
      };
    } catch {
      // Fallback to clean state
    }
  }
  return {
    config: {
      ownerConfigured: false,
      ownerPasswordHash: null,
      updatedAt: null,
    },
    design: DEFAULT_DESIGN,
    products: DEFAULT_PRODUCTS,
    deliveryRates: buildDefaultDeliveryRates(DEFAULT_DESIGN.defaultCurrency),
    vipCoupons: [],
    vipRequests: [],
    orders: [],
    contactMessages: [],
    ownerTokens: [],
  };
}

let state: PersistedState = loadState();

function saveState(): void {
  ensureDataDir();
  const now = Date.now();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  state.ownerTokens = state.ownerTokens.filter((t) => now - t.createdAt < sevenDaysMs);
  fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2), 'utf-8');
}

function hashSecret(secret: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(secret, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

function verifySecret(secret: string, storedHash: string | null): boolean {
  if (!storedHash || !secret) return false;
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, keyHex] = parts;
  const keyBuf = Buffer.from(keyHex, 'hex');
  const derivedBuf = crypto.scryptSync(secret, salt, 64);
  if (keyBuf.length !== derivedBuf.length) return false;
  return crypto.timingSafeEqual(keyBuf, derivedBuf);
}

function createToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

function isValidOwnerToken(token: string | undefined): boolean {
  if (!token) return false;
  const now = Date.now();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  return state.ownerTokens.some((t) => t.token === token && now - t.createdAt < sevenDaysMs);
}

function sanitizeVipForOwner(req: VipRequestRecord) {
  return {
    id: req.id,
    visitorName: req.visitorName,
    couponCode: req.couponCode,
    couponValid: req.couponValid,
    discountPercent: req.discountPercent,
    note: req.note,
    privacyAccepted: req.privacyAccepted,
    status: req.status,
    createdAt: req.createdAt,
    reviewedAt: req.reviewedAt,
  };
}

function sanitizeVipForVisitor(req: VipRequestRecord) {
  return {
    id: req.id,
    visitorName: req.visitorName,
    couponCode: req.couponCode,
    discountPercent: req.discountPercent,
    status: req.status,
    createdAt: req.createdAt,
    reviewedAt: req.reviewedAt,
  };
}

function isHexColor(val: unknown): val is string {
  return typeof val === 'string' && /^#[0-9a-fA-F]{6}$/.test(val.trim());
}

const app = express();
app.use(express.json({ limit: '6mb' }));

const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

const ownerSockets = new Set<WebSocket>();
const publicSockets = new Set<WebSocket>();
const vipVisitorSockets = new Map<string, Set<WebSocket>>();

function sendJson(ws: WebSocket, payload: unknown): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function broadcastToOwners(payload: unknown): void {
  for (const ws of ownerSockets) {
    sendJson(ws, payload);
  }
}

function broadcastToPublic(payload: unknown): void {
  for (const ws of publicSockets) {
    sendJson(ws, payload);
  }
}

function broadcastToVipVisitor(requestId: string, payload: unknown): void {
  const sockets = vipVisitorSockets.get(requestId);
  if (!sockets) return;
  for (const ws of sockets) {
    sendJson(ws, payload);
  }
}

server.on('upgrade', (request, socket, head) => {
  const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);
  if (url.pathname !== '/ws') {
    return;
  }

  const role = url.searchParams.get('role');
  const token = url.searchParams.get('token') ?? '';

  if (role === 'owner') {
    if (!isValidOwnerToken(token)) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }
    wss.handleUpgrade(request, socket, head, (ws) => {
      ownerSockets.add(ws);
      sendJson(ws, {
        type: 'owner:init',
        vipRequests: state.vipRequests.map(sanitizeVipForOwner),
        orders: state.orders,
        vipCoupons: state.vipCoupons,
        products: state.products,
        design: state.design,
        deliveryRates: state.deliveryRates,
        contactMessages: state.contactMessages,
      });
      ws.on('close', () => {
        ownerSockets.delete(ws);
      });
    });
    return;
  }

  if (role === 'public') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      publicSockets.add(ws);
      if (token) {
        const vipRec = state.vipRequests.find((r) => r.sessionToken === token);
        if (vipRec) {
          let set = vipVisitorSockets.get(vipRec.id);
          if (!set) {
            set = new Set();
            vipVisitorSockets.set(vipRec.id, set);
          }
          set.add(ws);
          sendJson(ws, { type: 'vip:status', request: sanitizeVipForVisitor(vipRec) });
          ws.on('close', () => {
            publicSockets.delete(ws);
            const current = vipVisitorSockets.get(vipRec.id);
            if (current) {
              current.delete(ws);
              if (current.size === 0) vipVisitorSockets.delete(vipRec.id);
            }
          });
          return;
        }
      }
      ws.on('close', () => {
        publicSockets.delete(ws);
      });
    });
    return;
  }

  socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
  socket.destroy();
});

// Public Storefront Bootstrap (open to all visitors without any password)
app.get('/api/store/bootstrap', (_req, res) => {
  res.json({
    design: state.design,
    products: state.products,
    deliveryRates: state.deliveryRates,
  });
});

// Public status for hidden owner route
app.get('/api/owner/status', (_req, res) => {
  res.json({
    ownerConfigured: state.config.ownerConfigured,
  });
});

// One-time Owner Setup (for the hidden owner route)
app.post('/api/owner/setup', (req, res) => {
  if (state.config.ownerConfigured) {
    res.status(409).json({ error: 'تم إعداد كلمة مرور المالك مسبقاً.' });
    return;
  }
  const ownerPassword = typeof req.body?.ownerPassword === 'string' ? req.body.ownerPassword.trim() : '';
  if (ownerPassword.length < 4) {
    res.status(400).json({ error: 'يجب أن تتكون كلمة مرور المالك من 4 أحرف على الأقل.' });
    return;
  }

  state.config = {
    ownerConfigured: true,
    ownerPasswordHash: hashSecret(ownerPassword),
    updatedAt: new Date().toISOString(),
  };

  const ownerToken = createToken();
  state.ownerTokens.push({ token: ownerToken, createdAt: Date.now() });
  saveState();

  res.status(201).json({
    ownerToken,
    ownerConfigured: true,
  });
});

// Owner login
app.post('/api/owner/login', (req, res) => {
  if (!state.config.ownerConfigured) {
    res.status(400).json({ error: 'لم يتم تعيين كلمة مرور المالك بعد.' });
    return;
  }
  const ownerPassword = typeof req.body?.ownerPassword === 'string' ? req.body.ownerPassword.trim() : '';
  if (!verifySecret(ownerPassword, state.config.ownerPasswordHash)) {
    res.status(401).json({ error: 'كلمة مرور المالك غير صحيحة.' });
    return;
  }
  const ownerToken = createToken();
  state.ownerTokens.push({ token: ownerToken, createdAt: Date.now() });
  saveState();
  res.json({ ownerToken });
});

// Owner logout
app.post('/api/owner/logout', (req, res) => {
  const token = req.header('x-owner-token');
  if (token) {
    state.ownerTokens = state.ownerTokens.filter((t) => t.token !== token);
    saveState();
  }
  res.json({ ok: true });
});

// Owner overview
app.get('/api/owner/overview', (req, res) => {
  const token = req.header('x-owner-token');
  if (!isValidOwnerToken(token)) {
    res.status(401).json({ error: 'جلسة المالك غير صالحة أو منتهية.' });
    return;
  }
  res.json({
    design: state.design,
    products: state.products,
    deliveryRates: state.deliveryRates,
    vipCoupons: state.vipCoupons,
    vipRequests: state.vipRequests.map(sanitizeVipForOwner),
    orders: state.orders,
    contactMessages: state.contactMessages,
  });
});

// Update Owner admin password
app.put('/api/owner/admin-password', (req, res) => {
  const token = req.header('x-owner-token');
  if (!isValidOwnerToken(token)) {
    res.status(401).json({ error: 'جلسة المالك غير صالحة.' });
    return;
  }
  const currentPassword = typeof req.body?.currentPassword === 'string' ? req.body.currentPassword.trim() : '';
  const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword.trim() : '';

  if (!verifySecret(currentPassword, state.config.ownerPasswordHash)) {
    res.status(401).json({ error: 'كلمة المرور الحالية غير صحيحة.' });
    return;
  }
  if (newPassword.length < 4) {
    res.status(400).json({ error: 'يجب أن تتكون كلمة المرور الجديدة من 4 أحرف على الأقل.' });
    return;
  }

  state.config.ownerPasswordHash = hashSecret(newPassword);
  state.config.updatedAt = new Date().toISOString();
  saveState();
  res.json({ ok: true });
});

// Owner adds a new clothing product (with length, width, stock quantity, currency, sizes, image)
app.post('/api/owner/products', (req, res) => {
  const token = req.header('x-owner-token');
  if (!isValidOwnerToken(token)) {
    res.status(401).json({ error: 'جلسة المالك غير صالحة.' });
    return;
  }

  const title = typeof req.body?.title === 'string' ? req.body.title.trim().slice(0, 120) : '';
  const subtitle = typeof req.body?.subtitle === 'string' ? req.body.subtitle.trim().slice(0, 120) : '';
  const category = typeof req.body?.category === 'string' ? req.body.category.trim().slice(0, 60) : 'ملابس جديدة';
  const edition = typeof req.body?.edition === 'string' ? req.body.edition.trim().slice(0, 60) : 'إصدار جديد';
  const fabric = typeof req.body?.fabric === 'string' ? req.body.fabric.trim().slice(0, 120) : '';
  const cut = typeof req.body?.cut === 'string' ? req.body.cut.trim().slice(0, 120) : '';
  const description = typeof req.body?.description === 'string' ? req.body.description.trim().slice(0, 500) : '';
  const image = typeof req.body?.image === 'string' && req.body.image.trim()
    ? req.body.image.trim()
    : '/src/assets/images/product_wool_coat_1794528340802.jpg';

  const price = Math.max(1, Math.round(Number(req.body?.price) || 0));
  const lengthCm = Math.max(10, Math.round(Number(req.body?.lengthCm) || 75));
  const widthCm = Math.max(10, Math.round(Number(req.body?.widthCm) || 52));
  const stock = Math.max(0, Math.round(Number(req.body?.stock) ?? 1));
  const currency: CurrencyCode = VALID_CURRENCIES.has(req.body?.currency) ? req.body.currency : state.design.defaultCurrency;

  const rawSizes = Array.isArray(req.body?.sizes) ? req.body.sizes : [];
  const sizes = rawSizes.filter((s: unknown): s is GarmentSize => typeof s === 'string' && VALID_SIZES.has(s as GarmentSize));

  if (!title) {
    res.status(400).json({ error: 'يرجى إدخال اسم القطعة.' });
    return;
  }
  if (price <= 0) {
    res.status(400).json({ error: 'يرجى إدخال سعر صحيح.' });
    return;
  }

  const product: ProductRecord = {
    id: `garment-${crypto.randomBytes(3).toString('hex')}`,
    title,
    subtitle: subtitle || category,
    category,
    edition,
    fabric: fabric || 'قطن وصوف طبيعي عالي الجودة',
    cut: cut || 'قصّة رسمية متوازنة',
    lengthCm,
    widthCm,
    stock,
    currency,
    sizes: sizes.length > 0 ? sizes : ['S', 'M', 'L', 'XL'],
    price,
    image,
    description: description || 'قطعة ملابس جديدة مضافة من إدارة المتجر.',
    createdAt: new Date().toISOString(),
  };

  state.products.unshift(product);
  saveState();

  broadcastToPublic({ type: 'store:products_updated', products: state.products });
  broadcastToOwners({ type: 'owner:products_updated', products: state.products });

  res.status(201).json({ product });
});

// Owner updates an existing clothing product
app.put('/api/owner/products/:id', (req, res) => {
  const token = req.header('x-owner-token');
  if (!isValidOwnerToken(token)) {
    res.status(401).json({ error: 'جلسة المالك غير صالحة.' });
    return;
  }
  const existing = state.products.find((p) => p.id === req.params.id);
  if (!existing) {
    res.status(404).json({ error: 'القطعة غير موجودة.' });
    return;
  }

  if (typeof req.body?.title === 'string' && req.body.title.trim()) existing.title = req.body.title.trim().slice(0, 120);
  if (typeof req.body?.subtitle === 'string') existing.subtitle = req.body.subtitle.trim().slice(0, 120);
  if (typeof req.body?.category === 'string' && req.body.category.trim()) existing.category = req.body.category.trim().slice(0, 60);
  if (typeof req.body?.edition === 'string') existing.edition = req.body.edition.trim().slice(0, 60);
  if (typeof req.body?.fabric === 'string') existing.fabric = req.body.fabric.trim().slice(0, 120);
  if (typeof req.body?.cut === 'string') existing.cut = req.body.cut.trim().slice(0, 120);
  if (typeof req.body?.description === 'string') existing.description = req.body.description.trim().slice(0, 500);
  if (typeof req.body?.image === 'string' && req.body.image.trim()) existing.image = req.body.image.trim();
  if (req.body?.price !== undefined) existing.price = Math.max(1, Math.round(Number(req.body.price) || existing.price));
  if (req.body?.lengthCm !== undefined) existing.lengthCm = Math.max(10, Math.round(Number(req.body.lengthCm) || existing.lengthCm));
  if (req.body?.widthCm !== undefined) existing.widthCm = Math.max(10, Math.round(Number(req.body.widthCm) || existing.widthCm));
  if (req.body?.stock !== undefined) existing.stock = Math.max(0, Math.round(Number(req.body.stock) ?? existing.stock));
  if (VALID_CURRENCIES.has(req.body?.currency)) existing.currency = req.body.currency;
  if (Array.isArray(req.body?.sizes)) {
    const validSizes = req.body.sizes.filter((s: unknown): s is GarmentSize => typeof s === 'string' && VALID_SIZES.has(s as GarmentSize));
    if (validSizes.length > 0) existing.sizes = validSizes;
  }

  saveState();
  broadcastToPublic({ type: 'store:products_updated', products: state.products });
  broadcastToOwners({ type: 'owner:products_updated', products: state.products });
  res.json({ product: existing });
});

// Owner deletes a product
app.delete('/api/owner/products/:id', (req, res) => {
  const token = req.header('x-owner-token');
  if (!isValidOwnerToken(token)) {
    res.status(401).json({ error: 'جلسة المالك غير صالحة.' });
    return;
  }
  state.products = state.products.filter((p) => p.id !== req.params.id);
  saveState();
  broadcastToPublic({ type: 'store:products_updated', products: state.products });
  broadcastToOwners({ type: 'owner:products_updated', products: state.products });
  res.json({ ok: true });
});

// Owner updates site design configuration
app.put('/api/owner/design', (req, res) => {
  const token = req.header('x-owner-token');
  if (!isValidOwnerToken(token)) {
    res.status(401).json({ error: 'جلسة المالك غير صالحة.' });
    return;
  }

  const next = { ...state.design };
  if (typeof req.body?.brandName === 'string' && req.body.brandName.trim()) {
    next.brandName = req.body.brandName.trim().slice(0, 60);
  }
  if (typeof req.body?.heroEyebrow === 'string') {
    next.heroEyebrow = req.body.heroEyebrow.trim().slice(0, 80);
  }
  if (typeof req.body?.heroTitle === 'string' && req.body.heroTitle.trim()) {
    next.heroTitle = req.body.heroTitle.trim().slice(0, 140);
  }
  if (typeof req.body?.heroSubtitle === 'string') {
    next.heroSubtitle = req.body.heroSubtitle.trim().slice(0, 260);
  }
  if (typeof req.body?.heroImage === 'string' && req.body.heroImage.trim()) {
    const rawImg = req.body.heroImage.trim();
    if (
      rawImg.startsWith('data:image/') ||
      rawImg.startsWith('/') ||
      rawImg.startsWith('http://') ||
      rawImg.startsWith('https://')
    ) {
      next.heroImage = rawImg.slice(0, 5_000_000);
    }
  }
  if (isHexColor(req.body?.bgColor)) next.bgColor = req.body.bgColor.trim();
  if (isHexColor(req.body?.surfaceColor)) next.surfaceColor = req.body.surfaceColor.trim();
  if (isHexColor(req.body?.textColor)) next.textColor = req.body.textColor.trim();
  if (isHexColor(req.body?.mutedColor)) next.mutedColor = req.body.mutedColor.trim();
  if (isHexColor(req.body?.accentColor)) next.accentColor = req.body.accentColor.trim();
  if (isHexColor(req.body?.borderColor)) next.borderColor = req.body.borderColor.trim();
  if (req.body?.gridColumns === 2 || req.body?.gridColumns === 3 || req.body?.gridColumns === 4) {
    next.gridColumns = req.body.gridColumns;
  }
  if (req.body?.radiusStyle === 'sharp' || req.body?.radiusStyle === 'balanced' || req.body?.radiusStyle === 'rounded') {
    next.radiusStyle = req.body.radiusStyle;
  }
  if (VALID_CURRENCIES.has(req.body?.defaultCurrency)) {
    next.defaultCurrency = req.body.defaultCurrency;
  }
  if (typeof req.body?.contactEmail === 'string') {
    next.contactEmail = req.body.contactEmail.trim().slice(0, 120);
  }
  if (typeof req.body?.contactPhone === 'string') {
    next.contactPhone = req.body.contactPhone.trim().slice(0, 60);
  }
  if (typeof req.body?.contactInstagram === 'string') {
    next.contactInstagram = req.body.contactInstagram.trim().slice(0, 80);
  }
  if (Array.isArray(req.body?.studioColors)) {
    const cleanedColors = req.body.studioColors
      .filter((c: unknown): c is { name?: unknown; hex?: unknown } => Boolean(c && typeof c === 'object'))
      .map((c: { name?: unknown; hex?: unknown }) => ({
        name: typeof c.name === 'string' && c.name.trim() ? c.name.trim().slice(0, 40) : 'لون مخصص',
        hex: typeof c.hex === 'string' && /^#[0-9a-fA-F]{6}$/.test(c.hex.trim()) ? c.hex.trim().toUpperCase() : '',
      }))
      .filter((c: StudioGarmentColorRecord) => c.hex !== '');
    if (cleanedColors.length > 0) {
      next.studioColors = cleanedColors.slice(0, 30);
    }
  }

  state.design = next;
  saveState();

  broadcastToPublic({ type: 'store:design_updated', design: state.design });
  broadcastToOwners({ type: 'owner:design_updated', design: state.design });

  res.json({ design: state.design });
});

// Owner updates homepage hero image directly
app.put('/api/owner/hero-image', (req, res) => {
  const token = req.header('x-owner-token');
  if (!isValidOwnerToken(token)) {
    res.status(401).json({ error: 'جلسة المالك غير صالحة.' });
    return;
  }

  const rawImg = typeof req.body?.heroImage === 'string' ? req.body.heroImage.trim() : '';
  if (
    !rawImg ||
    (!rawImg.startsWith('data:image/') &&
      !rawImg.startsWith('/') &&
      !rawImg.startsWith('http://') &&
      !rawImg.startsWith('https://'))
  ) {
    res.status(400).json({ error: 'صيغة الصورة غير صالحة.' });
    return;
  }

  state.design = {
    ...state.design,
    heroImage: rawImg.slice(0, 5_000_000),
  };
  saveState();

  broadcastToPublic({ type: 'store:design_updated', design: state.design });
  broadcastToOwners({ type: 'owner:design_updated', design: state.design });

  res.json({ design: state.design });
});

// Owner updates studio available garment colors directly
app.put('/api/owner/studio-colors', (req, res) => {
  const token = req.header('x-owner-token');
  if (!isValidOwnerToken(token)) {
    res.status(401).json({ error: 'جلسة المالك غير صالحة.' });
    return;
  }

  const rawColors = Array.isArray(req.body?.studioColors) ? req.body.studioColors : [];
  const cleanedColors: StudioGarmentColorRecord[] = rawColors
    .filter((c: unknown): c is { name?: unknown; hex?: unknown } => Boolean(c && typeof c === 'object'))
    .map((c: { name?: unknown; hex?: unknown }) => ({
      name: typeof c.name === 'string' && c.name.trim() ? c.name.trim().slice(0, 40) : 'لون مخصص',
      hex: typeof c.hex === 'string' && /^#[0-9a-fA-F]{6}$/.test(c.hex.trim()) ? c.hex.trim().toUpperCase() : '',
    }))
    .filter((c: StudioGarmentColorRecord) => c.hex !== '');

  if (cleanedColors.length === 0) {
    res.status(400).json({ error: 'يجب الإبقاء على لون واحد متاح على الأقل في الاستوديو.' });
    return;
  }

  state.design = {
    ...state.design,
    studioColors: cleanedColors.slice(0, 30),
  };
  saveState();

  broadcastToPublic({ type: 'store:design_updated', design: state.design });
  broadcastToOwners({ type: 'owner:design_updated', design: state.design });

  res.json({ studioColors: state.design.studioColors, design: state.design });
});

// Owner updates Algerian wilaya delivery rates (Post Office & Home)
app.put('/api/owner/delivery-rates', (req, res) => {
  const token = req.header('x-owner-token');
  if (!isValidOwnerToken(token)) {
    res.status(401).json({ error: 'جلسة المالك غير صالحة.' });
    return;
  }

  const incoming = req.body?.deliveryRates;
  if (!incoming || typeof incoming !== 'object') {
    res.status(400).json({ error: 'بيانات أسعار التوصيل غير صالحة.' });
    return;
  }

  const nextRates: DeliveryRatesMap = { ...state.deliveryRates };
  for (const w of ALGERIA_WILAYAS) {
    const row = incoming[w.code];
    if (row && typeof row === 'object') {
      const postOfficeNum = Number(row.postOfficePrice);
      const homeNum = Number(row.homePrice);
      nextRates[w.code] = {
        postOfficePrice:
          Number.isFinite(postOfficeNum) && postOfficeNum >= 0
            ? Math.round(postOfficeNum)
            : nextRates[w.code]?.postOfficePrice ?? 0,
        homePrice:
          Number.isFinite(homeNum) && homeNum >= 0
            ? Math.round(homeNum)
            : nextRates[w.code]?.homePrice ?? 0,
      };
    }
  }

  state.deliveryRates = nextRates;
  saveState();

  broadcastToPublic({ type: 'store:delivery_updated', deliveryRates: state.deliveryRates });
  broadcastToOwners({ type: 'owner:delivery_updated', deliveryRates: state.deliveryRates });

  res.json({ deliveryRates: state.deliveryRates });
});

// VIP Coupons management
app.post('/api/owner/coupons', (req, res) => {
  const token = req.header('x-owner-token');
  if (!isValidOwnerToken(token)) {
    res.status(401).json({ error: 'جلسة المالك غير صالحة.' });
    return;
  }
  const rawCode = typeof req.body?.code === 'string' ? req.body.code.trim().toUpperCase().slice(0, 32) : '';
  const label = typeof req.body?.label === 'string' ? req.body.label.trim().slice(0, 80) : '';
  const discountNum = Number(req.body?.discountPercent);
  const discountPercent = Number.isFinite(discountNum)
    ? Math.max(0, Math.min(80, Math.round(discountNum)))
    : 0;

  if (rawCode.length < 3) {
    res.status(400).json({ error: 'يجب أن يتكون رمز الكوبون من 3 أحرف على الأقل.' });
    return;
  }
  if (state.vipCoupons.some((c) => c.code === rawCode)) {
    res.status(409).json({ error: 'رمز الكوبون هذا موجود مسبقاً.' });
    return;
  }

  const coupon: VipCouponRecord = {
    code: rawCode,
    label: label || 'دعوة زائر مقرب',
    discountPercent,
    active: true,
    createdAt: new Date().toISOString(),
  };

  state.vipCoupons.unshift(coupon);
  saveState();
  res.status(201).json({ coupon });
});

app.patch('/api/owner/coupons/:code/toggle', (req, res) => {
  const token = req.header('x-owner-token');
  if (!isValidOwnerToken(token)) {
    res.status(401).json({ error: 'جلسة المالك غير صالحة.' });
    return;
  }
  const code = decodeURIComponent(req.params.code).toUpperCase();
  const coupon = state.vipCoupons.find((c) => c.code === code);
  if (!coupon) {
    res.status(404).json({ error: 'الكوبون غير موجود.' });
    return;
  }
  coupon.active = !coupon.active;
  saveState();
  res.json({ coupon });
});

app.delete('/api/owner/coupons/:code', (req, res) => {
  const token = req.header('x-owner-token');
  if (!isValidOwnerToken(token)) {
    res.status(401).json({ error: 'جلسة المالك غير صالحة.' });
    return;
  }
  const code = decodeURIComponent(req.params.code).toUpperCase();
  state.vipCoupons = state.vipCoupons.filter((c) => c.code !== code);
  saveState();
  res.json({ ok: true });
});

// Close Visitors (VIP List) submission — optional inside the open store!
app.post('/api/vip-requests', (req, res) => {
  const visitorName = typeof req.body?.visitorName === 'string' ? req.body.visitorName.trim().slice(0, 80) : '';
  const couponCode = typeof req.body?.couponCode === 'string' ? req.body.couponCode.trim().toUpperCase().slice(0, 40) : '';
  const note = typeof req.body?.note === 'string' ? req.body.note.trim().slice(0, 240) : '';
  const privacyAccepted = req.body?.privacyAccepted === true;

  if (!visitorName) {
    res.status(400).json({ error: 'يرجى كتابة الاسم الكامل.' });
    return;
  }
  if (!couponCode) {
    res.status(400).json({ error: 'يرجى كتابة رمز الكوبون.' });
    return;
  }
  if (!privacyAccepted) {
    res.status(400).json({ error: 'يرجى الموافقة على سياسة الخصوصية.' });
    return;
  }

  const matchedCoupon = state.vipCoupons.find((c) => c.active && c.code === couponCode);
  const now = new Date().toISOString();
  const record: VipRequestRecord = {
    id: `VIP-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
    visitorName,
    couponCode,
    couponValid: Boolean(matchedCoupon),
    discountPercent: matchedCoupon ? matchedCoupon.discountPercent : 0,
    note,
    privacyAccepted: true,
    status: 'pending',
    createdAt: now,
    reviewedAt: null,
    sessionToken: createToken(),
  };

  state.vipRequests.unshift(record);
  if (state.vipRequests.length > 250) {
    state.vipRequests = state.vipRequests.slice(0, 250);
  }
  saveState();

  broadcastToOwners({
    type: 'owner:new_vip_request',
    request: sanitizeVipForOwner(record),
  });

  res.status(201).json({
    sessionToken: record.sessionToken,
    request: sanitizeVipForVisitor(record),
  });
});

app.get('/api/vip/session', (req, res) => {
  const token = req.header('x-vip-token');
  if (!token) {
    res.status(401).json({ error: 'لا توجد عضوية نشطة.' });
    return;
  }
  const record = state.vipRequests.find((r) => r.sessionToken === token);
  if (!record) {
    res.status(401).json({ error: 'جلسة العضوية غير صالحة.' });
    return;
  }
  res.json({ request: sanitizeVipForVisitor(record) });
});

// Owner accepts/denies/revokes VIP Close Visitor
app.post('/api/owner/vip-requests/:id/decision', (req, res) => {
  const token = req.header('x-owner-token');
  if (!isValidOwnerToken(token)) {
    res.status(401).json({ error: 'جلسة المالك غير صالحة.' });
    return;
  }
  const requestId = req.params.id;
  const decision = req.body?.decision as RequestStatus | undefined;
  if (decision !== 'approved' && decision !== 'denied' && decision !== 'revoked') {
    res.status(400).json({ error: 'قرار غير صالح.' });
    return;
  }

  const record = state.vipRequests.find((r) => r.id === requestId);
  if (!record) {
    res.status(404).json({ error: 'لم يتم العثور على الطلب.' });
    return;
  }

  record.status = decision;
  record.reviewedAt = new Date().toISOString();
  saveState();

  broadcastToVipVisitor(record.id, {
    type: 'vip:status',
    request: sanitizeVipForVisitor(record),
  });
  broadcastToOwners({
    type: 'owner:vip_updated',
    request: sanitizeVipForOwner(record),
  });

  res.json({ request: sanitizeVipForOwner(record) });
});

// Open storefront order placement (NO password required!)
app.post('/api/orders', (req, res) => {
  const visitorName = typeof req.body?.visitorName === 'string' ? req.body.visitorName.trim().slice(0, 80) : '';
  const phone = typeof req.body?.phone === 'string' ? req.body.phone.trim().slice(0, 40) : '';
  const wilayaCode = typeof req.body?.wilayaCode === 'string' ? req.body.wilayaCode.trim() : '';
  const deliveryMethod: DeliveryMethod = req.body?.deliveryMethod === 'post_office' ? 'post_office' : 'home';
  const cityInput = typeof req.body?.city === 'string' ? req.body.city.trim().slice(0, 80) : '';
  const addressInput = typeof req.body?.address === 'string' ? req.body.address.trim().slice(0, 200) : '';
  const notes = typeof req.body?.notes === 'string' ? req.body.notes.trim().slice(0, 240) : '';
  const rawItems = Array.isArray(req.body?.items) ? req.body.items : [];

  const wilaya = findWilayaByCode(wilayaCode);
  if (!wilaya) {
    res.status(400).json({ error: 'يرجى اختيار الولاية من قائمة الولايات.' });
    return;
  }

  if (!visitorName || !phone) {
    res.status(400).json({ error: 'يرجى تعبئة الاسم الكامل ورقم الهاتف.' });
    return;
  }

  if (deliveryMethod === 'home' && !addressInput) {
    res.status(400).json({ error: 'يرجى إدخال العنوان التفصيلي للتوصيل إلى المنزل.' });
    return;
  }

  const city = cityInput || wilaya.name;
  const address =
    addressInput ||
    (deliveryMethod === 'post_office'
      ? `استلام من مكتب التوصيل / البريد — ولاية ${wilaya.name}`
      : wilaya.name);

  // Optional approved VIP token for discount
  const vipToken = req.header('x-vip-token');
  const vipRec = vipToken
    ? state.vipRequests.find((r) => r.sessionToken === vipToken && r.status === 'approved')
    : undefined;

  const verifiedItems: OrderItemRecord[] = [];
  let subtotal = 0;
  let orderCurrency: CurrencyCode = state.design.defaultCurrency;

  function getServerCustomGarmentPrice(
    customId: 'custom-tshirt' | 'custom-hoodie',
    currency: CurrencyCode
  ): number {
    if (currency === 'DZD') {
      return customId === 'custom-hoodie' ? 6800 : 3800;
    }
    if (currency === 'EUR') {
      return customId === 'custom-hoodie' ? 70 : 42;
    }
    return customId === 'custom-hoodie' ? 75 : 45;
  }

  for (const item of rawItems) {
    const id = typeof item?.id === 'string' ? item.id : '';
    const size = typeof item?.size === 'string' && VALID_SIZES.has(item.size as GarmentSize) ? item.size : 'M';
    const qty = Number(item?.quantity);

    if (id === 'custom-tshirt' || id === 'custom-hoodie') {
      if (Number.isInteger(qty) && qty > 0 && qty <= 20) {
        const garmentType: 'tshirt' | 'hoodie' = id === 'custom-hoodie' ? 'hoodie' : 'tshirt';
        const rawSpec = item?.customDesign;
        const rawHex = typeof rawSpec?.colorHex === 'string' ? rawSpec.colorHex.trim() : '#141518';
        const colorHex = /^#[0-9a-fA-F]{3,8}$/.test(rawHex) ? rawHex : '#141518';
        const colorName =
          typeof rawSpec?.colorName === 'string' && rawSpec.colorName.trim()
            ? rawSpec.colorName.trim().slice(0, 40)
            : 'مخصص';
        const rawPreview = typeof rawSpec?.previewImage === 'string' ? rawSpec.previewImage : '';
        const previewImage =
          rawPreview.startsWith('data:image/') && rawPreview.length <= 160000 ? rawPreview : '';
        const frontLayersCount = Math.max(0, Math.min(20, Math.floor(Number(rawSpec?.frontLayersCount) || 0)));
        const backLayersCount = Math.max(0, Math.min(20, Math.floor(Number(rawSpec?.backLayersCount) || 0)));

        const unitPrice = getServerCustomGarmentPrice(id, state.design.defaultCurrency);
        verifiedItems.push({
          id,
          title:
            garmentType === 'hoodie'
              ? `هودي الموقع (تصميم خاص · ${colorName})`
              : `تيشيرت الموقع (تصميم خاص · ${colorName})`,
          size,
          price: unitPrice,
          currency: state.design.defaultCurrency,
          quantity: qty,
          customDesign: {
            garmentType,
            colorHex,
            colorName,
            previewImage,
            frontLayersCount,
            backLayersCount,
          },
        });
        subtotal += unitPrice * qty;
        orderCurrency = state.design.defaultCurrency;
      }
      continue;
    }

    const product = state.products.find((p) => p.id === id);
    if (product && Number.isInteger(qty) && qty > 0 && qty <= 20) {
      if (product.stock > 0) {
        const takeQty = Math.min(qty, product.stock);
        product.stock = Math.max(0, product.stock - takeQty);
        verifiedItems.push({
          id: product.id,
          title: product.title,
          size,
          price: product.price,
          currency: product.currency,
          quantity: takeQty,
        });
        subtotal += product.price * takeQty;
        orderCurrency = product.currency;
      }
    }
  }

  if (verifiedItems.length === 0) {
    res.status(400).json({ error: 'الحقيبة فارغة أو الكمية المطلوبة غير متوفرة في المخزون.' });
    return;
  }

  const rate = state.deliveryRates[wilaya.code];
  const deliveryFee = rate
    ? deliveryMethod === 'post_office'
      ? rate.postOfficePrice
      : rate.homePrice
    : 0;

  const discountPercent = vipRec ? vipRec.discountPercent : 0;
  const discountAmount = Math.round((subtotal * discountPercent) / 100);
  const total = Math.max(0, subtotal - discountAmount) + deliveryFee;

  const order: StoreOrderRecord = {
    id: `ORD-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
    visitorName,
    phone,
    wilayaCode: wilaya.code,
    wilayaName: wilaya.name,
    deliveryMethod,
    deliveryFee,
    city,
    address,
    notes,
    couponCode: vipRec ? vipRec.couponCode : null,
    items: verifiedItems,
    subtotal,
    discountPercent,
    discountAmount,
    total,
    currency: orderCurrency,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  state.orders.unshift(order);
  saveState();

  broadcastToPublic({ type: 'store:products_updated', products: state.products });
  broadcastToOwners({ type: 'owner:new_order', order });
  broadcastToOwners({ type: 'owner:products_updated', products: state.products });

  res.status(201).json({ order });
});

app.post('/api/owner/orders/:id/status', (req, res) => {
  const token = req.header('x-owner-token');
  if (!isValidOwnerToken(token)) {
    res.status(401).json({ error: 'جلسة المالك غير صالحة.' });
    return;
  }
  const orderId = req.params.id;
  const status = req.body?.status as OrderStatus | undefined;
  if (status !== 'approved' && status !== 'completed' && status !== 'rejected') {
    res.status(400).json({ error: 'حالة طلب غير صالحة.' });
    return;
  }

  const order = state.orders.find((o) => o.id === orderId);
  if (!order) {
    res.status(404).json({ error: 'لم يتم العثور على الطلبية.' });
    return;
  }

  order.status = status;
  saveState();

  broadcastToOwners({ type: 'owner:order_updated', order });
  res.json({ order });
});

app.post('/api/owner/orders/mark-gmail-sent', (req, res) => {
  const token = req.header('x-owner-token');
  if (!isValidOwnerToken(token)) {
    res.status(401).json({ error: 'جلسة المالك غير صالحة.' });
    return;
  }
  const orderIds = Array.isArray(req.body?.orderIds)
    ? req.body.orderIds.filter((id: unknown): id is string => typeof id === 'string')
    : [];
  const now = new Date().toISOString();
  const updated: StoreOrderRecord[] = [];
  for (const id of orderIds) {
    const order = state.orders.find((o) => o.id === id);
    if (order) {
      order.gmailSentAt = now;
      updated.push(order);
      broadcastToOwners({ type: 'owner:order_updated', order });
    }
  }
  if (updated.length > 0) {
    saveState();
  }
  res.json({ updatedCount: updated.length, orders: updated });
});

// Public Contact Me message submission
app.post('/api/contact', (req, res) => {
  const senderName = typeof req.body?.senderName === 'string' ? req.body.senderName.trim().slice(0, 80) : '';
  const senderContact = typeof req.body?.senderContact === 'string' ? req.body.senderContact.trim().slice(0, 100) : '';
  const message = typeof req.body?.message === 'string' ? req.body.message.trim().slice(0, 1000) : '';

  if (!senderName || !senderContact || !message) {
    res.status(400).json({ error: 'يرجى تعبئة الاسم ووسيلة التواصل ونص الرسالة.' });
    return;
  }

  const record: ContactMessageRecord = {
    id: `MSG-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
    senderName,
    senderContact,
    message,
    read: false,
    createdAt: new Date().toISOString(),
  };

  state.contactMessages.unshift(record);
  if (state.contactMessages.length > 250) {
    state.contactMessages = state.contactMessages.slice(0, 250);
  }
  saveState();

  broadcastToOwners({ type: 'owner:new_message', contactMessage: record });
  res.status(201).json({ contactMessage: record });
});

app.patch('/api/owner/messages/:id/read', (req, res) => {
  const token = req.header('x-owner-token');
  if (!isValidOwnerToken(token)) {
    res.status(401).json({ error: 'جلسة المالك غير صالحة.' });
    return;
  }
  const msg = state.contactMessages.find((m) => m.id === req.params.id);
  if (!msg) {
    res.status(404).json({ error: 'الرسالة غير موجودة.' });
    return;
  }
  msg.read = true;
  saveState();
  res.json({ contactMessage: msg });
});

app.delete('/api/owner/messages/:id', (req, res) => {
  const token = req.header('x-owner-token');
  if (!isValidOwnerToken(token)) {
    res.status(401).json({ error: 'جلسة المالك غير صالحة.' });
    return;
  }
  state.contactMessages = state.contactMessages.filter((m) => m.id !== req.params.id);
  saveState();
  res.json({ ok: true });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await import('vite');
    const viteReady = vite.createServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });

    viteReady.catch((err) => {
      console.error('Failed to initialize Vite middleware:', err);
    });

    app.use(async (req, res, next) => {
      try {
        const viteServer = await viteReady;
        viteServer.middlewares(req, res, next);
      } catch (err) {
        next(err);
      }
    });
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Skeleton Store server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
