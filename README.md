# Trailer Locator App

## Overview
A responsive web application for tracking trailer locations in a transport company yard using GPS coordinates.

## Features
- Capture and save trailer location with GPS coordinates
- Search for trailer location by trailer number
- Real-time location updates
- Responsive design for all devices

## Tech Stack
- Frontend:
  - React (with Vite)
  - TailwindCSS for styling
  - React Router for navigation
- Backend:
  - Supabase for:
    - User authentication
    - Real-time database
    - Location data storage
  - Geolocation API

## Prerequisites
1. Node.js and npm
2. Supabase account
3. Modern web browser with GPS capabilities

## Setup Instructions
1. Install Node.js from https://nodejs.org/
2. Clone the repository
3. Install dependencies: `npm install`
4. Create a Supabase project and add configuration
5. Run the development server: `npm run dev`

## Project Structure
```
trailer-locator/
├── src/
│   ├── components/    # Reusable UI components
│   ├── pages/        # Page components
│   ├── services/     # Supabase and API services
│   └── utils/        # Helper functions
├── public/           # Static assets
└── index.html        # Entry point
```

## Features to be Implemented
1. User Authentication
2. Trailer Location Recording
3. Search Functionality
4. Location History
5. Real-time Updates