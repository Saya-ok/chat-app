import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import Pages from "vite-plugin-pages";

export default defineConfig({
    plugins: [
        react(),
        Pages({
            // default options work; for React you can leave it minimal
            dirs: "src/pages", // where to look for page components
            extensions: ["jsx", "tsx"],
            importMode(filepath) {
                // optional: sync vs async loading based on path
                return "sync";
            },
        }),
    ],
});
