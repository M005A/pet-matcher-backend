import http from 'http';
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import path from 'path';
import { fileURLToPath } from 'url';
import { Client } from "@petfinder/petfinder-js";
import url from 'url';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const parentDir = path.resolve(__dirname, '..');

dotenv.config();

// Gemini setup
const gemini_api_key = process.env.GEMINI_KEY;
console.log("Gemini API Key:", gemini_api_key ? "Found API key" : "No API key found");

const googleAI = new GoogleGenerativeAI(gemini_api_key);

// Create a Gemini Vision model (for image analysis)
const visionModel = googleAI.getGenerativeModel({
  model: "gemini-1.5-flash",  // Changed from "gemini-1.5-pro-vision" to the standard model name
  generationConfig: {      
    temperature: 0.7,
    maxOutputTokens: 256,
  }
});

const petfinder = new Client({
  apiKey: process.env.PETFINDER_KEY,
  secret: process.env.PETFINDER_SECRET || "" 
});
console.log("Petfinder API Key:", process.env.PETFINDER_KEY ? "Found API key" : "No API key found");

const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    const query = parsedUrl.query;

    if (pathname === '/petfinder') {
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
                `);
                
                if (photoUrl) {
                    res.write(`
                        <div>
                            <img src="${photoUrl}" alt="${animal.name}" style="max-width: 300px;">
                            <br>
                            <button onclick="analyzePhoto('${photoUrl}')">Analyze with Gemini Vision</button>
                            <div id="analysisResult" style="margin-top: 15px; padding: 10px; border: 1px solid #ccc; display: none;"></div>
                        </div>
                        <script>
                            function analyzePhoto(photoUrl) {
                                fetch('/analyze-pet-photo?photoUrl=' + encodeURIComponent(photoUrl))
                                    .then(response => response.json())
                                    .then(data => {
                                        const resultElement = document.getElementById('analysisResult');
                                        resultElement.textContent = data.description;
                                        resultElement.style.display = 'block';
                                    })
                                    .catch(error => {
                                        console.error('Error:', error);
                                        alert('Error analyzing photo');
                                    });
                            }
                        </script>
                    `);
                }
                
                res.write(`
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
    } else if (pathname === '/analyze-pet-photo') {
        try {
            const photoUrl = query.photoUrl;
            
            if (!photoUrl) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'No photo URL provided' }));
                return;
            }
            
            // Download the image as a buffer
            const imageResponse = await axios.get(photoUrl, { responseType: 'arraybuffer' });
            const imageBuffer = Buffer.from(imageResponse.data);
            
            // Convert the buffer to a base64 string
            const base64Image = imageBuffer.toString('base64');
            
            // Call Gemini Vision API
            const result = await visionModel.generateContent([
                "Describe this pet in 2-3 sentences. Focus on breed, color, and any visible physical characteristics. Keep it friendly and positive.",
                { inlineData: { data: base64Image, mimeType: imageResponse.headers['content-type'] } }
            ]);
            
            const description = result.response.text();
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ description }));
            
        } catch (error) {
            console.log("Gemini Vision API Error:", error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Error analyzing image' }));
        }
    } else {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.write('<h1>Pet Matcher</h1>');
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

