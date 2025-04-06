// API/animal.js
import { Client } from "@petfinder/petfinder-js";
import { analyzePetImages } from './gemini.js';
import { generateDescription } from './gemini.js';
import axios from 'axios';
import dotenv from "dotenv";

dotenv.config();

const petfinder = new Client({
    apiKey: process.env.PETFINDER_KEY,
    secret: process.env.PETFINDER_SECRET || ""
});

const locationApiKey = process.env.GEOLOCATION_KEY;

export const getRandomPet = async (photoURLS,location) => {
    try {
     
        const apiSuggestion = await analyzePetImages(photoURLS);
        console.log("\n===== GEMINI ANALYSIS =====");
        console.log(apiSuggestion);
        return getNearByPetsBySuggestion(apiSuggestion,location);

    } catch (error) {
        console.error("Error:", error.message);
        if (error.stack) console.error(error.stack);
    }
}


export const getNearByPetsBySuggestion = async (apiSuggestion,location) => {
    try {
        const latitude = location.latitude;
        const longitude = location.longitude;
        const traitPriority = ['color', 'coat', 'age', 'size', 'type'];
        console.log("looking for a pet..");
        let parsedAI;
        try {
            console.log("PLUH", apiSuggestion);
            const cleaned = cleanAIResponse(apiSuggestion);

            parsedAI = JSON.parse(cleaned);
            console.log(parsedAI);
        } catch (err) {
            console.error("Invalid JSON from AI:", err);
        }

        let filters = { ...parsedAI };
        let removed = [];
        const searchPets = async (filters) => {
            try {
                console.log("Searching for pets with filters:", filters);
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
            const petsWithDescriptions = await generateMatchDescriptions(results);
            return petsWithDescriptions[0]; 

        } else {
            console.warn("No pets found after relaxing all filters.");
        }
    } catch (error) {
        console.error('Error getting user location:', error);
    }
};


const getOrganizationName = async (orgId) => {

    try {
        const orgRes = await petfinder.organization.show(orgId);
        return orgRes.data.organization.name;
    } catch (err) {
        console.error(`Failed to fetch organization for ${orgId}:`, err.message);
        return "Unknown Shelter";
    }
};



const generateMatchDescriptions = async (results) => {
        try {
            for (let i = 0; i < results.length; i++) {
                const pet = results[i];
                let description = pet.description;
                if (typeof description !== 'string') {
                    description = description ? JSON.stringify(description) : 'No description available.';
                }

                const geminiDescription = await generateDescription(description);
                const shelterName = await getOrganizationName(pet.organization_id);
                pet.AIDescription = geminiDescription;
                pet.ShelterName = shelterName
            }

            return results;
        } catch (error) {
            console.error("Error generating descriptions:", error);
            return []; 
        }
};

const cleanAIResponse = (text) => {
    console.log("text", text);
    text = text.replace(/^\s*```(?:json)?\s*/i, '');
    text = text.replace(/\s*```$/i, '');
    text = text.replace(/[\u200B-\u200D\uFEFF]/g, '');
    const jsonMatch = text.match(/{[\s\S]*}/);
    if (jsonMatch) {
        return jsonMatch[0].trim();
    }
    return text.trim();
};
