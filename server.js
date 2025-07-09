
const express = require('express');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB connection
let db;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://jobhunter:jobhunter123@cluster0.nujsn.mongodb.net/jobhunter?retryWrites=true&w=majority';

MongoClient.connect(MONGODB_URI)
  .then(client => {
    console.log('Connected to MongoDB');
    db = client.db('jobhunter');
  })
  .catch(error => console.error('MongoDB connection error:', error));

// Enhanced CORS configuration
app.use(cors({
  origin: [
    'https://1184ee33-d0e8-423e-944b-df4cd74b576b.lovableproject.com',
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'https://preview--application-ace-platform.lovable.app',
    /\.lovableproject\.com$/,
    /\.lovable\.app$/
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept', 'Origin', 'Authorization'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));

// Add preflight handling
app.options('*', cors());

// ... keep existing code (all the route handlers)

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
