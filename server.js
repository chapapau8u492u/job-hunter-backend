
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

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Routes

// Get all resumes
app.get('/api/resumes', async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Database not connected' });
    }

    const resumes = await db.collection('resumes').find({}).toArray();
    console.log('Fetched resumes from DB:', resumes.length);
    
    // Transform resumes to include proper title
    const transformedResumes = resumes.map(resume => ({
      id: resume._id.toString(),
      title: resume.title || `${resume.personalInfo?.firstName || 'Untitled'} ${resume.personalInfo?.lastName || ''} Resume`.trim(),
      ...resume
    }));
    
    res.json({ resumes: transformedResumes });
  } catch (error) {
    console.error('Error fetching resumes:', error);
    res.status(500).json({ error: 'Failed to fetch resumes' });
  }
});

// Create a new resume
app.post('/api/resumes', async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Database not connected' });
    }

    const resume = {
      ...req.body,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection('resumes').insertOne(resume);
    const createdResume = await db.collection('resumes').findOne({ _id: result.insertedId });
    
    res.status(201).json({
      data: {
        id: createdResume._id.toString(),
        ...createdResume,
        _id: undefined
      }
    });
  } catch (error) {
    console.error('Error creating resume:', error);
    res.status(500).json({ error: 'Failed to create resume' });
  }
});

// Update a resume
app.put('/api/resumes/:id', async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Database not connected' });
    }

    const { id } = req.params;
    const updateData = {
      ...req.body,
      updatedAt: new Date()
    };

    const result = await db.collection('resumes').updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Resume not found' });
    }

    const updatedResume = await db.collection('resumes').findOne({ _id: new ObjectId(id) });
    
    res.json({
      data: {
        id: updatedResume._id.toString(),
        ...updatedResume,
        _id: undefined
      }
    });
  } catch (error) {
    console.error('Error updating resume:', error);
    res.status(500).json({ error: 'Failed to update resume' });
  }
});

// Delete a resume
app.delete('/api/resumes/:id', async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Database not connected' });
    }

    const { id } = req.params;
    const result = await db.collection('resumes').deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Resume not found' });
    }

    res.json({ message: 'Resume deleted successfully' });
  } catch (error) {
    console.error('Error deleting resume:', error);
    res.status(500).json({ error: 'Failed to delete resume' });
  }
});

// Get all applications
app.get('/api/applications', async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Database not connected' });
    }

    const applications = await db.collection('applications').find({}).toArray();
    res.json({ applications });
  } catch (error) {
    console.error('Error fetching applications:', error);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

// Create a new application
app.post('/api/applications', async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Database not connected' });
    }

    const application = {
      ...req.body,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection('applications').insertOne(application);
    const createdApplication = await db.collection('applications').findOne({ _id: result.insertedId });
    
    console.log('Application saved to MongoDB:', createdApplication);
    
    res.status(201).json({
      data: {
        id: createdApplication._id.toString(),
        ...createdApplication,
        _id: undefined
      }
    });
  } catch (error) {
    console.error('Error creating application:', error);
    res.status(500).json({ error: 'Failed to create application' });
  }
});

// Generate cover letter
app.post('/api/generate-cover-letter', async (req, res) => {
  try {
    const { company, position, description, resumeId } = req.body;
    
    if (!company || !position || !resumeId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get resume data
    let resumeData = null;
    if (db) {
      try {
        resumeData = await db.collection('resumes').findOne({ _id: new ObjectId(resumeId) });
      } catch (error) {
        console.log('Could not fetch resume from DB:', error);
      }
    }

    // Generate cover letter
    const coverLetter = await generateCoverLetterContent(company, position, description, resumeData);
    
    res.json({ coverLetter });
  } catch (error) {
    console.error('Error generating cover letter:', error);
    res.status(500).json({ error: 'Failed to generate cover letter' });
  }
});

async function generateCoverLetterContent(company, position, description, resumeData) {
  const currentDate = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  const candidateName = resumeData 
    ? `${resumeData.personalInfo?.firstName || ''} ${resumeData.personalInfo?.lastName || ''}`.trim()
    : '[Your Name]';
  
  const skills = resumeData?.skills?.map(skill => skill.name).join(', ') || 'relevant skills';
  const experience = resumeData?.experience?.[0] || null;
  
  let experienceText = '';
  if (experience) {
    experienceText = `In my previous role as ${experience.position} at ${experience.company}, I ${experience.description?.substring(0, 100) || 'gained valuable experience'}.`;
  }

  return `${currentDate}

Dear Hiring Manager,

I am writing to express my strong interest in the ${position} position at ${company}. Based on my background and experience outlined in my resume, I believe I would be a valuable addition to your team.

${experienceText}

My technical expertise includes ${skills}, which I believe align well with the requirements for this role. ${description ? `After reviewing the job description, I am particularly excited about the opportunity to contribute to ${company}'s mission and help drive innovation in your team.` : ''}

I am confident that my combination of technical skills, professional experience, and passion for excellence make me an ideal candidate for this position. I would welcome the opportunity to discuss how my background and enthusiasm can contribute to ${company}'s continued success.

Thank you for considering my application. I look forward to hearing from you soon.

Sincerely,
${candidateName}`;
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;