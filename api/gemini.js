import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import axios from 'axios';

dotenv.config();

const gemini_api_key = process.env.GEMINI_KEY;
console.log("Gemini API Key:", gemini_api_key ? "Found API key" : "No API key found");

const googleAI = new GoogleGenerativeAI(gemini_api_key);
const GEMINI_API_URL = "https://generativeai.googleapis.com/v1beta3/models/gemini-1.5:generateText"; 


const visionModel = googleAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 256,
    }
});

export const analyzePetImages = async (photoUrls) => {
    try {

        const parts = await Promise.all(photoUrls.map(async (photoUrl) => {
            const imageResponse = await axios.get(photoUrl, { responseType: 'arraybuffer' });
            const imageBuffer = Buffer.from(imageResponse.data);
            const base64Image = imageBuffer.toString('base64');
            return {
                inlineData: {
                    data: base64Image,
                    mimeType: imageResponse.headers['content-type']
                }
            };
        }));

        parts.push({
            text: `A user is looking to adop one pet. The user picked these images as a perference. Analyze all these images of pets and suggest a Petfinder query to find one similar pet based on all the common characteristics across all images. Consider a pet the user is likely to adopt. Consider personality traits as well. Use only these categories in your response: type (e.g. dog, cat, hamster, rabbit), size, age (baby, young, adult, senior), coat (short, medium, long, wire, hairless, curly), and color (ONLY ONE, EXACTLY AS FOLLOWING: Apricot / Beige, Bicolor, Black, Brindle, Brown / Chocolate, Golden, Gray / Blue / Silver, Harlequin, Merle (Blue),  Merle (Red), Red / Chestnut / Orange, Sable, Tricolor (Brown, Black, & White), White / Cream, Yellow / Tan / Blond / Fawn ). Return only a valid JSON object with these properties. Do not include code blocks, explanations, or formatting � just pure JSON.`
        });

        const result = await visionModel.generateContent({
            contents: [{ role: "user", parts }]
        });

        let apiSuggestion = result.response.text();
        apiSuggestion = apiSuggestion.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
        return apiSuggestion


    } catch (error) {
        console.error("Error:", error.message);
        if (error.stack) console.error(error.stack);
    }
};

export async function generateDescription(petDescription) {
    try {
        const model = googleAI.getGenerativeModel({ model: "gemini-pro" });
        
        const prompt = `
            As an expert pet adoption specialist, create a friendly, engaging, and concise description for this pet 
            based on the information provided. Make it personal, highlighting the pet's unique qualities, 
            personality traits, and what kind of home would be good for them. 
            Keep it under 200 words and focus on positive attributes.
            
            Pet information: ${petDescription}
        `;
        
        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text();
        
        return text;
    } catch (error) {
        console.error("Error generating pet description:", error);
        return "This lovable pet is looking for a forever home! Contact the shelter to learn more about this adorable companion.";
    }
}