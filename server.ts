import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;
  const isProd = process.env.NODE_ENV === "production";

  console.log(`Starting server in ${isProd ? 'PRODUCTION' : 'DEVELOPMENT'} mode`);

  // API routes can go here
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", mode: isProd ? 'production' : 'development' });
  });

  // Vite middleware for development
  if (!isProd) {
    console.log("Using Vite middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // In production, serve the built files from dist
    const distPath = path.join(process.cwd(), 'dist');
    console.log(`Serving static files from: ${distPath}`);
    
    // Check if dist exists, if not, log error
    app.use(express.static(distPath));
    
    // Crucial: Handle SPA routing by returning index.html for all non-file requests
    app.get('*', (req, res) => {
      const indexPath = path.join(distPath, 'index.html');
      res.sendFile(indexPath, (err) => {
        if (err) {
          console.error(`Error sending index.html from ${indexPath}:`, err);
          res.status(404).send("Error: Aplicación no compilada. Por favor, intenta de nuevo en unos momentos.");
        }
      });
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
