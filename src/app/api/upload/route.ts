import { NextResponse } from 'next/server';
import { getAdminAuth, getAdminStorage } from '@/lib/firebase-admin';

export async function POST(request: Request) {
    try {
        const authHeader = request.headers.get("authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const idToken = authHeader.slice("Bearer ".length);
        const decoded = await getAdminAuth().verifyIdToken(idToken);

        const formData = await request.formData();
        const file = formData.get('file') as File;
        const userId = decoded.uid;
        
        if (!file) {
            return NextResponse.json({ error: 'Missing file' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const bucket = getAdminStorage().bucket();
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
