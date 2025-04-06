import express from 'express';
import { getRandomPet } from './api/animal.js';  // Adjust the import path as needed
import cors from 'cors';

const app = express();
app.use(cors()); // Allow all origins by default
app.use(express.json()); // If using POST/PUT and req.body

const port = 5000;

app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.get('/submitForm', async (req, res) => {
    // Access query parameters from the URL
    console.log("Query Params: ", req.query);

    const { urls, location } = req.query;

    // Since they are passed as strings, parse them back into the correct format
    const parsedUrls = JSON.parse(urls);  // Convert back to array
    const parsedLocation = JSON.parse(location);  // Convert back to object

    console.log("Parsed URLs: ", parsedUrls);
    console.log("Parsed Location: ", parsedLocation);

    try {
        const matched_pet = await getRandomPet(parsedUrls, parsedLocation);  // Await async function
        console.log("Matched Pet: ", matched_pet);
        res.json(matched_pet);  // Send the result back
    } catch (err) {
        console.error("Error getting matched pet:", err);
        res.status(500).json({ error: err.message });
    }
});


app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
})
