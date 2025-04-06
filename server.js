import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import { Client } from "@petfinder/petfinder-js";
import axios from 'axios';



dotenv.config();

const gemini_api_key = process.env.GEMINI_KEY;
console.log("Gemini API Key:", gemini_api_key ? "Found API key" : "No API key found");

const googleAI = new GoogleGenerativeAI(gemini_api_key);
const locationApiKey = process.env.GEOLOCATION_KEY;

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
                text: `Analyze this image of a pet and suggest a Petfinder query to find similar pets. Use only these categories in your response: type (e.g. dog, cat, bird), size, age (baby, young, adult, senior), coat (short, medium, long, wire, hairless, curly), and color (ONLY ONE, EXACTLY AS FOLLOWING: Apricot / Beige, Bicolor, Black, Brindle, Brown / Chocolate, Golden, Gray / Blue / Silver, Harlequin, Merle (Blue),  Merle (Red), Red / Chestnut / Orange, Sable, Tricolor (Brown, Black, & White), White / Cream, Yellow / Tan / Blond / Fawn ). Return only a valid JSON object with these properties. Do not include code blocks, explanations, or formatting � just pure JSON.`                //text: `Analyze this image of a pet and suggest a Petfinder query to find similar pets. Use only these categories in your response: type (dog,cat,bird,etc), size, and age (baby, young, adult, senior). Provide the query in raw JSON format with NO markdown formatting, just the pure JSON itself.`
            }
        ];

        const result = await visionModel.generateContent({
            contents: [{ role: "user", parts }]
        });

        let apiSuggestion = result.response.text();
        apiSuggestion = apiSuggestion.replace(/^```json\s*/i, '');
        apiSuggestion = apiSuggestion.replace(/\s*```$/i, '');


        console.log("\n===== GEMINI ANALYSIS =====");
        console.log(apiSuggestion);
        GetNearByPetsBySuggestion(apiSuggestion)

    } catch (error) {
        console.error("Error:", error.message);
        if (error.stack) console.error(error.stack);
    }
}


function cleanAIResponse(text) {
    
    text = text.replace(/^\s*```(?:json)?\s*/i, '');
    text = text.replace(/\s*```$/i, '');
    text = text.replace(/[\u200B-\u200D\uFEFF]/g, '');
    const jsonMatch = text.match(/{[\s\S]*}/);
    if (jsonMatch) {
        return jsonMatch[0].trim();
    }

    return text.trim(); // fallback
}
async function GetNearByPetsBySuggestion(apiSuggestion) {
    try {
        const response = await axios.post('https://www.googleapis.com/geolocation/v1/geolocate?key=' + locationApiKey);
        const location = response.data.location;
        const latitude = location.lat;
        const longitude = location.lng;
        const traitPriority = ['color', 'coat', 'age', 'size', 'type'];
            

        console.log(`User's location is: Latitude: ${latitude}, Longitude: ${longitude}`);
        let parsedAI;
        try {
            const cleaned = cleanAIResponse(apiSuggestion);
            parsedAI = JSON.parse(cleaned);
            console.log(cleaned)
        } catch (err) {
            console.error("Invalid JSON from AI:", err);
        }

        let filters = { ...parsedAI };
        let removed = [];
        const searchPets = async (filters) => {
            try {
                const shelterResponse = await petfinder.animal.search({
                    ...filters,
                    location: `${latitude},${longitude}`,
                    distance: 20, 
                });
                const totalCount = shelterResponse.data.pagination.total_count;
                const results = shelterResponse.data.animals;
                return { results, totalCount };
            } catch (err) {
                console.error("Search error:", err.message);
                return { results: [], totalCount: 0 };
            }
        };

        let { results, totalCount } = await searchPets(filters);

        let i = 0;
        console.log("total:count" + totalCount);
        while (totalCount === 0 && i < traitPriority.length - 1) { 
            const traitToRemove = traitPriority[i];
            removed.push(traitToRemove);
            delete filters[traitToRemove]; 
            console.log(`No results � removed least important trait: ${traitToRemove}`);

            ({ results, totalCount } = await searchPets(filters));
            i++;
        }

        if (totalCount > 0) {
            console.log(`Found ${results.length} pets with filters:`, filters);
            console.log(results); 
            return results;
        } else {
            console.warn("No pets found after relaxing all filters.");
        }

    } catch (error) {
        console.error('Error getting user location:', error);
    }
}

//Run the main function
console.log("Starting Pet Matcher Backend...");
analyzeRandomPet().then(() => {
    console.log("\nProcess complete. Run again with 'npm run dev' to analyze another pet.");
});

