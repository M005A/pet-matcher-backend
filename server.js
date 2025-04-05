import http from 'http';
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const parentDir = path.resolve(__dirname, '..');

dotenv.config();

if (!process.env.API_KEY) {
  console.log("API key not found in current directory, trying parent directory...");
  dotenv.config({ path: path.resolve(parentDir, '.env') });
}

const gemini_api_key = process.env.API_KEY;
console.log("API Key:", gemini_api_key ? "Found API key" : "No API key found");

if (!gemini_api_key) {
  console.log("Current directory:", __dirname);
  console.log("Parent directory:", parentDir);
  console.log("All env variables:", process.env);
}

const googleAI = new GoogleGenerativeAI(gemini_api_key);

const geminiModel = googleAI.getGenerativeModel({
  model: "gemini-1.5-pro", 
  generationConfig: {      
    temperature: 0.9,
    topP: 1,
    topK: 1,
    maxOutputTokens: 4096,
  }
});

const server = http.createServer(async (req, res) => {
    if (req.url === '/gemini') {
        try {
            const prompt = "Tell me about google.";
            const result = await geminiModel.generateContent(prompt);
            const response = result.response;
            
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.write(`<h1>Gemini API Response</h1><p>${response.text()}</p>`);
            res.end();
        } catch (error) {
            console.log("Gemini API Error:", error);
            res.writeHead(500, { 'Content-Type': 'text/html' });
            res.write('<h1>Error fetching response from Gemini</h1>');
            res.end();
        }
    } else {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.write('<h1>Hello, Node.js HTTP Server!</h1>');
        res.write('<p><a href="/gemini">See Gemini API response</a></p>');
        res.end();
    }
});

const port = 3000;

// Start the server
server.listen(port, () => {
    console.log(`Node.js HTTP server is running on port ${port}`);
    console.log(`Visit http://localhost:${port} in your browser`);
});

