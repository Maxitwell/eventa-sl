import { NextResponse } from 'next/server';
import { getStorage } from 'firebase-admin/storage';
import { initializeApp, getApps, cert } from 'firebase-admin/app';

if (!getApps().length) {
    initializeApp({
        credential: cert({
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
    });
}

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const userId = formData.get('userId') as string;
        
        if (!file || !userId) {
            return NextResponse.json({ error: 'Missing file or userId' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const bucket = getStorage().bucket();
        const fileName = `events/${userId}/${Date.now()}_${file.name}`;
        const fileRef = bucket.file(fileName);
        
        // Generate a random UUID for the Firebase token
        const uuid = crypto.randomUUID();

        await fileRef.save(buffer, {
            metadata: {
                contentType: file.type,
                metadata: {
                    firebaseStorageDownloadTokens: uuid
                }
            }
        });
        
        // Construct the standard Firebase Storage download URL
        const encodedFileName = encodeURIComponent(fileName);
        const url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodedFileName}?alt=media&token=${uuid}`;
        
        return NextResponse.json({ url });
    } catch (error) {
        console.error('API Upload Error:', error);
        return NextResponse.json({ error: 'Failed to upload to storage' }, { status: 500 });
    }
}
