import dotenv from "dotenv";
import { getRandomPet } from './api/animal.js';

dotenv.config();


getRandomPet().then(() => {
    console.log("\nProcess complete. Run again with 'npm run dev' to analyze another pet.");
});

