import type { NextConfig } from "next";

// /api is proxied by the route handler at src/app/api/[...path]/route.ts, not by
// a rewrite here: rewrite destinations are resolved during `next build` and
// baked into routes-manifest.json, which would freeze the backend address into
// the image just as NEXT_PUBLIC_API_URL did.
const nextConfig: NextConfig = {
  output: 'standalone',
};

export default nextConfig;
