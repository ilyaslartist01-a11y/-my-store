import { useState } from 'react';
import { X, Mail, Phone, AtSign, Send, CheckCircle2 } from 'lucide-react';
import type { SiteDesignConfig } from '../types';

interface ContactModalProps {
  isOpen: boolean;
  design: SiteDesignConfig;
  onClose: () => void;
}

export function ContactModal({ isOpen, design, onClose }: ContactModalProps) {
  const [senderName, setSenderName] = useState('');
  const [senderContact, setSenderContact] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentRef, setSentRef] = useState<string | null>(null);

  if (!isOpen) return null;

  const hasDirectChannels = Boolean(
    design.contactEmail || design.contactPhone || design.contactInstagram
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSentRef(null);

    if (!senderName.trim() || !senderContact.trim() || !message.trim()) {
      setError('يرجى تعبئة الاسم ووسيلة التواصل ونص الرسالة.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderName: senderName.trim(),
          senderContact: senderContact.trim(),
          message: message.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'تعذر إرسال الرسالة.');
        return;
      }
      setSentRef(data.contactMessage?.id ?? 'OK');
      setSenderName('');
      setSenderContact('');
      setMessage('');
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
      aria-labelledby="contact-modal-title"
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border p-6 shadow-2xl sm:p-8"
        style={{
          backgroundColor: design.surfaceColor,
          borderColor: design.borderColor,
          color: design.textColor,
        }}
      >
        <div
          className="mb-6 flex items-start justify-between gap-4 border-b pb-4"
          style={{ borderColor: design.borderColor }}
        >
          <div>
            <p className="minecraft-wordmark-sm text-xs" style={{ color: design.accentColor }}>
              {design.brandName}
            </p>
            <h2 id="contact-modal-title" className="mt-1 text-xl font-semibold">
              التواصل معي
            </h2>
            <p className="mt-1 text-xs" style={{ color: design.mutedColor }}>
              أرسل استفسارك أو طلبك الخاص وسيتواصل معك المالك مباشرة.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 hover:opacity-80"
            style={{ color: design.mutedColor }}
            aria-label="إغلاق نافذة التواصل"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {hasDirectChannels && (
          <div
            className="mb-6 space-y-2.5 rounded-lg border p-4 text-xs"
            style={{
              backgroundColor: design.bgColor,
              borderColor: design.borderColor,
            }}
          >
            {design.contactEmail && (
              <a
                href={`mailto:${design.contactEmail}`}
                className="flex items-center justify-between gap-3 py-1 hover:opacity-80"
              >
                <span className="flex items-center gap-2" style={{ color: design.mutedColor }}>
                  <Mail className="h-3.5 w-3.5" style={{ color: design.accentColor }} />
                  <span>البريد الإلكتروني</span>
                </span>
                <span className="font-mono">{design.contactEmail}</span>
              </a>
            )}
            {design.contactPhone && (
              <a
                href={`tel:${design.contactPhone}`}
                className="flex items-center justify-between gap-3 py-1 hover:opacity-80"
              >
                <span className="flex items-center gap-2" style={{ color: design.mutedColor }}>
                  <Phone className="h-3.5 w-3.5" style={{ color: design.accentColor }} />
                  <span>الهاتف / واتساب</span>
                </span>
                <span className="font-mono" dir="ltr">
                  {design.contactPhone}
                </span>
              </a>
            )}
            {design.contactInstagram && (
              <div className="flex items-center justify-between gap-3 py-1">
                <span className="flex items-center gap-2" style={{ color: design.mutedColor }}>
                  <AtSign className="h-3.5 w-3.5" style={{ color: design.accentColor }} />
                  <span>انستغرام</span>
                </span>
                <span className="font-mono" dir="ltr">
                  {design.contactInstagram}
                </span>
              </div>
            )}
          </div>
        )}

        {sentRef && (
          <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-emerald-500/40 bg-emerald-950/30 p-4 text-xs text-emerald-200">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              تم إرسال رسالتك إلى المالك بنجاح (مرجع{' '}
              <span className="font-mono font-semibold">{sentRef}</span>).
            </span>
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-lg border border-rose-500/40 bg-rose-950/30 px-4 py-2.5 text-xs text-rose-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs" style={{ color: design.mutedColor }}>
              الاسم الكامل
            </label>
            <input
              type="text"
              required
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              placeholder="اكتب اسمك"
              className="w-full rounded-lg border px-3.5 py-2.5 text-sm focus:outline-none"
              style={{
                backgroundColor: design.bgColor,
                borderColor: design.borderColor,
                color: design.textColor,
              }}
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs" style={{ color: design.mutedColor }}>
              وسيلة التواصل (رقم الهاتف أو البريد الإلكتروني)
            </label>
            <input
              type="text"
              required
              value={senderContact}
              onChange={(e) => setSenderContact(e.target.value)}
              placeholder="مثال: رقم الهاتف أو الإيميل"
              className="w-full rounded-lg border px-3.5 py-2.5 text-sm focus:outline-none"
              style={{
                backgroundColor: design.bgColor,
                borderColor: design.borderColor,
                color: design.textColor,
              }}
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs" style={{ color: design.mutedColor }}>
              الرسالة
            </label>
            <textarea
              rows={4}
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="اكتب رسالتك أو استفسارك هنا..."
              className="w-full rounded-lg border px-3.5 py-2.5 text-sm focus:outline-none"
              style={{
                backgroundColor: design.bgColor,
                borderColor: design.borderColor,
                color: design.textColor,
              }}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="mc-btn-sm px-4 py-2 text-xs font-semibold"
              style={{ backgroundColor: design.bgColor, color: design.mutedColor }}
            >
              إغلاق
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="mc-btn inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-[#0D0E10] disabled:opacity-60"
              style={{ backgroundColor: design.accentColor }}
            >
              <Send className="h-3.5 w-3.5" />
              <span>{submitting ? 'جاري الإرسال...' : 'إرسال الرسالة'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
