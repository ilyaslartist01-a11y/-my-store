import { useState } from 'react';
import { X, Ticket, CheckCircle2, Clock, XCircle, ShieldCheck } from 'lucide-react';
import type { SiteDesignConfig, VipRequestItem } from '../types';

interface VipJoinModalProps {
  isOpen: boolean;
  design: SiteDesignConfig;
  vipSession: Pick<VipRequestItem, 'id' | 'visitorName' | 'couponCode' | 'discountPercent' | 'status'> | null;
  onClose: () => void;
  onSubmitted: (token: string, request: Pick<VipRequestItem, 'id' | 'visitorName' | 'couponCode' | 'discountPercent' | 'status'>) => void;
  onReset: () => void;
  onOpenPrivacy: () => void;
}

export function VipJoinModal({
  isOpen,
  design,
  vipSession,
  onClose,
  onSubmitted,
  onReset,
  onOpenPrivacy,
}: VipJoinModalProps) {
  const [visitorName, setVisitorName] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [note, setNote] = useState('');
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!visitorName.trim()) {
      setError('يرجى كتابة الاسم الكامل.');
      return;
    }
    if (!couponCode.trim()) {
      setError('يرجى كتابة رمز الكوبون الخاص.');
      return;
    }
    if (!privacyAccepted) {
      setError('يرجى الموافقة على سياسة الخصوصية.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/vip-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitorName: visitorName.trim(),
          couponCode: couponCode.trim(),
          note: note.trim(),
          privacyAccepted: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'تعذر إرسال الطلب.');
        return;
      }
      onSubmitted(data.sessionToken, data.request);
      setVisitorName('');
      setCouponCode('');
      setNote('');
    } catch {
      setError('حدث خطأ في الاتصال بالخادم.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-lg rounded-xl border p-6 sm:p-8 shadow-2xl"
        style={{
          backgroundColor: design.surfaceColor,
          borderColor: design.borderColor,
          color: design.textColor,
        }}
      >
        <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: design.borderColor }}>
          <div className="flex items-center gap-2.5">
            <Ticket className="h-5 w-5" style={{ color: design.accentColor }} />
            <h2 className="text-lg font-semibold">قائمة الزوار المقربين</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 transition-opacity hover:opacity-80"
            style={{ color: design.mutedColor }}
            aria-label="إغلاق"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5">
          {vipSession && vipSession.status === 'pending' ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2.5" style={{ color: design.accentColor }}>
                <Clock className="h-5 w-5" />
                <span className="text-base font-semibold">طلبك في قائمة المقربين قيد المراجعة</span>
              </div>
              <div
                className="space-y-2 rounded-lg border p-4 text-sm"
                style={{ backgroundColor: design.bgColor, borderColor: design.borderColor }}
              >
                <div className="flex justify-between">
                  <span style={{ color: design.mutedColor }}>الاسم</span>
                  <span>{vipSession.visitorName}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: design.mutedColor }}>الكوبون</span>
                  <span className="font-mono">{vipSession.couponCode}</span>
                </div>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: design.mutedColor }}>
                يمكنك متابعة تصفح المتجر الآن؛ وبمجرد قبول المالك لطلبك سيتم تفعيل امتيازات قائمة المقربين والخصم على حقيبتك تلقائياً.
              </p>
              <button
                type="button"
                onClick={onReset}
                className="mc-btn-sm px-4 py-2 text-xs font-semibold"
                style={{ backgroundColor: design.bgColor, color: design.mutedColor }}
              >
                تقديم طلب باسم أو كوبون آخر
              </button>
            </div>
          ) : vipSession && vipSession.status === 'approved' ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2.5 text-emerald-400">
                <CheckCircle2 className="h-5 w-5" />
                <span className="text-base font-semibold">تم قبولك في قائمة الزوار المقربين</span>
              </div>
              <div
                className="space-y-2 rounded-lg border p-4 text-sm"
                style={{ backgroundColor: design.bgColor, borderColor: design.borderColor }}
              >
                <div className="flex justify-between">
                  <span style={{ color: design.mutedColor }}>الاسم</span>
                  <span>{vipSession.visitorName}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: design.mutedColor }}>الكوبون المعتمد</span>
                  <span className="font-mono" style={{ color: design.accentColor }}>
                    {vipSession.couponCode}
                  </span>
                </div>
                {vipSession.discountPercent > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span>الخصم المطبق</span>
                    <span className="font-mono tabular-nums">{vipSession.discountPercent}%</span>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={onReset}
                className="mc-btn-sm px-4 py-2 text-xs font-semibold"
                style={{ backgroundColor: design.bgColor, color: design.mutedColor }}
              >
                تغيير الكوبون
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {vipSession && (vipSession.status === 'denied' || vipSession.status === 'revoked') && (
                <div className="flex items-center gap-2 rounded-lg border border-rose-500/40 bg-rose-950/30 px-3.5 py-2.5 text-xs text-rose-200">
                  <XCircle className="h-4 w-4 shrink-0" />
                  <span>لم تتم الموافقة على الكوبون السابق، يمكنك المحاولة بكوبون آخر.</span>
                </div>
              )}

              {error && (
                <div className="rounded-lg border border-rose-500/40 bg-rose-950/30 px-3.5 py-2.5 text-xs text-rose-200">
                  {error}
                </div>
              )}

              <p className="text-xs leading-relaxed" style={{ color: design.mutedColor }}>
                اكتب اسمك ورمز الكوبون الخاص بك ليتمكن مالك المتجر من مراجعتك وقبولك في قائمة الزوار المقربين.
              </p>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium">الاسم الكامل</label>
                <input
                  type="text"
                  required
                  value={visitorName}
                  onChange={(e) => setVisitorName(e.target.value)}
                  placeholder="اكتب اسمك الكامل"
                  className="w-full rounded-lg border px-3.5 py-2.5 text-sm focus:outline-none"
                  style={{
                    backgroundColor: design.bgColor,
                    borderColor: design.borderColor,
                    color: design.textColor,
                  }}
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium">رمز الكوبون</label>
                <input
                  type="text"
                  required
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="مثال: VIP-2026"
                  className="w-full rounded-lg border px-3.5 py-2.5 font-mono text-sm uppercase focus:outline-none"
                  style={{
                    backgroundColor: design.bgColor,
                    borderColor: design.borderColor,
                    color: design.textColor,
                  }}
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium">ملاحظة اختيارية</label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="ملاحظة للمالك (اختياري)"
                  className="w-full rounded-lg border px-3.5 py-2.5 text-sm focus:outline-none"
                  style={{
                    backgroundColor: design.bgColor,
                    borderColor: design.borderColor,
                    color: design.textColor,
                  }}
                />
              </div>

              <div className="flex items-start gap-2.5 pt-1">
                <input
                  id="vip-privacy-check"
                  type="checkbox"
                  checked={privacyAccepted}
                  onChange={(e) => setPrivacyAccepted(e.target.checked)}
                  className="mt-0.5 h-4 w-4 cursor-pointer"
                  style={{ accentColor: design.accentColor }}
                />
                <label htmlFor="vip-privacy-check" className="text-xs leading-relaxed" style={{ color: design.mutedColor }}>
                  أوافق على{' '}
                  <button
                    type="button"
                    onClick={onOpenPrivacy}
                    className="inline-flex items-center gap-1 font-semibold underline"
                    style={{ color: design.accentColor }}
                  >
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>سياسة الخصوصية</span>
                  </button>
                </label>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="mc-btn w-full px-5 py-2.5 text-sm font-semibold disabled:opacity-60"
                style={{ backgroundColor: design.accentColor, color: '#0D0E10' }}
              >
                {submitting ? 'جاري الإرسال...' : 'إرسال الاسم والكوبون للقبول'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
