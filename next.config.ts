import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // There is an unrelated package-lock.json in the home directory above this
  // project, which makes Next guess the wrong workspace root. Pin it.
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
