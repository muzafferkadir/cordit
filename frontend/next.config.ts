import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // API routes handle proxying to backend
  // Socket.io needs special handling - using http-proxy-middleware is not possible in Next.js
  // So we'll expose backend for socket.io only
};

export default nextConfig;
