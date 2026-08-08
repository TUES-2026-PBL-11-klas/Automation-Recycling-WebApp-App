import { NextRequest } from 'next/server';

// Forwards /api/* to the backend from the server side, so the browser only ever
// talks to the origin that served the page.
//
// This is a route handler rather than a next.config.ts rewrite on purpose:
// rewrite destinations are resolved during `next build` and written into
// routes-manifest.json, so the backend address would be frozen into the image
// exactly the way NEXT_PUBLIC_API_URL was. Here it is read per request, so one
// image runs in development, docker-compose and Kubernetes unchanged.
export const dynamic = 'force-dynamic';

function backendOrigin(): string {
  return process.env.BACKEND_ORIGIN ?? 'http://localhost:4000';
}

async function proxy(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  const incoming = new URL(request.url);
  const target = new URL(`${backendOrigin()}/${path.join('/')}`);
  target.search = incoming.search;

  const headers = new Headers(request.headers);
  // Recomputed by fetch; forwarding the originals corrupts the upstream request.
  headers.delete('host');
  headers.delete('content-length');
  headers.delete('connection');

  const hasBody = request.method !== 'GET' && request.method !== 'HEAD';

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: request.method,
      headers,
      body: hasBody ? await request.arrayBuffer() : undefined,
      redirect: 'manual',
      cache: 'no-store',
    });
  } catch {
    return Response.json(
      { message: 'The API is unavailable. Please try again shortly.' },
      { status: 502 },
    );
  }

  const responseHeaders = new Headers(upstream.headers);
  // Set by the runtime for the response we are constructing; copying the
  // upstream values would describe a body that no longer matches.
  responseHeaders.delete('content-encoding');
  responseHeaders.delete('content-length');
  responseHeaders.delete('transfer-encoding');

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
