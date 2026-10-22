// Pour tester sur téléphone en Wi-Fi pendant le dev : ajoute l'IP de ton PC dans
// DEV_ORIGINS (ex : DEV_ORIGINS=192.168.1.42) dans .env.local
const devOrigins = (process.env.DEV_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  allowedDevOrigins: devOrigins,
};

export default nextConfig;
