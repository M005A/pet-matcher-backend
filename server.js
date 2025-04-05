import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import { Client } from "@petfinder/petfinder-js";
import axios from 'axios';

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

async function analyzeRandomPet() {
    try {
        console.log("Fetching a random pet from Petfinder...");
        
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

        if (!animal) {
            console.log("Could not find any animals with photos after multiple attempts.");
            return;
        }

        console.log("\n===== PET DETAILS =====");
        console.log(`Name: ${animal.name}`);
        console.log(`Type: ${animal.type}`);
        console.log(`Breed: ${animal.breeds.primary}`);
        console.log(`Age: ${animal.age}`);
        console.log(`Gender: ${animal.gender}`);
        
        const photoUrl = animal.photos[0].medium;
        console.log(`Photo URL: ${photoUrl}`);

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
                text: `Analyze this image of a pet and suggest a Petfinder query to find similar pets. Use only these categories in your response: type, size, and age (baby, young, adult, senior). Provide the query in raw JSON format with NO markdown formatting, just the pure JSON itself.`
            }
        ];

        const result = await visionModel.generateContent({
            contents: [{ role: "user", parts }]
        });

        // Clean up the response if needed
        let apiSuggestion = result.response.text();
        apiSuggestion = apiSuggestion.replace(/^```json\s*/i, '');
        apiSuggestion = apiSuggestion.replace(/\s*```$/i, '');


            console.log("\n===== GEMINI ANALYSIS =====");
            console.log(apiSuggestion);

    } catch (error) {
        console.error("Error:", error.message);
        if (error.stack) console.error(error.stack);
    }
}

// Run the main function
console.log("Starting Pet Matcher Backend...");
analyzeRandomPet().then(() => {
    console.log("\nProcess complete. Run again with 'npm run dev' to analyze another pet.");
});

