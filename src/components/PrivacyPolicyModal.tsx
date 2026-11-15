import { X, ShieldCheck } from 'lucide-react';
import type { SiteDesignConfig } from '../types';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  design?: SiteDesignConfig;
  onClose: () => void;
  onAccept?: () => void;
}

export function PrivacyPolicyModal({ isOpen, design, onClose, onAccept }: PrivacyPolicyModalProps) {
  if (!isOpen) return null;

  const bg = design?.bgColor ?? '#141812';
  const surface = design?.surfaceColor ?? '#1E241A';
  const border = design?.borderColor ?? '#34402C';
  const text = design?.textColor ?? '#F2ECE0';
  const muted = design?.mutedColor ?? '#B0B5A6';
  const accent = design?.accentColor ?? '#6BB83B';
  const brandName = design?.brandName ?? 'Skeleton Store';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="privacy-modal-title"
    >
      <div
        className="relative flex max-h-[88vh] w-full max-w-2xl flex-col border shadow-2xl"
        style={{ backgroundColor: surface, borderColor: border, color: text }}
      >
        <div
          className="flex items-center justify-between border-b px-6 py-4"
          style={{ borderColor: border }}
        >
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5" style={{ color: accent }} aria-hidden="true" />
            <h2 id="privacy-modal-title" className="text-lg font-semibold">
              سياسة الخصوصية وشروط الوصول الخاص
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center transition-opacity hover:opacity-80"
            style={{ color: muted }}
            aria-label="إغلاق سياسة الخصوصية"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 overflow-y-auto px-6 py-5 text-sm leading-7" style={{ color: text }}>
          <p className="text-xs" style={{ color: muted }}>
            آخر تحديث: نوفمبر 2026 · دار الأزياء الخاصة {brandName}
          </p>

          <section className="space-y-2">
            <h3 className="text-base font-semibold">1. طبيعة المتجر الخاص وقائمة الزوار المقربين</h3>
            <p style={{ color: muted }}>
              يُعد متجر <span className="font-semibold" style={{ color: text }}>{brandName}</span> متجراً خاصاً لبيع الملابس الفاخرة والمفصّلة. يقتصر الدخول إلى المجموعة الحصرية على المدعوين عبر إدخال كلمة مرور الموقع أو التسجيل في قائمة الزوار المقربين باستخدام الاسم ورمز الكوبون المخصص من المالك.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="text-base font-semibold">2. البيانات التي يتم جمعها</h3>
            <ul className="list-disc space-y-1.5 pr-5" style={{ color: muted }}>
              <li>الاسم الكامل الذي تدخله عند التقديم عبر البوابة أو قائمة الزوار المقربين.</li>
              <li>رمز الكوبون الخاص بقائمة المقربين للتحقق من صحته وتطبيق الامتيازات أو الخصومات المرفقة به.</li>
              <li>سجل وقت إرسال الطلب وموافقتك الصريحة على سياسة الخصوصية.</li>
              <li>بيانات التوصيل (الهاتف، المدينة، العنوان، المقاسات المختارة) عند إرسال طلبية ملابس.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h3 className="text-base font-semibold">3. سرية بيانات الدخول</h3>
            <p style={{ color: muted }}>
              يتم التحقق من كلمة مرور الموقع عبر خوارزميات تعمية قياسية على الخادم دون تخزينها كنص صريح. يرجى استخدام كلمة مرور الوصول أو كوبون الدعوة المخصص لهذا المتجر فقط، وعدم إدخال أي كلمات مرور شخصية لحسابات خارجية.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="text-base font-semibold">4. مراجعة المالك وحقوق الزائر</h3>
            <p style={{ color: muted }}>
              تخضع جميع طلبات الدخول وطلبات قائمة الزوار المقربين لمراجعة المالك وموافقته المباشرة قبل فتح المتجر، ولا تتم مشاركة بياناتك أو طلبياتك مع أي جهة خارجية.
            </p>
          </section>
        </div>

        <div
          className="flex flex-wrap items-center justify-end gap-3 border-t px-6 py-4"
          style={{ borderColor: border }}
        >
          <button
            type="button"
            onClick={onClose}
            className="mc-btn-sm whitespace-nowrap px-4 py-2 text-sm font-medium"
            style={{ backgroundColor: bg, color: text }}
          >
            إغلاق
          </button>
          {onAccept && (
            <button
              type="button"
              onClick={() => {
                onAccept();
                onClose();
              }}
              className="mc-btn whitespace-nowrap px-5 py-2 text-sm font-semibold text-[#0D0E10]"
              style={{ backgroundColor: accent }}
            >
              قرأت وأوافق على سياسة الخصوصية
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
