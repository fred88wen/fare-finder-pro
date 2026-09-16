import { createClient } from "@supabase/supabase-js";

// Vercel Node.js Function（Web-standard Request/Response 簽名，免額外裝 @vercel/node）。
//
// 為什麼不直接用 Supabase 內建的 resetPasswordForEmail：免費方案且未設自訂 SMTP 時，
// Supabase 內建寄信服務只會寄給「這個 Supabase 專案團隊成員」的信箱，其他信箱一律
// 失敗（Email address not authorized）。真客戶收不到信。這支改用 Admin API 產生連結、
// 自己用已驗證的 mail.goboss.tw（Resend）寄出，繞過上述限制，範本也能完全中文化。
export const config = { runtime: "nodejs" };

const SUPABASE_URL = process.env["VITE_SUPABASE_URL"];
const SERVICE_ROLE_KEY = process.env["SUPABASE_SERVICE_ROLE_KEY"];
const RESEND_API_KEY = process.env["RESEND_API_KEY"];
const RESEND_FROM = process.env["RESEND_FROM"] ?? "alerts@mail.goboss.tw";
const SITE_URL = process.env["SITE_URL"] ?? "https://shop.goboss.tw";

function wrapEmail(inner: string): string {
  return (
    '<div style="font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',sans-serif;' +
    'font-size:15px;line-height:1.6;color:#111827;max-width:520px;">' +
    inner +
    "</div>"
  );
}

async function sendResetEmail(to: string, actionLink: string): Promise<void> {
  const subject = "重設你的 Site Watch 密碼";
  const html = wrapEmail(
    '<h2 style="margin:0 0 16px;">重設密碼</h2>' +
      '<p style="margin:0 0 12px;">我們收到重設你 Site Watch 帳號密碼的請求。點擊下方按鈕設定新密碼：</p>' +
      `<p style="margin:24px 0;"><a href="${actionLink}" style="background:#f59e0b;color:#111827;` +
      'text-decoration:none;padding:12px 22px;border-radius:6px;display:inline-block;' +
      'font-weight:600;">重設密碼</a></p>' +
      '<p style="margin:0;color:#6b7280;font-size:13px;">如果這不是你本人的操作，請忽略這封信，你的密碼不會被更動。</p>',
  );
  const text = `重設你的 Site Watch 密碼：${actionLink}\n\n如果這不是你本人的操作，請忽略這封信。`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: RESEND_FROM, to, subject, html, text }),
  });

  if (!res.ok) {
    throw new Error(`Resend ${res.status}: ${await res.text()}`);
  }
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !RESEND_API_KEY) {
    console.error("[forgot-password] missing env vars", {
      hasUrl: !!SUPABASE_URL,
      hasServiceRole: !!SERVICE_ROLE_KEY,
      hasResend: !!RESEND_API_KEY,
    });
    return new Response(JSON.stringify({ error: "Server not configured" }), { status: 500 });
  }

  let email: string | undefined;
  try {
    const body = (await request.json()) as { email?: unknown };
    email = typeof body.email === "string" ? body.email.trim() : undefined;
  } catch {
    // 交給下面的 email 檢查統一回錯誤
  }

  if (!email) {
    return new Response(JSON.stringify({ error: "email is required" }), { status: 400 });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await admin.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo: `${SITE_URL}/reset-password` },
  });

  // 不管信箱是否已註冊，一律回同一句成功——避免被拿來試探哪些 email 已有帳號。
  // 只有信箱真的對應到帳號時才會真正寄信。
  if (error || !data?.properties?.action_link) {
    console.warn("[forgot-password] generateLink failed (likely no such user)", email, error?.message);
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }

  try {
    await sendResetEmail(email, data.properties.action_link);
  } catch (err) {
    // 信寄失敗仍回成功給前端（同樣是防枚舉），但要留在 log 裡供事後排查。
    console.error("[forgot-password] send email failed", err);
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
}
