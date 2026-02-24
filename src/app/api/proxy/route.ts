import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const rawUrl = searchParams.get('url');

    if (!rawUrl) {
        console.error('[Proxy API] Bad Request: Missing URL parameter');
        return NextResponse.json({ error: 'URL parameter required' }, { status: 400 });
    }

    // We use the URL exactly as provided in the query parameter.
    // Next.js searchParams.get() already decodes the first level of encoding.
    // Do NOT perform further decoding as it may break encoded IDs in the path.
    const url = rawUrl;

    console.log(`[Proxy API] Proxying request to: ${url}`);

    try {
        if (!url.startsWith('http')) {
            throw new Error(`Invalid or missing protocol in URL: ${url}`);
        }

        const response = await fetch(url, {
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Origin': new URL(url).origin,
                'Referer': new URL(url).origin + '/'
            },
            cache: 'no-store',
            // @ts-ignore - timeout is supported in some node versions/fetch polyfills
            next: { revalidate: 0 }
        });

        if (!response.ok) {
            console.error(`[Proxy API] Upstream returned error: ${response.status} ${response.statusText} for ${url}`);
            return NextResponse.json(
                { error: 'Upstream Error', status: response.status, statusText: response.statusText },
                { status: response.status }
            );
        }

        const responseText = await response.text();
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (e) {
            console.error(`[Proxy API] Failed to parse JSON from ${url}. Response starts with: ${responseText.substring(0, 50)}`);
            return NextResponse.json(
                { error: 'Invalid JSON from upstream', details: 'Check if the addon is blocked by a firewall or returning HTML.' },
                { status: 502 }
            );
        }

        // Add permissive headers to the response
        return NextResponse.json(data, {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            }
        });
    } catch (error) {
        console.error(`[Proxy API] Fatal error for ${url}:`, error);
        return NextResponse.json(
            {
                error: 'Proxy Error',
                message: error instanceof Error ? error.message : String(error),
                target: url
            },
            {
                status: 500,
                headers: { 'Access-Control-Allow-Origin': '*' }
            }
        );
    }
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS() {
    return new NextResponse(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    });
}
