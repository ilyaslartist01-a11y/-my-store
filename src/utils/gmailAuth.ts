import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  type User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { CURRENCY_LABELS, type StoreOrder } from '../types';

export const GMAIL_SCOPES = ['https://www.googleapis.com/auth/gmail.send'] as const;

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
for (const scope of GMAIL_SCOPES) {
  provider.addScope(scope);
}

let isSigningIn = false;
// Access token is cached strictly in memory (never in localStorage or sessionStorage)
let cachedAccessToken: string | null = null;

export function initGmailAuth(
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
): () => void {
  return onAuthStateChanged(auth, (user: User | null) => {
    if (user && cachedAccessToken) {
      onAuthSuccess?.(user, cachedAccessToken);
    } else if (!isSigningIn) {
      if (!user) {
        cachedAccessToken = null;
      }
      onAuthFailure?.();
    }
  });
}

export async function signInWithGoogleForGmail(): Promise<{
  user: User;
  accessToken: string;
}> {
  isSigningIn = true;
  try {
    provider.setCustomParameters({ prompt: 'consent select_account' });
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('تعذر الحصول على تصريح الوصول إلى Gmail.');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } finally {
    isSigningIn = false;
  }
}

export function getGmailAccessToken(): string | null {
  return cachedAccessToken;
}

export async function logoutGmail(): Promise<void> {
  cachedAccessToken = null;
  await auth.signOut();
}

function encodeBase64Utf8(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function encodeBase64UrlUtf8(input: string): string {
  return encodeBase64Utf8(input).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function encodeMimeHeaderUtf8(text: string): string {
  return `=?UTF-8?B?${encodeBase64Utf8(text)}?=`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function sendOrderNotificationViaGmail(
  accessToken: string,
  toEmail: string,
  order: StoreOrder,
  brandName: string
): Promise<{ id: string }> {
  const currencyLabel = CURRENCY_LABELS[order.currency] ?? order.currency;
  const deliveryLabel =
    order.deliveryMethod === 'post_office' ? 'المكتب البريدي' : 'التوصيل للمنزل';

  const itemsRowsHtml = order.items
    .map((it) => {
      const customInfo = it.customDesign
        ? `<div style="font-size:12px;color:#666;margin-top:4px;">لون التصميم: ${escapeHtml(
            it.customDesign.colorName
          )} (${escapeHtml(it.customDesign.colorHex)}) · صور أمام: ${
            it.customDesign.frontLayersCount
          } / خلف: ${it.customDesign.backLayersCount}</div>`
        : '';
      return `
        <tr>
          <td style="padding:10px;border-bottom:1px solid #e5e7eb;">
            <strong>${escapeHtml(it.title)}</strong>${customInfo}
          </td>
          <td style="padding:10px;border-bottom:1px solid #e5e7eb;text-align:center;">${escapeHtml(it.size)}</td>
          <td style="padding:10px;border-bottom:1px solid #e5e7eb;text-align:center;">${it.quantity}</td>
          <td style="padding:10px;border-bottom:1px solid #e5e7eb;text-align:left;font-family:monospace;">${it.price.toLocaleString(
            'en-US'
          )} ${escapeHtml(currencyLabel)}</td>
        </tr>`;
    })
    .join('');

  const htmlBody = `
  <div dir="rtl" style="font-family:Arial,Helvetica,sans-serif;background:#f8f9fa;padding:24px;color:#111827;">
    <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
      <div style="background:#0D0E10;color:#F2EFE9;padding:20px 24px;">
        <div style="font-size:12px;color:#C6A87D;">${escapeHtml(brandName)} — إشعار طلبية جديدة</div>
        <h2 style="margin:6px 0 0;font-size:20px;">طلبية جديدة رقم ${escapeHtml(order.id)}</h2>
      </div>
      <div style="padding:20px 24px;font-size:14px;line-height:1.7;">
        <p style="margin:0 0 12px;"><strong>اسم العميل:</strong> ${escapeHtml(order.visitorName)}</p>
        <p style="margin:0 0 12px;"><strong>رقم الهاتف:</strong> <span dir="ltr">${escapeHtml(order.phone)}</span></p>
        <p style="margin:0 0 12px;"><strong>الولاية:</strong> ${escapeHtml(order.wilayaCode)} — ${escapeHtml(order.wilayaName)}</p>
        <p style="margin:0 0 12px;"><strong>طريقة التوصيل:</strong> ${deliveryLabel}</p>
        <p style="margin:0 0 12px;"><strong>العنوان / البلدية:</strong> ${escapeHtml(order.city)} — ${escapeHtml(order.address)}</p>
        ${
          order.notes
            ? `<p style="margin:0 0 12px;"><strong>ملاحظات العميل:</strong> ${escapeHtml(order.notes)}</p>`
            : ''
        }
        ${
          order.couponCode
            ? `<p style="margin:0 0 12px;"><strong>كوبون الخصم:</strong> ${escapeHtml(order.couponCode)} (${order.discountPercent}%)</p>`
            : ''
        }
        <table style="width:100%;border-collapse:collapse;margin-top:16px;font-size:13px;">
          <thead>
            <tr style="background:#f3f4f6;">
              <th style="padding:10px;text-align:right;">القطعة</th>
              <th style="padding:10px;text-align:center;">المقاس</th>
              <th style="padding:10px;text-align:center;">الكمية</th>
              <th style="padding:10px;text-align:left;">السعر</th>
            </tr>
          </thead>
          <tbody>${itemsRowsHtml}</tbody>
        </table>
        <div style="margin-top:16px;padding-top:12px;border-top:1px solid #e5e7eb;font-size:14px;">
          <div>المجموع الفرعي: <strong>${order.subtotal.toLocaleString('en-US')} ${escapeHtml(currencyLabel)}</strong></div>
          ${
            order.discountAmount > 0
              ? `<div>الخصم: <strong>-${order.discountAmount.toLocaleString('en-US')} ${escapeHtml(currencyLabel)}</strong></div>`
              : ''
          }
          <div>رسوم التوصيل: <strong>${order.deliveryFee.toLocaleString('en-US')} ${escapeHtml(currencyLabel)}</strong></div>
          <div style="font-size:17px;margin-top:6px;">الإجمالي النهائي: <strong style="color:#9A7B4F;">${order.total.toLocaleString('en-US')} ${escapeHtml(currencyLabel)}</strong></div>
        </div>
      </div>
    </div>
  </div>`;

  const subject = `[${brandName}] طلبية جديدة ${order.id} - ${order.visitorName}`;
  const rawMime = [
    `To: ${toEmail}`,
    `Subject: ${encodeMimeHeaderUtf8(subject)}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    encodeBase64Utf8(htmlBody),
  ].join('\r\n');

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      raw: encodeBase64UrlUtf8(rawMime),
    }),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    const msg =
      (errBody as { error?: { message?: string } })?.error?.message ||
      'فشل إرسال الرسالة عبر Gmail.';
    if (res.status === 401) {
      cachedAccessToken = null;
    }
    throw new Error(msg);
  }

  return res.json();
}
