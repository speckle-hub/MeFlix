import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
        return new NextResponse('Missing URL parameter', { status: 400 });
    }

    console.log(`[STREAM-PROXY] Request received for: ${url}`);
    const range = request.headers.get('range');

    try {
        const urlObj = new URL(url);
        const headers: Record<string, string> = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Referer': urlObj.origin + '/',
            'Origin': urlObj.origin,
            'Accept': '*/*',
        };

        if (range) {
            headers['Range'] = range;
            console.log(`[STREAM-PROXY] Range requested: ${range}`);
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

        const response = await fetch(url, {
            headers,
            cache: 'no-store',
            redirect: 'follow', // Explicitly follow redirects
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        console.log(`[STREAM-PROXY] Upstream Response: ${response.status} ${response.statusText}`);
        console.log(`[STREAM-PROXY] Upstream Content-Type: ${response.headers.get('content-type')}`);

        // Create headers for the proxied response
        const responseHeaders = new Headers();

        // Copy essential headers from upstream
        const headersToCopy = [
            'content-type',
            'content-length',
            'content-range',
            'accept-ranges',
            'cache-control',
            'last-modified',
            'etag'
        ];

        headersToCopy.forEach(h => {
            const val = response.headers.get(h);
            if (val) responseHeaders.set(h, val);
        });

        // Ensure CORS is allowed
        responseHeaders.set('Access-Control-Allow-Origin', '*');
        responseHeaders.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
        responseHeaders.set('Access-Control-Allow-Headers', 'Range, Content-Type');
        responseHeaders.set('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges');

        // Handle pre-flight/options if needed (though this is GET)

        return new NextResponse(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: responseHeaders,
        });
    } catch (err: any) {
        if (err.name === 'AbortError') {
            console.error(`[STREAM-PROXY] Timeout for ${url}`);
            return new NextResponse('Proxy Timeout: Source server took too long to respond', { status: 504 });
        }
        console.error(`[STREAM-PROXY] Fatal error for ${url}:`, err);
        return new NextResponse(`Proxy Error: ${err instanceof Error ? err.message : String(err)}`, { status: 500 });
    }
}

export async function OPTIONS() {
    return new NextResponse(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Range, Content-Type',
            'Access-Control-Max-Age': '86400',
        },
    });
}
