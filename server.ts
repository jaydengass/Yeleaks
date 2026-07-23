import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import fs from "fs";
import { GoogleAuth } from "google-auth-library";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(express.json());

  const corsOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['*'];
  app.use((req, res, next) => {
    const origin = req.headers.origin || '*';
    const allowed = corsOrigins.includes('*') || corsOrigins.includes(origin) || corsOrigins.includes(origin.replace(/\/$/, ''));
    res.setHeader('Access-Control-Allow-Origin', allowed ? origin : '*');
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(204).end();
    next();
  });

  const getServiceAccountConfig = () => {
    const envJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (envJson) {
      try { return { credentials: JSON.parse(envJson) }; } catch { /* ignore */ }
    }
    const serviceAccountPath = path.join(process.cwd(), "firebase-service-account.json");
    if (fs.existsSync(serviceAccountPath)) {
      return { keyFile: serviceAccountPath };
    }
    return null;
  };

  // API Route to fetch projects from Firestore directly using service account
  app.get("/api/projects", async (req, res) => {
    try {
      const serviceAccountConfig = getServiceAccountConfig();
      if (!serviceAccountConfig) {
        return res.status(501).json({
          success: false,
          error: "Missing firebase-service-account.json or FIREBASE_SERVICE_ACCOUNT_JSON env."
        });
      }

      const auth = new GoogleAuth({
        ...serviceAccountConfig,
        scopes: ["https://www.googleapis.com/auth/datastore"]
      });

      const client = await auth.getClient();
      const { token } = (await client.getAccessToken()) as any;

      const firestoreRes = await fetch(
        `https://firestore.googleapis.com/v1/projects/yeleaks/databases/(default)/documents/projects`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (!firestoreRes.ok) {
        const text = await firestoreRes.text();
        return res.status(500).json({
          success: false,
          error: `Firestore error: ${firestoreRes.status} ${text.slice(0, 500)}`
        });
      }

      const data = await firestoreRes.json();
      const projects = (data.documents || []).map((doc: any) => {
        const fields = doc.fields || {};
        const url = fields.url?.stringValue || "";
        return {
          _docId: doc.name.split("/").pop() || url,
          url,
          linkType: url.startsWith("https://untitled.stream/") ? "UNTITLED" : undefined,
          title: fields.title?.stringValue || undefined,
          artist: fields.artist?.stringValue || undefined,
          platform: fields.platform?.stringValue || undefined,
          allowDownloads: fields.allowDownloads?.booleanValue ?? fields.allowDownloads?.stringValue,
          createdAt: fields.createdAt?.stringValue || undefined,
          lastChanged: fields.lastChanged?.stringValue || undefined,
          lastChecked: fields.lastChecked?.stringValue || undefined,
          nextRefresh: fields.nextRefresh?.stringValue || undefined,
          refreshTime: fields.refreshTime?.integerValue ?? fields.refreshTime?.doubleValue,
          refreshesNotChanged: fields.refreshesNotChanged?.integerValue ?? fields.refreshesNotChanged?.doubleValue,
          exists: fields.exists?.booleanValue,
          fingerprint: fields.fingerprint?.stringValue || undefined,
          viewCount: fields.viewCount?.integerValue ?? fields.viewCount?.doubleValue,
          visibility: fields.visibility?.stringValue || undefined,
          streamUrl: fields.streamUrl?.stringValue || undefined,
          artworkUrl: fields.artworkUrl?.stringValue || undefined,
          tracksCount: fields.tracksCount?.integerValue ?? fields.tracksCount?.doubleValue,
          duration: fields.duration?.stringValue || undefined,
          tracks: fields.tracks?.arrayValue?.values?.map((t: any) => {
            const tFields = t.mapValue?.fields || {};
            return {
              num: tFields.num?.integerValue ?? tFields.num?.doubleValue,
              title: tFields.title?.stringValue || "",
              date: tFields.date?.stringValue || "",
              audioUrl: tFields.audioUrl?.stringValue || "",
              format: tFields.format?.stringValue || undefined,
              duration: tFields.duration?.integerValue ?? tFields.duration?.doubleValue,
              dateAdded: tFields.dateAdded?.stringValue || undefined
            };
          }) || []
        };
      });

      res.json({ success: true, projects });
    } catch (error: any) {
      console.error("Error in /api/projects Firestore read:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Unknown error"
      });
    }
  });

  // Fetch full project metadata (tracks, artwork, title, artist) for a specific untitled.stream URL
  app.get("/api/project-metadata", async (req, res) => {
    try {
      const urlParam = req.query.url as string;
      if (!urlParam) {
        return res.status(400).json({ success: false, error: "Missing url parameter" });
      }

      const proxyWorkerUrl = `https://proxy.jayden-gass10.workers.dev/?url=${encodeURIComponent(urlParam)}`;
      console.log(`Fetching project metadata from worker: ${proxyWorkerUrl}`);

      const response = await fetch(proxyWorkerUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "application/json"
        }
      });

      if (!response.ok) {
        throw new Error(`Worker responded with status: ${response.status}`);
      }

      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error("Error in /api/project-metadata:", error.message);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Batch fetch metadata for multiple URLs
  app.get("/api/projects-metadata", async (req, res) => {
    try {
      const urlsParam = req.query.urls as string;
      if (!urlsParam) {
        return res.status(400).json({ success: false, error: "Missing urls parameter" });
      }

      let urls: string[];
      try {
        urls = JSON.parse(decodeURIComponent(urlsParam));
      } catch (parseError) {
        console.error("Failed to parse URLs:", parseError);
        return res.status(400).json({ success: false, error: "Invalid URLs parameter format" });
      }
      
      if (!Array.isArray(urls) || urls.length === 0) {
        return res.status(400).json({ success: false, error: "urls must be a non-empty array" });
      }

      console.log(`Fetching metadata for ${urls.length} projects from worker`);
      console.log(`URLs: ${urls.slice(0, 3).join(', ')}${urls.length > 3 ? '...' : ''}`);

      const results = await Promise.allSettled(
        urls.map(async (url: string, index: number) => {
          if (!url || typeof url !== 'string' || url.trim() === '') {
            console.log(`Skipping empty URL at index ${index}`);
            return null;
          }
          
          const proxyWorkerUrl = `https://proxy.jayden-gass10.workers.dev/?url=${encodeURIComponent(url)}`;
          console.log(`Fetching from worker: ${proxyWorkerUrl}`);
          
          try {
            const response = await fetch(proxyWorkerUrl, {
              headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "application/json"
              }
            });

            console.log(`Worker response status: ${response.status}`);
            console.log(`Worker response content-type: ${response.headers.get("content-type")}`);

            if (!response.ok) {
              const errorText = await response.text();
              console.log(`Worker error response: ${errorText.substring(0, 500)}`);
              throw new Error(`Worker responded with status: ${response.status} - ${errorText.substring(0, 200)}`);
            }

            const contentType = response.headers.get("content-type") || "";
            if (!contentType.includes("application/json")) {
              const text = await response.text();
              console.log(`Worker returned non-JSON: ${text.substring(0, 200)}`);
              throw new Error(`Worker returned non-JSON response: ${text.substring(0, 100)}`);
            }

            const data = await response.json();
            return { url, data };
          } catch (fetchError: any) {
            console.log(`Fetch error for ${url}: ${fetchError.message}`);
            throw fetchError;
          }
        })
      );

      const projects = results
        .filter((result): result is PromiseFulfilledResult<{ url: string; data: any }> => result.status === 'fulfilled')
        .map(result => ({
          url: result.value.url,
          project: result.value.data.project || null
        }));

      res.json({
        success: true,
        projects
      });
    } catch (error: any) {
      console.error("Error in /api/projects-metadata:", error.message);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Proxy endpoint to load untitled.stream inside the iframe by bypassing CSP & X-Frame-Options
  app.get("/api/embed-proxy", async (req, res) => {
    try {
      const targetUrl = req.query.url as string;
      if (!targetUrl) {
        return res.status(400).send("Missing url parameter");
      }

      console.log(`Proxying iframe request for: ${targetUrl}`);
      const response = await fetch(targetUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.5"
        }
      });

      if (!response.ok) {
        return res.status(response.status).send(`Failed to fetch target URL: ${response.statusText}`);
      }

      const contentType = response.headers.get("content-type") || "";
      
      // Copy response headers, stripping out security restrictions
      response.headers.forEach((value, name) => {
        const lowerName = name.toLowerCase();
        if (
          lowerName !== "x-frame-options" &&
          lowerName !== "content-security-policy" &&
          lowerName !== "content-length" &&
          lowerName !== "transfer-encoding"
        ) {
          res.setHeader(name, value);
        }
      });

      // Grant permissive CORS
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
      
      if (contentType.includes("text/html")) {
        let html = await response.text();
        
        // Inject <base href="https://untitled.stream/"> into the HTML head
        // This causes the browser to fetch relative assets (JS, CSS, static files) from the original domain
        if (html.includes("<head>")) {
          html = html.replace("<head>", `<head>\n  <base href="https://untitled.stream/">`);
        } else if (html.includes("<head ")) {
          html = html.replace(/<head\s*[^>]*>/, (match) => `${match}\n  <base href="https://untitled.stream/">`);
        } else {
          html = `<base href="https://untitled.stream/">\n` + html;
        }
        
        res.send(html);
      } else {
        const buffer = await response.arrayBuffer();
        res.send(Buffer.from(buffer));
      }
    } catch (error: any) {
      console.error("Error in embed-proxy:", error.message);
      res.status(500).send(`Error proxying iframe contents: ${error.message}`);
    }
  });

  // Report endpoint: writes to Firestore reports collection via service account
  app.post("/api/report", async (req, res) => {
    try {
      const serviceAccountConfig = getServiceAccountConfig();
      if (!serviceAccountConfig) {
        return res.status(501).json({
          success: false,
          error: "Report endpoint not configured. Set FIREBASE_SERVICE_ACCOUNT_JSON or place firebase-service-account.json in project root."
        });
      }

      const { url, title, complaint, createdAt } = req.body || {};
      if (!complaint || typeof complaint.trim !== "function" || !complaint.trim()) {
        return res.status(400).json({ success: false, error: "Complaint is required." });
      }

      const auth = new GoogleAuth({
        ...serviceAccountConfig,
        scopes: ["https://www.googleapis.com/auth/datastore"]
      });

      const client = await auth.getClient();
      const { token } = (await client.getAccessToken()) as any;

      const response = await fetch(
        `https://firestore.googleapis.com/v1/projects/yeleaks/databases/(default)/documents/reports`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            fields: {
              url: { stringValue: url || "" },
              title: { stringValue: title || "" },
              complaint: { stringValue: complaint.trim() },
              createdAt: { stringValue: createdAt || new Date().toISOString() }
            }
          })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        return res.status(500).json({ success: false, error: `Firestore error: ${errorText}` });
      }

      const result = await response.json();
      res.json({ success: true, id: result.name });
    } catch (error: any) {
      console.error("Error in /api/report:", error);
      res.status(500).json({ success: false, error: error.message || "Unknown error" });
    }
  });

  // Audio proxy: play same-origin, server fetches upstream for CORS-blocked audio hosts
  const ALLOWED_AUDIO_HOSTS = new Set([
    "sb.untitled.stream"
  ]);

  app.get("/api/audio-proxy", async (req, res) => {
    try {
      const targetUrl = req.query.url as string;
      if (!targetUrl) {
        return res.status(400).json({ success: false, error: "Missing url parameter" });
      }

      let parsedUrl: URL;
      try {
        parsedUrl = new URL(targetUrl);
      } catch {
        return res.status(400).json({ success: false, error: "Invalid url parameter" });
      }

      if (!ALLOWED_AUDIO_HOSTS.has(parsedUrl.hostname)) {
        return res.status(403).json({ success: false, error: "Audio host not allowed" });
      }

      const response = await fetch(targetUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          "Accept": "audio/*,*/*;q=0.1"
        },
        redirect: "follow"
      });

      if (!response.ok) {
        const text = await response.text();
        console.error(`Upstream audio error ${response.status}:`, text.slice(0, 200));
        return res.status(response.status).json({
          success: false,
          error: `Upstream audio error: ${response.status} ${response.statusText}`
        });
      }

      const contentType = response.headers.get("content-type") || "application/octet-stream";
      if (!contentType.startsWith("audio/") && !contentType.includes("octet-stream")) {
        const text = await response.text();
        console.error(`Unexpected audio content-type ${contentType}:`, text.slice(0, 200));
        return res.status(502).json({
          success: false,
          error: `Invalid audio content-type: ${contentType}`
        });
      }

      res.setHeader("Content-Type", contentType);
      res.setHeader("Accept-Ranges", "bytes");
      response.body?.pipe(res);
    } catch (error: any) {
      console.error("Error in /api/audio-proxy:", error.message);
      res.status(500).json({ success: false, error: error.message || "Unknown audio proxy error" });
    }
  });

  // Generic proxy for ArtistGrid/TrackerHub to bypass CORS
  const ARTISTGRID_HOSTS = new Set([
    "trackerapi.artistgrid.cx",
    "trackerapi-1.artistgrid.cx",
    "trackerapi-2.artistgrid.cx",
    "trackerapi-3.artistgrid.cx",
    "fuck-unvaulted.artistgrid.cx",
    "info.artistgrid.cx"
  ]);

  app.get("/api/proxy", async (req, res) => {
    try {
      const targetUrl = req.query.url as string;
      if (!targetUrl) {
        return res.status(400).json({ success: false, error: "Missing url parameter" });
      }

      let parsedUrl: URL;
      try {
        parsedUrl = new URL(targetUrl);
      } catch {
        return res.status(400).json({ success: false, error: "Invalid url parameter" });
      }

      if (!ARTISTGRID_HOSTS.has(parsedUrl.hostname)) {
        return res.status(403).json({ success: false, error: "Proxy host not allowed" });
      }

      const response = await fetch(targetUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          "Accept": "application/json,text/plain,*/*"
        },
        redirect: "follow"
      });

      if (!response.ok) {
        const text = await response.text();
        return res.status(response.status).json({
          success: false,
          error: `Proxy error: ${response.status} ${response.statusText}`,
          body: text.slice(0, 500)
        });
      }

      const contentType = response.headers.get("content-type") || "application/json";
      res.setHeader("Content-Type", contentType);
      const text = await response.text();
      try {
        res.json(JSON.parse(text));
      } catch {
        res.send(text);
      }
    } catch (error: any) {
      console.error("Error in /api/proxy:", error.message);
      res.status(500).json({ success: false, error: error.message || "Unknown proxy error" });
    }
  });

  // Vite middleware setup for development, static serve for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Reddit Grid Server] Running on http://localhost:${PORT}`);
  });
}

startServer();
