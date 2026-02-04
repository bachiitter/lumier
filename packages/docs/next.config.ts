import { withContentCollections } from "@content-collections/next";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
};

export default withContentCollections(nextConfig);
