import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
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

export const analyzePetImage = async (photoUrl) => {
    try {
  
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
                text: `Analyze this image of a pet and suggest a Petfinder query to find similar pets. Use only these categories in your response: type (e.g. dog, cat, bird), size, age (baby, young, adult, senior), coat (short, medium, long, wire, hairless, curly), and color (ONLY ONE, EXACTLY AS FOLLOWING: Apricot / Beige, Bicolor, Black, Brindle, Brown / Chocolate, Golden, Gray / Blue / Silver, Harlequin, Merle (Blue),  Merle (Red), Red / Chestnut / Orange, Sable, Tricolor (Brown, Black, & White), White / Cream, Yellow / Tan / Blond / Fawn ). Return only a valid JSON object with these properties. Do not include code blocks, explanations, or formatting — just pure JSON.`                //text: `Analyze this image of a pet and suggest a Petfinder query to find similar pets. Use only these categories in your response: type (dog,cat,bird,etc), size, and age (baby, young, adult, senior). Provide the query in raw JSON format with NO markdown formatting, just the pure JSON itself.`
            }
        ];

        const result = await visionModel.generateContent({
            contents: [{ role: "user", parts }]
        });

        let apiSuggestion = result.response.text();
        apiSuggestion = apiSuggestion.replace(/^```json\s*/i, '');
        apiSuggestion = apiSuggestion.replace(/\s*```$/i, '');

        return apiSuggestion
        

    } catch (error) {
        console.error("Error:", error.message);
        if (error.stack) console.error(error.stack);
    }
}