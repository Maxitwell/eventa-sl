import { Metadata } from 'next';
import { getEventById } from '@/lib/db';
import EventDetailsClient from './page.client';

interface Props {
    params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { id } = await params;
    const event = await getEventById(id);

    if (!event) {
        return {
            title: 'Event Not Found | Eventa',
            description: 'The event you are looking for does not exist.',
        };
    }

    const title = `${event.title} | Eventa SL`;
    const description = event.description?.slice(0, 160) || `Get tickets for ${event.title} on Eventa SL.`;

    return {
        title,
        description,
        openGraph: {
            title,
            description,
            images: [
                {
                    url: event.image || 'https://eventa-sl.com/og-image.jpg', // Fallback image assuming standard domain
                    width: 1200,
                    height: 630,
                    alt: event.title,
                }
            ],
            type: 'website',
            siteName: 'Eventa SL'
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description,
            images: [event.image || 'https://eventa-sl.com/og-image.jpg'],
        }
    };
}

export default async function EventDetailsPage({ params }: Props) {
    const { id } = await params; // although not passed down currently, awaiting to prevent potential warnings
    // The actual interactive UI is pushed to the client component to preserve hook functionality (toast, modals, tracking)
    return <EventDetailsClient />;
}
