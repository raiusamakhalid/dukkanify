import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    /**
     * One host, and it is the only one this app is allowed to optimise from.
     *
     * `lib/imagery.ts` is the single place a URL on this host is written, so the pair is
     * closed: a photograph added anywhere else either lives here too or does not load. A
     * *generated* store's own `imageUrl` can be on any host in the world, which is exactly
     * why `product-grid.section.tsx` renders it with a plain `<img>` rather than adding the
     * open-ended pattern that would let anything through the optimiser.
     */
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
    ],
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
