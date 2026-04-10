import { spawnSync } from "node:child_process";
import { createSerwistRoute } from "@serwist/turbopack";

// Determine a revision for precaching
const revision = spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf-8" }).stdout?.trim() ?? crypto.randomUUID();

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } = createSerwistRoute({
    // We can add the offline fallback page here if we create one later
    additionalPrecacheEntries: [{ url: "/", revision }], 
    swSrc: "src/sw.ts",
    useNativeEsbuild: true,
});
