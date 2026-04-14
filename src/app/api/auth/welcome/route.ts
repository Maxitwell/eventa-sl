import { NextResponse } from 'next/server';
import { sendSignupEmail } from '@/lib/delivery';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, name } = body;

        if (!email) {
            return NextResponse.json({ error: "Email is required" }, { status: 400 });
        }

        const success = await sendSignupEmail(email, name || "User");

        return NextResponse.json({ success });
    } catch (error) {
        console.error("Error triggering welcome email:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
