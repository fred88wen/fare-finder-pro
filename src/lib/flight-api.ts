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
};

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

export async function saveSubscription(input: {
  email: string;
  planName: PlanName;
  targetPrice: number;
}): Promise<Subscription> {
  const response = await fetch(`${FLIGHT_API_BASE}/subscribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: input.email,
      plan_name: input.planName,
      target_price: input.targetPrice,
    }),
  });
  return (await readJson(response)) as Subscription;
}
