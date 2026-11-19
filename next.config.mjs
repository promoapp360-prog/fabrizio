/** @type {import('next').NextConfig} */
export default {
  allowedDevOrigins: ["*.replit.dev", ...(process.env.REPLIT_DEV_DOMAIN ? [process.env.REPLIT_DEV_DOMAIN] : [])],
  images: { remotePatterns: [{ protocol: "https", hostname: "**" }] },
  async headers() {
    return [{ source: "/(.*)", headers: [
      ...(process.env.NODE_ENV === "production" ? [{ key: "X-Frame-Options", value: "DENY" }] : []),
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    ]}];
  },
};
