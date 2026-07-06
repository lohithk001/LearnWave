import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken, getTokenFromRequest } from '@/lib/auth';
import { mkdir, writeFile, readdir, unlink } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function POST(req: NextRequest) {
    try {
        const token = getTokenFromRequest(req);
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const decoded = await verifyToken(token);
        if (!decoded) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }
        const userId = decoded.userId;

        // Parse FormData
        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        // Enforce max file size check (2MB)
        if (file.size > 2 * 1024 * 1024) {
            return NextResponse.json({ error: 'File size exceeds 2MB limit' }, { status: 400 });
        }

        // Validate image mimetype
        if (!file.type.startsWith('image/')) {
            return NextResponse.json({ error: 'Uploaded file is not an image' }, { status: 400 });
        }

        // Determine extension
        const originalName = file.name || 'avatar.jpg';
        const fileExtension = originalName.split('.').pop()?.toLowerCase() || 'jpg';
        
        let avatarUrl = '';

        // Try local file storage first (standard for local development)
        try {
            const avatarsDir = join(process.cwd(), 'public', 'uploads', 'avatars');
            await mkdir(avatarsDir, { recursive: true });

            // Cleanup old avatars for this user to save space
            try {
                if (existsSync(avatarsDir)) {
                    const files = await readdir(avatarsDir);
                    for (const filename of files) {
                        if (filename.startsWith(userId + '_')) {
                            await unlink(join(avatarsDir, filename)).catch(() => {});
                        }
                    }
                }
            } catch (err) {
                console.error('Failed to clean up old avatars:', err);
            }

            // Save new file
            const timestamp = Date.now();
            const newFileName = `${userId}_${timestamp}.${fileExtension}`;
            const filePath = join(avatarsDir, newFileName);

            const bytes = await file.arrayBuffer();
            await writeFile(filePath, Buffer.from(bytes));

            avatarUrl = `/uploads/avatars/${newFileName}`;
        } catch (localWriteError) {
            console.warn('Read-only local storage detected (expected on Vercel). Falling back to Base64 in DB:', localWriteError);
            
            // Fall back to Base64 data URL
            const bytes = await file.arrayBuffer();
            const buffer = Buffer.from(bytes);
            const base64Data = buffer.toString('base64');
            avatarUrl = `data:${file.type};base64,${base64Data}`;
        }

        // Update database user_profiles
        await db.user_profiles.upsert({
            where: { user_id: userId },
            update: {
                avatar_url: avatarUrl
            },
            create: {
                user_id: userId,
                first_name: 'User',
                last_name: '',
                avatar_url: avatarUrl
            }
        });

        return NextResponse.json({
            success: true,
            avatarUrl
        });
    } catch (error) {
        console.error('Avatar upload error:', error);
        return NextResponse.json({
            error: 'Failed to upload avatar'
        }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const token = getTokenFromRequest(req);
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const decoded = await verifyToken(token);
        if (!decoded) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }
        const userId = decoded.userId;

        // Try removing old files from filesystem if possible
        try {
            const avatarsDir = join(process.cwd(), 'public', 'uploads', 'avatars');
            if (existsSync(avatarsDir)) {
                const files = await readdir(avatarsDir);
                for (const filename of files) {
                    if (filename.startsWith(userId + '_')) {
                        await unlink(join(avatarsDir, filename)).catch(() => {});
                    }
                }
            }
        } catch (err) {
            console.warn('Could not delete old avatars on filesystem (ignoring since we may be on serverless):', err);
        }

        // Update database to null
        await db.user_profiles.update({
            where: { user_id: userId },
            data: {
                avatar_url: null
            }
        });

        return NextResponse.json({
            success: true,
            avatarUrl: null
        });
    } catch (error) {
        console.error('Avatar delete error:', error);
        return NextResponse.json({
            error: 'Failed to delete avatar'
        }, { status: 500 });
    }
}
