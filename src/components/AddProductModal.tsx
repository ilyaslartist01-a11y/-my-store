import { useState, useEffect } from 'react';
import { X, Upload, Shirt } from 'lucide-react';
import type { CurrencyCode, GarmentSize, Product, SiteDesignConfig } from '../types';
import { CURRENCY_LABELS } from '../types';

interface AddProductModalProps {
  isOpen: boolean;
  ownerToken: string;
  defaultCurrency: CurrencyCode;
  design?: SiteDesignConfig;
  editingProduct?: Product | null;
  onClose: () => void;
  onSaved: (product: Product, isEdit: boolean) => void;
}

const ALL_SIZES: GarmentSize[] = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const CURRENCIES: CurrencyCode[] = ['USD', 'EUR', 'DZD'];
const PRESET_IMAGES = [
  {
    label: 'معطف صوف داكن',
    url: '/src/assets/images/product_wool_coat_1794528340802.jpg',
  },
  {
    label: 'قميص عاجي مفصّل',
    url: '/src/assets/images/product_silk_shirt_1794528340066.jpg',
  },
  {
    label: 'كنزة كشمير وبنطلون',
    url: '/src/assets/images/product_cashmere_knit_1794528340747.jpg',
  },
];

export function AddProductModal({
  isOpen,
  ownerToken,
  defaultCurrency,
  design,
  editingProduct,
  onClose,
  onSaved,
}: AddProductModalProps) {
  const accent = design?.accentColor ?? '#6BB83B';
  const surface = design?.surfaceColor ?? '#1E241A';
  const bg = design?.bgColor ?? '#141812';
  const border = design?.borderColor ?? '#34402C';
  const text = design?.textColor ?? '#F2ECE0';
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [category, setCategory] = useState('المعاطف');
  const [edition, setEdition] = useState('إصدار جديد');
  const [price, setPrice] = useState('950');
  const [currency, setCurrency] = useState<CurrencyCode>(defaultCurrency);
  const [lengthCm, setLengthCm] = useState('78');
  const [widthCm, setWidthCm] = useState('54');
  const [stock, setStock] = useState('10');
  const [sizes, setSizes] = useState<GarmentSize[]>(['S', 'M', 'L', 'XL']);
  const [fabric, setFabric] = useState('');
  const [cut, setCut] = useState('');
  const [image, setImage] = useState(PRESET_IMAGES[0].url);
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    if (editingProduct) {
      setTitle(editingProduct.title);
      setSubtitle(editingProduct.subtitle);
      setCategory(editingProduct.category);
      setEdition(editingProduct.edition);
      setPrice(String(editingProduct.price));
      setCurrency(editingProduct.currency);
      setLengthCm(String(editingProduct.lengthCm));
      setWidthCm(String(editingProduct.widthCm));
      setStock(String(editingProduct.stock));
      setSizes(editingProduct.sizes);
      setFabric(editingProduct.fabric);
      setCut(editingProduct.cut);
      setImage(editingProduct.image);
      setDescription(editingProduct.description);
    } else {
      setTitle('');
      setSubtitle('');
      setCategory('المعاطف');
      setEdition('إصدار جديد');
      setPrice('950');
      setCurrency(defaultCurrency);
      setLengthCm('78');
      setWidthCm('54');
      setStock('10');
      setSizes(['S', 'M', 'L', 'XL']);
      setFabric('');
      setCut('');
      setImage(PRESET_IMAGES[0].url);
      setDescription('');
    }
  }, [isOpen, editingProduct, defaultCurrency]);

  if (!isOpen) return null;

  function toggleSize(size: GarmentSize) {
    setSizes((prev) =>
      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]
    );
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      setError('حجم الصورة يجب أن يكون أقل من 3 ميجابايت.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setImage(reader.result);
      }
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!title.trim()) {
      setError('يرجى كتابة اسم القطعة.');
      return;
    }
    if (Number(price) <= 0) {
      setError('يرجى إدخال سعر صحيح.');
      return;
    }

    setSaving(true);
    try {
      const isEdit = Boolean(editingProduct);
      const url = isEdit
        ? `/api/owner/products/${encodeURIComponent(editingProduct!.id)}`
        : '/api/owner/products';
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-owner-token': ownerToken,
        },
        body: JSON.stringify({
          title: title.trim(),
          subtitle: subtitle.trim(),
          category: category.trim(),
          edition: edition.trim(),
          price: Number(price),
          currency,
          lengthCm: Number(lengthCm) || 75,
          widthCm: Number(widthCm) || 52,
          stock: Math.max(0, Number(stock) || 0),
          sizes: sizes.length > 0 ? sizes : ['M', 'L'],
          fabric: fabric.trim(),
          cut: cut.trim(),
          image: image.trim(),
          description: description.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'تعذر حفظ القطعة.');
        return;
      }
      onSaved(data.product, isEdit);
      onClose();
    } catch {
      setError('حدث خطأ في الاتصال بالخادم.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="flex max-h-[92vh] w-full max-w-3xl flex-col border shadow-2xl"
        style={{ backgroundColor: surface, borderColor: border, color: text }}
      >
        <div
          className="flex items-center justify-between border-b px-6 py-4"
          style={{ borderColor: border }}
        >
          <div className="flex items-center gap-3">
            <Shirt className="h-5 w-5" style={{ color: accent }} />
            <h2 className="text-lg font-semibold">
              {editingProduct ? 'تعديل قطعة الملابس' : 'إضافة ملابس جديدة للمتجر'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-[#A6A29A] hover:bg-[#1E2126] hover:text-[#F2EFE9]"
            aria-label="إغلاق"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 overflow-y-auto p-6">
          {error && (
            <div className="rounded-lg border border-rose-500/40 bg-rose-950/30 px-4 py-3 text-sm text-rose-200">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[#D4D0C8]">اسم القطعة *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="مثال: بليزر كتان أسود مفصّل"
                className="w-full rounded-lg border border-[#2A2D34] bg-[#0D0E10] px-3.5 py-2.5 text-sm text-[#F2EFE9] focus:border-[#C6A87D] focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[#D4D0C8]">الاسم الفرعي (اختياري)</label>
              <input
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="Tailored Linen Blazer"
                className="w-full rounded-lg border border-[#2A2D34] bg-[#0D0E10] px-3.5 py-2.5 text-sm text-[#F2EFE9] focus:border-[#C6A87D] focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[#D4D0C8]">الفئة</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border border-[#2A2D34] bg-[#0D0E10] px-3.5 py-2.5 text-sm text-[#F2EFE9] focus:border-[#C6A87D] focus:outline-none"
              >
                <option value="المعاطف">المعاطف</option>
                <option value="القمصان">القمصان</option>
                <option value="التريكو والبنطلونات">التريكو والبنطلونات</option>
                <option value="البدلات">البدلات</option>
                <option value="الإكسسوارات">الإكسسوارات</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[#D4D0C8]">الإصدار / الموسم</label>
              <input
                type="text"
                value={edition}
                onChange={(e) => setEdition(e.target.value)}
                placeholder="إصدار خاص 2026"
                className="w-full rounded-lg border border-[#2A2D34] bg-[#0D0E10] px-3.5 py-2.5 text-sm text-[#F2EFE9] focus:border-[#C6A87D] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            <div className="space-y-1.5 sm:col-span-1">
              <label className="block text-xs font-medium text-[#D4D0C8]">السعر *</label>
              <input
                type="number"
                min={1}
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full rounded-lg border border-[#2A2D34] bg-[#0D0E10] px-3 py-2 font-mono text-sm tabular-nums text-[#F2EFE9] focus:border-[#C6A87D] focus:outline-none"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-1">
              <label className="block text-xs font-medium text-[#D4D0C8]">العملة</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                className="w-full rounded-lg border border-[#2A2D34] bg-[#0D0E10] px-3 py-2 text-sm text-[#F2EFE9] focus:border-[#C6A87D] focus:outline-none"
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c} ({CURRENCY_LABELS[c]})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5 sm:col-span-1">
              <label className="block text-xs font-medium text-[#D4D0C8]">الطول (سم)</label>
              <input
                type="number"
                min={10}
                max={250}
                value={lengthCm}
                onChange={(e) => setLengthCm(e.target.value)}
                className="w-full rounded-lg border border-[#2A2D34] bg-[#0D0E10] px-3 py-2 font-mono text-sm tabular-nums text-[#F2EFE9] focus:border-[#C6A87D] focus:outline-none"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-1">
              <label className="block text-xs font-medium text-[#D4D0C8]">العرض (سم)</label>
              <input
                type="number"
                min={10}
                max={200}
                value={widthCm}
                onChange={(e) => setWidthCm(e.target.value)}
                className="w-full rounded-lg border border-[#2A2D34] bg-[#0D0E10] px-3 py-2 font-mono text-sm tabular-nums text-[#F2EFE9] focus:border-[#C6A87D] focus:outline-none"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-1">
              <label className="block text-xs font-medium text-[#D4D0C8]">العدد المتوفر</label>
              <input
                type="number"
                min={0}
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className="w-full rounded-lg border border-[#2A2D34] bg-[#0D0E10] px-3 py-2 font-mono text-sm tabular-nums text-[#F2EFE9] focus:border-[#C6A87D] focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-medium text-[#D4D0C8]">المقاسات المتاحة</label>
            <div className="flex flex-wrap gap-2">
              {ALL_SIZES.map((sz) => {
                const active = sizes.includes(sz);
                return (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => toggleSize(sz)}
                    className="mc-btn-sm h-9 min-w-[44px] px-3 font-mono text-xs font-semibold"
                    style={
                      active
                        ? { backgroundColor: accent, color: '#0D0E10' }
                        : { backgroundColor: bg, color: '#B0B5A6' }
                    }
                  >
                    {sz}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[#D4D0C8]">القماش والخامة</label>
              <input
                type="text"
                value={fabric}
                onChange={(e) => setFabric(e.target.value)}
                placeholder="مثال: صوف ميرينو 100%"
                className="w-full rounded-lg border border-[#2A2D34] bg-[#0D0E10] px-3.5 py-2.5 text-sm text-[#F2EFE9] focus:border-[#C6A87D] focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[#D4D0C8]">القصّة والتفصيل</label>
              <input
                type="text"
                value={cut}
                onChange={(e) => setCut(e.target.value)}
                placeholder="مثال: قصّة كلاسيكية محددة"
                className="w-full rounded-lg border border-[#2A2D34] bg-[#0D0E10] px-3.5 py-2.5 text-sm text-[#F2EFE9] focus:border-[#C6A87D] focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-2.5">
            <label className="block text-xs font-medium text-[#D4D0C8]">صورة القطعة</label>
            <div className="flex flex-wrap items-center gap-2">
              {PRESET_IMAGES.map((preset) => (
                <button
                  key={preset.url}
                  type="button"
                  onClick={() => setImage(preset.url)}
                  className="mc-btn-sm px-3 py-1.5 text-xs font-medium"
                  style={
                    image === preset.url
                      ? { backgroundColor: `${accent}30`, color: accent }
                      : { backgroundColor: bg, color: '#B0B5A6' }
                  }
                >
                  {preset.label}
                </button>
              ))}
              <label className="mc-btn-sm inline-flex cursor-pointer items-center gap-1.5 bg-[#1C1F24] px-3 py-1.5 text-xs text-[#F2EFE9]">
                <Upload className="h-3.5 w-3.5" />
                <span>رفع صورة من جهازك</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
            <input
              type="text"
              value={image.startsWith('data:') ? 'تم اختيار صورة مرفوعة من الجهاز' : image}
              onChange={(e) => setImage(e.target.value)}
              placeholder="أو أدخل رابط الصورة"
              className="w-full rounded-lg border border-[#2A2D34] bg-[#0D0E10] px-3.5 py-2 text-xs text-[#A6A29A] focus:border-[#C6A87D] focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-[#D4D0C8]">وصف القطعة</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="تفاصيل إضافية عن القماش والتفصيل وطريقة العناية..."
              className="w-full rounded-lg border border-[#2A2D34] bg-[#0D0E10] px-3.5 py-2.5 text-sm text-[#F2EFE9] focus:border-[#C6A87D] focus:outline-none"
            />
          </div>

          <div
            className="flex items-center justify-end gap-3 border-t pt-4"
            style={{ borderColor: border }}
          >
            <button
              type="button"
              onClick={onClose}
              className="mc-btn-sm px-4 py-2 text-sm text-[#D4D0C8]"
              style={{ backgroundColor: bg }}
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={saving}
              className="mc-btn px-6 py-2.5 text-sm font-semibold text-[#0D0E10] disabled:opacity-60"
              style={{ backgroundColor: accent }}
            >
              {saving ? 'جاري الحفظ...' : editingProduct ? 'حفظ التعديلات' : 'نشر القطعة في المتجر'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
