// Load environment variables from .env
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS
app.use(cors());
app.use(express.json());

// Valid access keys stored securely on server (from .env)
const validKeys = process.env.ACCESS_KEYS 
    ? process.env.ACCESS_KEYS.split(",") 
    : [];

// API endpoint to validate access key
app.post("/api/validate-key", (req, res) => {
    const { accessKey } = req.body;
    
    if (validKeys.includes(accessKey.toUpperCase())) {
        const sessionToken = Date.now().toString(36) + Math.random().toString(36).substr(2);
        res.json({ success: true, token: sessionToken });
    } else {
        res.status(401).json({ success: false, message: "Invalid access key" });
    }
});

// Proxy endpoint for OpenRouter API (protects API key)
app.post("/api/openrouter", async (req, res) => {
    const { messages, model } = req.body;
    const apiKey = process.env.OPENROUTER_API_KEY;
    
    if (!apiKey) {
        return res.status(500).json({ error: "Server API key not configured" });
    }
    
    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
                "HTTP-Referer": req.headers.origin || "http://localhost:3000"
            },
            body: JSON.stringify({
                model: model || "openai/gpt-4o-mini",
                messages: messages
            })
        });
        
        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Serve static files from the root directory
app.use(express.static(__dirname));

// Serve decals folder
app.use("/decals", express.static(path.join(__dirname, "decals")));

// Fallback to index.html for SPA routing
app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
