// API/animal.js
import { Client } from "@petfinder/petfinder-js";
import { analyzePetImages } from './gemini.js';
//import { generateMatchDescription } from './gemini.js';
import axios from 'axios';
import dotenv from "dotenv";

dotenv.config();

const petfinder = new Client({
    apiKey: process.env.PETFINDER_KEY,
    secret: process.env.PETFINDER_SECRET || ""
});

const locationApiKey = process.env.GEOLOCATION_KEY;

export const getRandomPet = async (photoURLS) => {
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
        

        //const photoUrl = animal.photos[0].medium;
        //console.log(`photoUrl: ${photoUrl}`)

        const apiSuggestion = await analyzePetImages(photoURLS);
        console.log("\n===== GEMINI ANALYSIS =====");
        console.log(apiSuggestion);
        return getNearByPetsBySuggestion(apiSuggestion)

    } catch (error) {
        console.error("Error:", error.message);
        if (error.stack) console.error(error.stack);
    }
}


export const getNearByPetsBySuggestion = async (apiSuggestion) => {
    try {
        const response = await axios.post('https://www.googleapis.com/geolocation/v1/geolocate?key=' + locationApiKey);
        const location = response.data.location;
        const latitude = location.lat;
        const longitude = location.lng;
        const traitPriority = ['color', 'coat', 'age', 'size', 'type'];
        console.log("looking for a pet..");
        let parsedAI;
        try {
            const cleaned = cleanAIResponse(apiSuggestion);
            parsedAI = JSON.parse(cleaned);
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
                    distance: 100,
                });
                const totalCount = shelterResponse.data.pagination.total_count;
                const results = shelterResponse.data.animals;
                console.log(results);
                return { results, totalCount };
            } catch (err) {
                console.error("Search error:", err.message);
                return { results: [], totalCount: 0 };
            }
        };

        let { results, totalCount } = await searchPets(filters);
        let i = 0;

        while (totalCount === 0 && i < traitPriority.length - 1) {
            const traitToRemove = traitPriority[i];
            removed.push(traitToRemove);
            delete filters[traitToRemove];

            ({ results, totalCount } = await searchPets(filters));
            i++;
        }

        if (totalCount > 0) {
            //const petsWithDescriptions = await generateMatchDescription(results);
            //return petsWithDescriptions; 
            return results

        } else {
            console.warn("No pets found after relaxing all filters.");
        }
    } catch (error) {
        console.error('Error getting user location:', error);
    }
};

const generateMatchDescriptions = async (results) => {
        try {
            const descriptions = [];

            for (let i = 0; i < results.length; i++) {
                const pet = results[i];
                const description = pet.description; 
                if (typeof description !== 'string') {
                    description = description ? JSON.stringify(description) : 'No description available.';
                }
                const geminiDescription = await generateDescription(description);
                descriptions.push(geminiDescription);
            }

            const matchedPetsWithDescriptions = results.map((pet, index) => ({
                ...pet,  
                matchDescription: descriptions[index]  
            }));

            return matchedPetsWithDescriptions; 
        } catch (error) {
            console.error("Error generating descriptions:", error);
            return []; 
        }
};

const cleanAIResponse = (text) => {
    text = text.replace(/^\s*```(?:json)?\s*/i, '');
    text = text.replace(/\s*```$/i, '');
    text = text.replace(/[\u200B-\u200D\uFEFF]/g, '');
    const jsonMatch = text.match(/{[\s\S]*}/);
    if (jsonMatch) {
        return jsonMatch[0].trim();
    }
    return text.trim();
};
