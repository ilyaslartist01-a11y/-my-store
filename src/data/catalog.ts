import type { Product } from '../types';

export const HERO_APPAREL_IMAGE = '/assets/aistudio/IMG_20261114_220710_aa9d7c03.png';

export const STORE_PRODUCTS: Product[] = [
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
  },
];
