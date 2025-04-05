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

const gemini_api_key = process.env.GEMINI_KEY;
console.log("Gemini API Key:", gemini_api_key ? "Found API key" : "No API key found");

const googleAI = new GoogleGenerativeAI(gemini_api_key);

const visionModel = googleAI.getGenerativeModel({
    model: "gemini-1.5-flash",
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

// // Fix the function to print all breeds to console
// async function printAllBreeds() {
//     try {
//         console.log("Fetching and printing all breeds from Petfinder API...");

//         // Get animal types first
//         const typesResponse = await petfinder.animalData.types();
//         const animalTypes = typesResponse.data.types;

//         // For each animal type, get and print its breeds
//         for (const type of animalTypes) {
//             console.log(`\nTYPES: === ${type.name.toUpperCase()} BREEDS ===`);

//             // Using the correct method to get breeds
//             const breedResponse = await petfinder.animalData.breeds(type.name);
//             const breeds = breedResponse.data.breeds;



//             // Print each breed name
//             breeds.forEach((breed, index) => {
//                 console.log(`${index + 1}. ${breed.name}`);
//             });
//         }

//     } catch (error) {
//         console.error("Error fetching breeds:", error.message);
//     }

// }

// //printAllBreeds();

const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    const query = parsedUrl.query;

    if (pathname === '/breeds') {
        try {
            const animalType = query.type || 'dog';
            const breedResponse = await petfinder.animalData.breeds(animalType);
            const breeds = breedResponse.data.breeds;

            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.write(`
                <html>
                <head>
                    <title>All ${animalType} Breeds - Petfinder</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 20px; }
                        h1 { color: #333; }
                        .breeds-container { 
                            display: grid; 
                            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                            gap: 10px;
                        }
                        .breed-item {
                            padding: 10px;
                            background-color: #f5f5f5;
                            border-radius: 5px;
                        }
                        .type-selector {
                            margin-bottom: 20px;
                        }
                        .type-selector a {
                            margin-right: 10px;
                            padding: 5px 10px;
                            background-color: #e0e0e0;
                            border-radius: 3px;
                            text-decoration: none;
                            color: #333;
                        }
                        .type-selector a.active {
                            background-color: #4CAF50;
                            color: white;
                        }
                    </style>
                </head>
                <body>
                    <h1>All ${animalType.charAt(0).toUpperCase() + animalType.slice(1)} Breeds</h1>
                    
                    <div class="type-selector">
                        <a href="/breeds?type=dog" class="${animalType === 'dog' ? 'active' : ''}">Dogs</a>
                        <a href="/breeds?type=cat" class="${animalType === 'cat' ? 'active' : ''}">Cats</a>
                        <a href="/breeds?type=rabbit" class="${animalType === 'rabbit' ? 'active' : ''}">Rabbits</a>
                        <a href="/breeds?type=bird" class="${animalType === 'bird' ? 'active' : ''}">Birds</a>
                        <a href="/breeds?type=horse" class="${animalType === 'horse' ? 'active' : ''}">Horses</a>
                        <a href="/">Back to Home</a>
                    </div>
                    
                    <p>Total Breeds: ${breeds.length}</p>
                    
                    <div class="breeds-container">
            `);

            // Display all breeds
            breeds.forEach(breed => {
                res.write(`<div class="breed-item">${breed.name}</div>`);
            });

            res.write(`
                    </div>
                </body>
                </html>
            `);

            res.end();
        } catch (error) {
            console.log("Petfinder Breeds API Error:", error);
            res.writeHead(500, { 'Content-Type': 'text/html' });
            res.write('<h1>Error fetching breeds from Petfinder</h1>');
            res.write(`<p>${error.message}</p>`);
            res.end();
        }
    } else if (pathname === '/petfinder') {
        try {
            let animal = null;
            let attempts = 0;
            const maxAttempts = 5;

            while (!animal && attempts < maxAttempts) {
                attempts++;
                console.log(`Attempt ${attempts} to find an animal with photos`);

                const response = await petfinder.animal.search({
                    limit: 10,
                    page: Math.floor(Math.random() * 5) + 1,
                    status: 'adoptable',
                    sort: 'random',
                    has_photos: true
                });

                animal = response.data.animals.find(a => a.photos && a.photos.length > 0);

                if (!animal && response.data.animals.length > 0) {
                    console.log(`Found ${response.data.animals.length} animals, but none have photos. Trying again...`);
                }
            }

            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.write('<h1>Petfinder API Response</h1>');

            if (animal) {
                console.log("Animal data:", JSON.stringify(animal.photos, null, 2));

                const photoUrl = animal.photos && animal.photos.length > 0
                    ? animal.photos[0].medium
                    : null;

                console.log("Photo URL:", photoUrl);

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
                            <img src="${photoUrl}" alt="${animal.name}" style="max-width: 300px;" onerror="this.onerror=null; this.src='https://placehold.co/300x200?text=No+Image+Available'; console.error('Image failed to load');">
                            <br>
                            <button onclick="analyzePhoto('${photoUrl}')">Analyze with Gemini Vision</button>
                            <div id="analysisResult" style="margin-top: 15px; padding: 10px; border: 1px solid #ccc; display: none;"></div>
                        </div>
                        <script>
                            function analyzePhoto(photoUrl) {
                                console.log("Analyzing photo:", photoUrl);
                                document.getElementById('analysisResult').innerHTML = 'Analyzing pet image...';
                                document.getElementById('analysisResult').style.display = 'block';
                                
                                fetch('/analyze-pet-photo?photoUrl=' + encodeURIComponent(photoUrl))
                                    .then(response => response.json())
                                    .then(data => {
                                        const resultElement = document.getElementById('analysisResult');
                                        if (data.validJson) {
                                            try {
                                                // Try to format it nicely if it's JSON
                                                const jsonObj = JSON.parse(data.description);
                                                resultElement.innerHTML = '<h3>Suggested Petfinder Query:</h3>' +
                                                    '<pre>' + JSON.stringify(jsonObj, null, 2) + '</pre>' +
                                                    '<button onclick="findSimilarPets(' + JSON.stringify(data.description) + ')">Find Similar Pets</button>';
                                            } catch (e) {
                                                resultElement.innerHTML = '<h3>Suggested Petfinder Query:</h3><p>' + data.description + '</p>';
                                            }
                                        } else {
                                            resultElement.innerHTML = '<h3>AI Analysis:</h3><p>' + data.description + '</p>';
                                        }
                                        resultElement.style.display = 'block';
                                    })
                                    .catch(error => {
                                        console.error('Error:', error);
                                        document.getElementById('analysisResult').innerHTML = 'Error analyzing photo: ' + error;
                                    });
                            }

                            function findSimilarPets(queryParams) {
                                alert('This would search for similar pets using: ' + JSON.stringify(queryParams));
                            }
                        </script>
                    `);
                } else {
                    res.write(`<p><strong>No photo available for this pet</strong></p>`);
                }

                res.write(`
                        <p><strong>Description:</strong> ${animal.description || 'No description available'}</p>
                    </div>
                `);
            } else {
                res.write('<p>Could not find animals with photos after multiple attempts. Please try again.</p>');
                res.write('<p><a href="/petfinder">Try Again</a></p>');
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

            const imageResponse = await axios.get(photoUrl, { responseType: 'arraybuffer' });
            const imageBuffer = Buffer.from(imageResponse.data);

            const base64Image = imageBuffer.toString('base64');

            const parts = [
                {
                    inlineData: {
                        data: base64Image,
                        mimeType: imageResponse.headers['content-type']
                    }
                },
                {
                    text: `Analyze this image of a pet and suggest a Petfinder query to find similar pets by using only these categories: type, size, and age (baby, young, adult, senior). Provide the query in raw JSON format with NO Markdown formatting (no \`\`\`json and no \`\`\` delimiters), just the pure JSON itself. Make sure there are spaces if there are two works in the breed name. For example, "Domestic Shorthair" should be written as "Domestic Short Hair".`,
                }
            ];

            const result = await visionModel.generateContent({
                contents: [{ role: "user", parts }]
            });

            let apiSuggestion = result.response.text();            
            apiSuggestion = apiSuggestion.replace(/^```json\s*/i, '');
            apiSuggestion = apiSuggestion.replace(/\s*```$/i, '');
            
            console.log("Cleaned API suggestion:", apiSuggestion);

            let parsedSuggestion;


            // Send back the analysis
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                description: apiSuggestion,
                validJson: !!parsedSuggestion
            }));

        } catch (error) {
            console.log("Gemini Vision API Error:", error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Error analyzing image: ' + error.message }));
        }
    } else if (pathname.startsWith('/img-proxy/')) {
        try {
            const imageUrl = decodeURIComponent(pathname.replace('/img-proxy/', ''));
            const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });

            res.writeHead(200, {
                'Content-Type': response.headers['content-type'],
                'Content-Length': response.data.length
            });
            res.end(response.data);
        } catch (error) {
            console.log("Image proxy error:", error);
            res.writeHead(404);
            res.end();
        }
    } else {
        // Update the home page to include a link to the breeds page
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.write('<h1>Pet Matcher</h1>');
        res.write('<p><a href="/petfinder">See a random pet from Petfinder</a></p>');
        res.write('<p><a href="/breeds">See all pet breeds</a></p>');
        res.end();
    }
});

const port = 3000;

// Start the server
server.listen(port, () => {
    console.log(`Node.js HTTP server is running on port ${port}`);
    console.log(`Visit http://localhost:${port} in your browser`);
});

