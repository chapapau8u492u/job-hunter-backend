
# JobTracker Backend

A Node.js backend API for the JobTracker Chrome Extension with real-time WebSocket support.

## Features

- REST API for job applications CRUD operations
- Real-time updates via WebSocket
- CORS support for Chrome extension
- In-memory storage (easily replaceable with database)

## Installation

```bash
cd backend
npm install
```

## Development

```bash
npm run dev
```

## Production

```bash
npm start
```

## API Endpoints

- `GET /api/applications` - Get all applications
- `POST /api/applications` - Create new application
- `PUT /api/applications/:id` - Update application
- `DELETE /api/applications/:id` - Delete application
- `GET /health` - Health check

## WebSocket Events

- `INITIAL_DATA` - Send current applications to new clients
- `NEW_APPLICATION` - Broadcast new application to all clients
- `APPLICATION_UPDATED` - Broadcast application updates
- `APPLICATION_DELETED` - Broadcast application deletions

## Environment Variables

- `PORT` - Server port (default: 3001)

## Deploy

This backend can be deployed to any Node.js hosting service like Heroku, Railway, or Render.
