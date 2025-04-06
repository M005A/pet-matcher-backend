# Pet Matcher Backend API

This repository contains the backend API for the Pet Matcher application.

## Development Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file with required API keys:
   ```
   GEMINI_KEY=your_gemini_key
   PETFINDER_KEY=your_petfinder_key
   PETFINDER_SECRET=your_petfinder_secret
   GEOLOCATION_KEY=your_geolocation_key
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

## API Endpoints

- `POST /api/submit-images` - Submit selected pet images for matching

## Deployment

This API is designed to be deployed on Vercel. See the main [DEPLOYMENT.md](../DEPLOYMENT.md) for detailed instructions.

Important: Make sure to configure your environment variables in the Vercel dashboard.