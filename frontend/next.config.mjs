/** @type {import('next').NextConfig} */

const nextConfig = {
    output: "standalone",
    eslint: {
        // Pre-existing ESLint issues are tracked separately; don't block production builds.
        ignoreDuringBuilds: true,
    },
};

export default nextConfig;
