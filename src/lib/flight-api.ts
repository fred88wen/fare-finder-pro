/** The AWS HTTP API that fronts the subscription Lambdas (public endpoint, no secret). */
export const FLIGHT_API_BASE =
  import.meta.env["VITE_FLIGHT_API_URL"]?.replace(/\/$/, "") ??
  "https://bmzjswvj8l.execute-api.us-east-1.amazonaws.com";

export type CheckType = "uptime" | "domain_expiry";

export const CHECK_TYPE_META: Record<
  CheckType,
  { label: string; subtitle: string; placeholder: string; emoji: string }
> = {
  uptime: {
    label: "網站正常運行監控",
    subtitle: "Uptime monitoring",
    placeholder: "https://example.com",
    emoji: "🟢",
  },
  domain_expiry: {
    label: "網域到期提醒",
    subtitle: "Domain expiry alerts",
    placeholder: "example.com",
    emoji: "📅",
  },
};

/** Default lead time for a new domain_expiry monitor — matches the marketing copy (30/14/7/1). */
export const DEFAULT_THRESHOLD_DAYS = 30;

/** M2 lifecycle: pending_payment -> active -> cancelled (grace) -> expired. */
export type SubscriptionStatus = "pending_payment" | "active" | "cancelled" | "expired";

export type Subscription = {
  email: string;
  /** DynamoDB sort key attribute name is unchanged from the flight-era schema; value == target. */
  route: string;
  target: string;
  check_type: CheckType;
  /** domain_expiry only: alert this many days before expiry. */
  threshold?: number;
  created_at?: string;
  updated_at?: string;
  /** Absent on legacy rows — treated as pending_payment in the UI. */
  subscription_status?: SubscriptionStatus;
  current_period_end?: string;
  current_period_end_date?: string;
  merchant_trade_no?: string;
};

/** NT$ per month — the price actually charged lives in the flight/ecpay secret. */
export const MONTHLY_PRICE_TWD = 300;

export function statusOf(subscription?: Subscription): SubscriptionStatus | "none" {
  if (!subscription) return "none";
  return subscription.subscription_status ?? "pending_payment";
}

async function readJson(response: Response) {
  const text = await response.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`API returned non-JSON (${response.status}): ${text.slice(0, 120)}`);
  }
  if (!response.ok) {
    const message =
      body && typeof body === "object" && "error" in body
        ? String((body as { error: unknown }).error)
        : `Request failed (${response.status})`;
    throw new Error(message);
  }
  return body;
}

export async function listSubscriptions(email: string): Promise<Subscription[]> {
  const url = `${FLIGHT_API_BASE}/subscriptions?email=${encodeURIComponent(email)}`;
  const body = (await readJson(await fetch(url))) as { subscriptions?: Subscription[] };
  return body.subscriptions ?? [];
}

/**
 * /subscribe answers in one of two shapes, so the caller MUST branch on
 * Content-Type: text/html is the ECPay auto-submit cashier form (a new or unpaid
 * subscriber), application/json is an in-place target update for someone who has
 * already paid. Calling res.json() on the HTML is what silently breaks the button.
 */
export type SubscribeResult =
  | { kind: "checkout"; html: string }
  | { kind: "updated"; subscription: Subscription };

export async function saveSubscription(input: {
  email: string;
  target: string;
  checkType: CheckType;
  /** required for domain_expiry, ignored otherwise */
  threshold?: number;
}): Promise<SubscribeResult> {
  const response = await fetch(`${FLIGHT_API_BASE}/subscribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: input.email,
      target: input.target,
      check_type: input.checkType,
      threshold: input.threshold,
    }),
  });
  const contentType = response.headers.get("content-type") ?? "";
  if (response.ok && contentType.includes("text/html")) {
    return { kind: "checkout", html: await response.text() };
  }
  return { kind: "updated", subscription: (await readJson(response)) as Subscription };
}

/** Hand the browser to ECPay's cashier: the returned form auto-submits itself. */
export function goToCheckout(html: string) {
  document.open();
  document.write(html);
  document.close();
}

export async function cancelSubscription(input: {
  email: string;
  route: string;
}): Promise<Subscription> {
  const response = await fetch(`${FLIGHT_API_BASE}/cancel`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: input.email, route: input.route }),
  });
  return (await readJson(response)) as Subscription;
}
