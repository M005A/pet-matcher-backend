import express from 'express';
import { getRandomPet } from './api/animal.js';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.get('/submitForm', async (req, res) => {
    console.log("Query Params: ", req.query);

    const { urls, location } = req.query;

    try {
        const parsedUrls = JSON.parse(urls);
        const parsedLocation = JSON.parse(location);

        console.log("Parsed URLs: ", parsedUrls);
        console.log("Parsed Location: ", parsedLocation);

        const matched_pet = await getRandomPet(parsedUrls, parsedLocation);
        console.log("Matched Pet: ", matched_pet);
        res.json(matched_pet);
    } catch (err) {
        console.error("Error getting matched pet:", err);
        res.status(500).json({ error: err.message });
    }
});

export default app;
