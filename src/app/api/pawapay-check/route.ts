import { NextResponse } from 'next/server';

const PAWAPAY_API_BASE = process.env.PAWAPAY_API_URL ?? 'https://api.pawapay.io/v1';

// Temporary diagnostic endpoint — remove after debugging
export async function GET() {
    try {
        const res = await fetch(`${PAWAPAY_API_BASE}/active-configuration`, {
            headers: {
                Authorization: `Bearer ${process.env.PAWAPAY_API_KEY}`,
            },
        });
        const data = await res.json();
        return NextResponse.json({ status: res.status, data });
    } catch (err) {
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}
