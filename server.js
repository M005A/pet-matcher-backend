const express = require('express');
const serverless = require('serverless-http');

const app = express();

app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.get('/submitForm', async (req, res) => {
    console.log("Query Params: ", req.query);

    const { urls, location } = req.query;

    const parsedUrls = JSON.parse(urls);
    const parsedLocation = JSON.parse(location);

    try {
        const matched_pet = await getRandomPet(parsedUrls, parsedLocation);
        res.json(matched_pet);
    } catch (err) {
        console.error("Error getting matched pet:", err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = app;
module.exports.handler = serverless(app);  // <-- This is what Vercel uses
