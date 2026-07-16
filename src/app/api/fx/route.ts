import { NextResponse } from "next/server";

const DEFAULT_RATE = 0.135;

export async function GET() {
  try {
    const response = await fetch(
      "https://api.frankfurter.app/latest?from=CNY&to=EUR",
      { next: { revalidate: 3600 } }
    );

    if (!response.ok) {
      throw new Error(`Exchange-rate provider returned ${response.status}`);
    }

    const data: unknown = await response.json();
    const marketRate =
      typeof data === "object" &&
      data !== null &&
      "rates" in data &&
      typeof data.rates === "object" &&
      data.rates !== null &&
      "EUR" in data.rates
        ? Number(data.rates.EUR)
        : Number.NaN;

    if (!Number.isFinite(marketRate) || marketRate <= 0) {
      throw new Error("Exchange-rate provider returned an invalid rate");
    }

    return NextResponse.json({
      rate: Number((marketRate * 1.035).toFixed(4)),
      source: "frankfurter"
    });
  } catch {
    return NextResponse.json({
      rate: DEFAULT_RATE,
      source: "fallback"
    });
  }
}
