import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    // CORS headers for all responses (including errors)
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Range, Content-Type, Origin, Accept',
        'Access-Control-Expose-Headers': 'Content-Range, Content-Length, Accept-Ranges',
    };

    if (!url) {
        return NextResponse.json({ error: 'Missing URL parameter' }, { status: 400, headers: corsHeaders });
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
            'Sec-Fetch-Dest': 'video',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Site': 'cross-site',
        };

        if (range) {
            headers['Range'] = range;
            console.log(`[STREAM-PROXY] Forwarding Range: ${range}`);
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

        if (!response.ok && response.status !== 206) {
            const errorText = await response.text().catch(() => 'No error body');
            console.error(`[STREAM-PROXY] Upstream error: ${response.status} ${response.statusText}`, errorText);

            return NextResponse.json({
                error: 'Upstream server error',
                status: response.status,
                statusText: response.statusText,
                details: errorText.substring(0, 500) // Truncate long error bodies
            }, {
                status: response.status >= 400 && response.status < 600 ? response.status : 502,
                headers: corsHeaders
            });
        }

        console.log(`[STREAM-PROXY] Upstream Success: ${response.status} ${response.statusText}`);

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

        // Ensure CORS is allowed (Overwrite any existing ones from upstream)
        Object.entries(corsHeaders).forEach(([k, v]) => responseHeaders.set(k, v));

        // Return the body as a stream
        // response.body is a ReadableStream in Next.js/Browser Fetch
        return new NextResponse(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: responseHeaders,
        });
    } catch (err: any) {
        if (err.name === 'AbortError') {
            console.error(`[STREAM-PROXY] Timeout for ${url}`);
            return NextResponse.json({
                error: 'Proxy Timeout',
                message: 'Source server took too long to respond (15s limit)'
            }, { status: 504, headers: corsHeaders });
        }

        console.error(`[STREAM-PROXY] Fatal error for ${url}:`, err);
        return NextResponse.json({
            error: 'Proxy Fatal Error',
            message: err instanceof Error ? err.message : String(err)
        }, { status: 500, headers: corsHeaders });
    }
}

export async function OPTIONS() {
    return new NextResponse(null, {
        status: 204, // Use 204 or 200 for preflight
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Range, Content-Type, Origin, Accept',
            'Access-Control-Max-Age': '86400',
        },
    });
}
