import express from 'express';

const app = express();
const port = 3000;

app.get('/', (req, res) => {
    res.send('Hello World!');
});


app.get('/submitForm', (req, res) => {
    //getting 10 images
    const {urls , location} = req.body;

    try {
        const matched_pet = getNearByPetsBySuggestion(urls)
        return matched_pet

    } catch (err) {
        return err
    }
    
});

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});

