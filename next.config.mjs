/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      // Leaves room for multipart form overhead; document actions still enforce
      // a strict 10 MB file limit in application code.
      bodySizeLimit: "12mb",
    },
  },
};

export default nextConfig;
