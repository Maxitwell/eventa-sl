/**
 * Server-authoritative pricing for checkout. Never trust client-sent amounts or line prices.
 */

export type EventTicketTierLike = {
  name: string;
  quantity: number;
  price: number;
  isPrivate?: boolean;
  description?: string;
};

export type EventPricingSource = {
  price: number;
  totalCapacity?: number;
  capacity?: number;
  tickets?: EventTicketTierLike[];
  date?: string;
  time?: string;
  location?: string;
  title?: string;
};

export type PricedLine = {
  ticketName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type PricingResult = {
  eventId: string;
  lines: PricedLine[];
  totalAmount: number;
  eventName: string;
  eventDate: string;
  eventTime: string;
  eventLocation: string;
};

function norm(s: string): string {
  return s.trim().toLowerCase();
}

/**
 * Resolve cart lines against Firestore event data and compute totals.
 * Throws if tier is unknown, quantity invalid, or multi-event cart (caller must split).
 */
export function computeCheckoutPricing(
  eventId: string,
  requested: { ticketName: string; quantity: number }[],
  event: EventPricingSource
): PricingResult {
  if (!requested.length) {
    throw new Error("No tickets in order");
  }

  const eventName = event.title || "Event";
  const eventDate = event.date || "TBD";
  const eventTime = event.time || "TBD";
  const eventLocation = event.location || "TBD";

  const tiers = event.tickets;
  const lines: PricedLine[] = [];

  for (const row of requested) {
    if (row.quantity < 1) {
      throw new Error("Invalid quantity");
    }

    let unitPrice: number;

    if (!tiers || tiers.length === 0) {
      if (norm(row.ticketName) !== norm("General Admission")) {
        throw new Error(`Unknown ticket type: ${row.ticketName}`);
      }
      unitPrice = event.price ?? 0;
    } else {
      const tier = tiers.find((t) => norm(t.name) === norm(row.ticketName));
      if (!tier) {
        throw new Error(`Unknown ticket type: ${row.ticketName}`);
      }
      unitPrice = tier.price !== undefined ? tier.price : event.price ?? 0;
      if (row.quantity > tier.quantity) {
        throw new Error(`Not enough seats for ${tier.name}`);
      }
    }

    const lineTotal = unitPrice * row.quantity;
    lines.push({
      ticketName: row.ticketName,
      quantity: row.quantity,
      unitPrice,
      lineTotal,
    });
  }

  const totalAmount = lines.reduce((sum, l) => sum + l.lineTotal, 0);

  return {
    eventId,
    lines,
    totalAmount,
    eventName,
    eventDate,
    eventTime,
    eventLocation,
  };
}
