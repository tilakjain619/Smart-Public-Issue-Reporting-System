# Smart Community Issue Reporting System

> A full-stack web application for citizens to report community issues with GPS location, AI categorization, and real-time admin management. Built for smart cities and civic engagement.

## Problem Statement

Urban communities often face challenges in reporting and managing local issues such as potholes, broken streetlights, and sanitation problems. Traditional reporting methods are inefficient, leading to delayed responses and unresolved issues. There is a need for a streamlined, user-friendly platform that enables citizens to report issues easily while providing administrators with tools to manage and resolve them effectively.

## Solution

Jagruk is a web application that allows citizens to report local issues with GPS-tagged locations and AI-powered categorization. The platform features an interactive map for visualizing reported issues, a dashboard for administrators to track and manage reports, and community voting to prioritize resolutions. Built with React, Node.js, and MongoDB, the system integrates services like Appwrite for authentication, Cloudinary for image handling, and OpenRouter AI for issue categorization.

## Features

- **Smart Reporting**: GPS-tagged issue reporting with AI-powered categorization
- **Interactive Maps**: Leaflet-based geolocation and visualization
- **Analytics Dashboard**: Charts and statistics for administrators
- **Community Voting**: Citizens can vote to prioritize issues
- **Role-based Access**: User, Officer (coming soon), and Admin permissions
- **Activity Logging**: Complete audit trails

## Tech Stack

**Frontend:** React 19.1.1, Vite, Tailwind CSS, Leaflet Maps, Chart.js  
**Backend:** Node.js, Express.js, MongoDB, Mongoose  
**Services:** Appwrite (Auth), Cloudinary (Images), OpenRouter AI, OpenCage Geocoding

### System Architecture

![System Architecture Diagram](./docs/Jagruk_Diagram.png)

*Overview of the Smart Community Issue Reporting System's technical architecture, showing the React frontend, Node.js backend, MongoDB database, and external service integrations.*

## Quick Setup

**Prerequisites:** Node.js 16+, MongoDB, Git

```bash
# Clone and setup backend
git clone https://github.com/tilakjain619/Smart-Community-Issue-Reporting-System.git
cd Smart-Community-Issue-Reporting-System/backend
npm install
cp .env.example .env  # Configure your API keys
npm run dev

# Setup frontend (new terminal)
cd ../frontend
npm install
cp .env.example .env  # Configure endpoints
npm run dev
```

### Environment Variables

Setup your `.env` files with the following variables:

**Backend (.env):**
```env
# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/smart-community
# Server Configuration
PORT=3000

# Appwrite Configuration
APPWRITE_ENDPOINT=https://fra.cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=
APPWRITE_API_KEY=

CLOUD_NAME=
CLOUD_API_KEY=
CLOUD_API_SECRET=

OPENROUTER_API_KEY=
OPENCAGE_API_KEY=

MAIL_ENABLED=true
MAILJET_SENDER_EMAIL=
MAILJET_API_ENDPOINT=https://api.mailjet.com/v3.1/send
MAILJET_API_KEY=
MAILJET_SECRET_KEY=
```

**Frontend (.env):**
```env
VITE_BACKEND_URL=http://localhost:3000
VITE_APPWRITE_ENDPOINT=your_appwrite_endpoint
VITE_APPWRITE_PROJECT_ID=your_appwrite_project_id
```

Access: Frontend at `http://localhost:5173`, Backend at `http://localhost:3000`

## API Endpoints

- `GET /api/issues` - Get all issues
- `POST /api/issues` - Create new issue (requires auth)
- `PUT /api/issues/:id/status` - Update status (requires auth)
- `GET /api/issues/search` - Search/filter issues
- `GET /api/logs` - Get activity logs (admin)
- `POST /api/upload` - Upload images (requires auth)