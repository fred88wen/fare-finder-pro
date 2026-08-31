/** The AWS HTTP API that fronts the subscription Lambdas (public endpoint, no secret). */
export const FLIGHT_API_BASE =
  import.meta.env["VITE_FLIGHT_API_URL"]?.replace(/\/$/, "") ??
  "https://bmzjswvj8l.execute-api.us-east-1.amazonaws.com";

export type PlanName = "tokyo" | "seoul";

export type Plan = {
  planName: PlanName;
  label: string;
  route: string;
  emoji: string;
  /** Cheapest fare seen when the plan was set up — a hint for picking a sane target. */
  hintTwd: number;
};

export const PLANS: Plan[] = [
  { planName: "tokyo", label: "台北 ✈ 東京", route: "TPE-TYO", emoji: "🗼", hintTwd: 7182 },
  { planName: "seoul", label: "台北 ✈ 首爾", route: "TPE-SEL", emoji: "🏙️", hintTwd: 4303 },
];

/** M2 lifecycle: pending_payment -> active -> cancelled (grace) -> expired. */
export type SubscriptionStatus = "pending_payment" | "active" | "cancelled" | "expired";

export type Subscription = {
  email: string;
  route: string;
  plan_name: PlanName;
  origin: string;
  destination: string;
  target_price: number;
  currency: string;
  created_at?: string;
  updated_at?: string;
  /** Absent on legacy M1 rows — treated as pending_payment in the UI. */
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
  planName: PlanName;
  targetPrice: number;
}): Promise<SubscribeResult> {
  const response = await fetch(`${FLIGHT_API_BASE}/subscribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: input.email,
      plan_name: input.planName,
      target_price: input.targetPrice,
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
