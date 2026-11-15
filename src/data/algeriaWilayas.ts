export interface WilayaInfo {
  code: string;
  name: string;
}

export interface WilayaDeliveryRate {
  postOfficePrice: number;
  homePrice: number;
}

export type DeliveryRatesMap = Record<string, WilayaDeliveryRate>;

export const ALGERIA_WILAYAS: WilayaInfo[] = [
  { code: '01', name: 'أدرار' },
  { code: '02', name: 'الشلف' },
  { code: '03', name: 'الأغواط' },
  { code: '04', name: 'أم البواقي' },
  { code: '05', name: 'باتنة' },
  { code: '06', name: 'بجاية' },
  { code: '07', name: 'بسكرة' },
  { code: '08', name: 'بشار' },
  { code: '09', name: 'البليدة' },
  { code: '10', name: 'البويرة' },
  { code: '11', name: 'تمنراست' },
  { code: '12', name: 'تبسة' },
  { code: '13', name: 'تلمسان' },
  { code: '14', name: 'تيارت' },
  { code: '15', name: 'تيزي وزو' },
  { code: '16', name: 'الجزائر' },
  { code: '17', name: 'الجلفة' },
  { code: '18', name: 'جيجل' },
  { code: '19', name: 'سطيف' },
  { code: '20', name: 'سعيدة' },
  { code: '21', name: 'سكيكدة' },
  { code: '22', name: 'سيدي بلعباس' },
  { code: '23', name: 'عنابة' },
  { code: '24', name: 'قالمة' },
  { code: '25', name: 'قسنطينة' },
  { code: '26', name: 'المدية' },
  { code: '27', name: 'مستغانم' },
  { code: '28', name: 'المسيلة' },
  { code: '29', name: 'معسكر' },
  { code: '30', name: 'ورقلة' },
  { code: '31', name: 'وهران' },
  { code: '32', name: 'البيض' },
  { code: '33', name: 'إليزي' },
  { code: '34', name: 'برج بوعريريج' },
  { code: '35', name: 'بومرداس' },
  { code: '36', name: 'الطارف' },
  { code: '37', name: 'تندوف' },
  { code: '38', name: 'تيسمسيلت' },
  { code: '39', name: 'الوادي' },
  { code: '40', name: 'خنشلة' },
  { code: '41', name: 'سوق أهراس' },
  { code: '42', name: 'تيبازة' },
  { code: '43', name: 'ميلة' },
  { code: '44', name: 'عين الدفلى' },
  { code: '45', name: 'النعامة' },
  { code: '46', name: 'عين تموشنت' },
  { code: '47', name: 'غرداية' },
  { code: '48', name: 'غليزان' },
  { code: '49', name: 'تيميمون' },
  { code: '50', name: 'برج باجي مختار' },
  { code: '51', name: 'أولاد جلال' },
  { code: '52', name: 'بني عباس' },
  { code: '53', name: 'عين صالح' },
  { code: '54', name: 'عين قزام' },
  { code: '55', name: 'توقرت' },
  { code: '56', name: 'جانت' },
  { code: '57', name: 'المغير' },
  { code: '58', name: 'المنيعة' },
  { code: '59', name: 'أفلو' },
  { code: '60', name: 'بريكة' },
  { code: '61', name: 'القنطرة' },
  { code: '62', name: 'بئر العاتر' },
  { code: '63', name: 'العريشة' },
  { code: '64', name: 'قصر الشلالة' },
  { code: '65', name: 'عين وسارة' },
  { code: '66', name: 'مسعد' },
  { code: '67', name: 'قصر البخاري' },
  { code: '68', name: 'بوسعادة' },
  { code: '69', name: 'الأبيض سيدي الشيخ' },
];

const CENTRAL_CODES = new Set(['09', '16', '35', '42']);
const FAR_SOUTH_CODES = new Set([
  '01',
  '08',
  '11',
  '33',
  '37',
  '49',
  '50',
  '52',
  '53',
  '54',
  '56',
  '58',
]);
const HIGHLANDS_SOUTH_CODES = new Set([
  '03',
  '07',
  '17',
  '30',
  '32',
  '39',
  '45',
  '47',
  '51',
  '55',
  '57',
  '59',
  '60',
  '61',
  '62',
  '63',
  '64',
  '65',
  '66',
  '67',
  '68',
  '69',
]);

export function buildDefaultDeliveryRates(currency: 'USD' | 'EUR' | 'DZD' = 'USD'): DeliveryRatesMap {
  const map: DeliveryRatesMap = {};
  for (const w of ALGERIA_WILAYAS) {
    if (currency === 'DZD') {
      if (CENTRAL_CODES.has(w.code)) {
        map[w.code] = { postOfficePrice: 400, homePrice: 600 };
      } else if (FAR_SOUTH_CODES.has(w.code)) {
        map[w.code] = { postOfficePrice: 800, homePrice: 1200 };
      } else if (HIGHLANDS_SOUTH_CODES.has(w.code)) {
        map[w.code] = { postOfficePrice: 600, homePrice: 900 };
      } else {
        map[w.code] = { postOfficePrice: 500, homePrice: 750 };
      }
    } else {
      if (CENTRAL_CODES.has(w.code)) {
        map[w.code] = { postOfficePrice: 4, homePrice: 6 };
      } else if (FAR_SOUTH_CODES.has(w.code)) {
        map[w.code] = { postOfficePrice: 8, homePrice: 12 };
      } else if (HIGHLANDS_SOUTH_CODES.has(w.code)) {
        map[w.code] = { postOfficePrice: 6, homePrice: 9 };
      } else {
        map[w.code] = { postOfficePrice: 5, homePrice: 7 };
      }
    }
  }
  return map;
}

export function findWilayaByCode(code: string): WilayaInfo | undefined {
  return ALGERIA_WILAYAS.find((w) => w.code === code);
}
