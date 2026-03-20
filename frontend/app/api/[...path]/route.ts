import { NextRequest } from 'next/server';

const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || 'http://localhost:3000';

async function proxy(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  request: NextRequest,
  params: Promise<{ path: string[] }>,
) {
  const { path } = await params;
  const pathname = path.join('/');
  const searchParams = request.nextUrl.searchParams.toString();
  const url = `${BACKEND_URL}/${pathname}${searchParams ? `?${searchParams}` : ''}`;

  const headers = new Headers();
  request.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (lower === 'host' || lower === 'content-length') return;
    headers.set(key, value);
  });

  const init: RequestInit = {
    method,
    headers,
  };

  if (method === 'POST' || method === 'PUT') {
    const body = await request.arrayBuffer();
    init.body = body;
  }

  const response = await fetch(url, init);
  const data = await response.arrayBuffer();

  const responseHeaders = new Headers();
  response.headers.forEach((value, key) => {
    if (key.toLowerCase() === 'content-length') return;
    responseHeaders.set(key, value);
  });

  return new Response(data, {
    status: response.status,
    headers: responseHeaders,
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  return proxy('GET', request, params);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  return proxy('POST', request, params);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  return proxy('PUT', request, params);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  return proxy('DELETE', request, params);
}
