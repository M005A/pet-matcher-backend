import http from 'http';
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import path from 'path';
import { fileURLToPath } from 'url';
import { Client } from "@petfinder/petfinder-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const parentDir = path.resolve(__dirname, '..');

dotenv.config();

// Gemini setup
const gemini_api_key = process.env.GEMINI_KEY;
console.log("Gemini API Key:", gemini_api_key ? "Found API key" : "No API key found");

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

const petfinder = new Client({
  apiKey: process.env.PETFINDER_KEY,
  secret: process.env.PETFINDER_SECRET || "" 
});
console.log("Petfinder API Key:", process.env.PETFINDER_KEY ? "Found API key" : "No API key found");

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
    } else if (req.url === '/petfinder') {
        try {
            const response = await petfinder.animal.search({
                limit: 1,
                page: Math.floor(Math.random() * 10) + 1 
            });
            
            const animal = response.data.animals[0];
            
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.write('<h1>Petfinder API Response</h1>');
            
            if (animal) {
                const photoUrl = animal.photos && animal.photos.length > 0 
                    ? animal.photos[0].medium 
                    : null;
                
                res.write(`
                    <div style="margin-bottom: 20px;">
                        <h2>${animal.name}</h2>
                        <p><strong>Type:</strong> ${animal.type}</p>
                        <p><strong>Breed:</strong> ${animal.breeds.primary}</p>
                        <p><strong>Age:</strong> ${animal.age}</p>
                        <p><strong>Gender:</strong> ${animal.gender}</p>
                        <p><strong>Status:</strong> ${animal.status}</p>
                        ${photoUrl ? `<img src="${photoUrl}" alt="${animal.name}" style="max-width: 300px;">` : ''}
                        <p><strong>Description:</strong> ${animal.description || 'No description available'}</p>
                    </div>
                `);
            } else {
                res.write('<p>No animals found</p>');
            }
            
            res.end();
        } catch (error) {
            console.log("Petfinder API Error:", error);
            res.writeHead(500, { 'Content-Type': 'text/html' });
            res.write('<h1>Error fetching response from Petfinder</h1>');
            res.write(`<p>${error.message}</p>`);
            res.end();
        }
    } else {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.write('<h1>Hello, Node.js HTTP Server!</h1>');
        res.write('<p><a href="/gemini">See Gemini API response</a></p>');
        res.write('<p><a href="/petfinder">See a random pet from Petfinder</a></p>');
        res.end();
    }
});

const port = 3000;

// Start the server
server.listen(port, () => {
    console.log(`Node.js HTTP server is running on port ${port}`);
    console.log(`Visit http://localhost:${port} in your browser`);
});

