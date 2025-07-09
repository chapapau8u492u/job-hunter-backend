const express = require('express');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB connection
let db;
let mongoClient;
const MONGODB_URI ='mongodb+srv://chapapau8u492u:chapapau8u492u@job-hunter.nh5pqhk.mongodb.net/?retryWrites=true&w=majority&appName=Job-Hunter';

// Enhanced MongoDB connection with retry logic
async function connectToMongoDB() {
  try {
    console.log('Attempting to connect to MongoDB...');
    mongoClient = new MongoClient(MONGODB_URI, {
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    
    await mongoClient.connect();
    console.log('Connected to MongoDB successfully');
    db = mongoClient.db('jobhunter');
    
    // Test the connection
    await db.admin().ping();
    console.log('MongoDB ping successful');
    
    return true;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    db = null;
    return false;
  }
}

// Initialize connection
connectToMongoDB();

// Enhanced CORS configuration
app.use(cors());

app.use(express.json({ limit: '10mb' }));

// Add preflight handling
app.options('*', cors());

// Middleware to ensure database connection
async function ensureDBConnection(req, res, next) {
  if (!db) {
    console.log('Database not connected, attempting to reconnect...');
    const connected = await connectToMongoDB();
    if (!connected) {
      return res.status(500).json({ 
        error: 'Database connection failed', 
        message: 'Unable to connect to MongoDB. Please try again later.' 
      });
    }
  }
  next();
}

// Routes

// Get all resumes
app.get('/api/resumes', ensureDBConnection, async (req, res) => {
  try {
    const { userId } = req.query;
    
    let query = {};
    if (userId) {
      query.userId = userId;
    }
    
    const resumes = await db.collection('resumes').find(query).toArray();
    console.log(`Fetched ${resumes.length} resumes from DB`);
    
    // Transform resumes to include proper title and id
    const transformedResumes = resumes.map(resume => ({
      ...resume,
      id: resume._id.toString(),
      title: resume.title || `${resume.personalInfo?.firstName || 'Untitled'} ${resume.personalInfo?.lastName || ''} Resume`.trim(),
      _id: undefined
    }));
    
    res.json({ resumes: transformedResumes });
  } catch (error) {
    console.error('Error fetching resumes:', error);
    res.status(500).json({ error: 'Failed to fetch resumes', details: error.message });
  }
});

// Create a new resume
app.post('/api/resumes', ensureDBConnection, async (req, res) => {
  try {
    console.log('Creating new resume with data:', JSON.stringify(req.body, null, 2));
    
    const resume = {
      ...req.body,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Validate required fields
    if (!resume.personalInfo || (!resume.personalInfo.firstName && !resume.title)) {
      return res.status(400).json({ 
        error: 'Missing required fields', 
        message: 'Resume must have either a title or personal info with firstName' 
      });
    }

    const result = await db.collection('resumes').insertOne(resume);
    const createdResume = await db.collection('resumes').findOne({ _id: result.insertedId });
    
    console.log('Resume created successfully with ID:', result.insertedId.toString());
    
    const responseResume = {
      ...createdResume,
      id: createdResume._id.toString(),
      _id: undefined
    };
    
    res.status(201).json({
      success: true,
      data: responseResume,
      message: 'Resume created successfully'
    });
  } catch (error) {
    console.error('Error creating resume:', error);
    res.status(500).json({ 
      error: 'Failed to create resume', 
      details: error.message,
      success: false 
    });
  }
});

// Update a resume
app.put('/api/resumes/:id', ensureDBConnection, async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`Updating resume with ID: ${id}`);
    
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid resume ID format' });
    }
    
    const updateData = {
      ...req.body,
      updatedAt: new Date()
    };
    
    // Remove the id field from updateData to avoid conflicts
    delete updateData.id;

    const result = await db.collection('resumes').updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Resume not found' });
    }

    const updatedResume = await db.collection('resumes').findOne({ _id: new ObjectId(id) });
    
    console.log('Resume updated successfully');
    
    const responseResume = {
      ...updatedResume,
      id: updatedResume._id.toString(),
      _id: undefined
    };
    
    res.json({
      success: true,
      data: responseResume,
      message: 'Resume updated successfully'
    });
  } catch (error) {
    console.error('Error updating resume:', error);
    res.status(500).json({ 
      error: 'Failed to update resume', 
      details: error.message,
      success: false 
    });
  }
});

// Delete a resume
app.delete('/api/resumes/:id', ensureDBConnection, async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid resume ID format' });
    }
    
    const result = await db.collection('resumes').deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Resume not found' });
    }

    console.log('Resume deleted successfully');
    res.json({ 
      success: true, 
      message: 'Resume deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting resume:', error);
    res.status(500).json({ 
      error: 'Failed to delete resume', 
      details: error.message,
      success: false 
    });
  }
});

// Get all applications
app.get('/api/applications', ensureDBConnection, async (req, res) => {
  try {
    const applications = await db.collection('applications').find({}).toArray();
    console.log(`Fetched ${applications.length} applications from DB`);
    
    const transformedApplications = applications.map(app => ({
      ...app,
      id: app._id.toString(),
      _id: undefined
    }));
    
    res.json({ applications: transformedApplications });
  } catch (error) {
    console.error('Error fetching applications:', error);
    res.status(500).json({ error: 'Failed to fetch applications', details: error.message });
  }
});

// Create a new application
app.post('/api/applications', ensureDBConnection, async (req, res) => {
  try {
    console.log('Creating new application:', JSON.stringify(req.body, null, 2));
    
    const application = {
      ...req.body,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection('applications').insertOne(application);
    const createdApplication = await db.collection('applications').findOne({ _id: result.insertedId });
    
    console.log('Application created successfully with ID:', result.insertedId.toString());
    
    const responseApplication = {
      ...createdApplication,
      id: createdApplication._id.toString(),
      _id: undefined
    };
    
    res.status(201).json({
      success: true,
      data: responseApplication,
      message: 'Application created successfully'
    });
  } catch (error) {
    console.error('Error creating application:', error);
    res.status(500).json({ 
      error: 'Failed to create application', 
      details: error.message,
      success: false 
    });
  }
});

// Generate cover letter with enhanced AI-like generation
app.post('/api/generate-cover-letter', ensureDBConnection, async (req, res) => {
  try {
    const { company, position, description, location, salary, resumeId } = req.body;
    
    if (!company || !position || !resumeId) {
      return res.status(400).json({ error: 'Missing required fields: company, position, or resumeId' });
    }

    console.log('Generating cover letter for:', { company, position, resumeId });

    // Get resume data from database
    let resumeData = null;
    try {
      if (ObjectId.isValid(resumeId)) {
        resumeData = await db.collection('resumes').findOne({ _id: new ObjectId(resumeId) });
      } else {
        // Try to find by string ID
        resumeData = await db.collection('resumes').findOne({ id: resumeId });
      }
      console.log('Resume data found:', resumeData ? 'Yes' : 'No');
    } catch (error) {
      console.log('Could not fetch resume from DB:', error.message);
    }

    // Generate personalized cover letter
    const coverLetter = generatePersonalizedCoverLetter({
      company,
      position,
      description,
      location,
      salary,
      resumeData
    });
    
    res.json({ 
      success: true,
      coverLetter,
      message: 'Cover letter generated successfully'
    });
  } catch (error) {
    console.error('Error generating cover letter:', error);
    res.status(500).json({ 
      error: 'Failed to generate cover letter', 
      details: error.message,
      success: false 
    });
  }
});

function generatePersonalizedCoverLetter({ company, position, description, location, salary, resumeData }) {
  const currentDate = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  // Extract data from resume
  const candidateName = resumeData 
    ? `${resumeData.personalInfo?.firstName || ''} ${resumeData.personalInfo?.lastName || ''}`.trim()
    : '[Your Name]';
  
  const candidateEmail = resumeData?.personalInfo?.email || '[Your Email]';
  const candidatePhone = resumeData?.personalInfo?.phone || '[Your Phone]';
  const candidateLocation = resumeData?.personalInfo?.location || '[Your Location]';
  
  // Extract skills and experience
  const skills = resumeData?.skills?.slice(0, 5).map(skill => skill.name).join(', ') || 'relevant technical skills';
  const topExperience = resumeData?.experience?.[0] || null;
  const education = resumeData?.education?.[0] || null;
  const projects = resumeData?.projects?.slice(0, 2) || [];
  
  // Build experience paragraph
  let experienceText = '';
  if (topExperience) {
    const duration = topExperience.current ? 'Currently' : `From ${topExperience.startDate} to ${topExperience.endDate || 'present'}`;
    experienceText = `In my role as ${topExperience.position} at ${topExperience.company}, I have ${topExperience.description?.substring(0, 150) || 'gained valuable experience in the field'}.`;
  }
  
  // Build education paragraph
  let educationText = '';
  if (education) {
    educationText = `I hold a ${education.degree} in ${education.field} from ${education.institution}${education.gpa ? ` with a GPA of ${education.gpa}` : ''}.`;
  }
  
  // Build projects paragraph
  let projectsText = '';
  if (projects.length > 0) {
    const projectNames = projects.map(p => p.name).join(' and ');
    projectsText = `I have successfully completed projects including ${projectNames}, which demonstrate my practical application of technology and problem-solving abilities.`;
  }
  
  // Build salary expectation text
  let salaryText = '';
  if (salary) {
    salaryText = `I note that the position offers ${salary}, which aligns well with my expectations for this role.`;
  }
  
  // Build location text
  let locationText = '';
  if (location && candidateLocation !== '[Your Location]') {
    locationText = `I am excited about the opportunity to work in ${location}.`;
  }
  
  // Build job-specific motivation
  let motivationText = '';
  if (description) {
    const descriptionWords = description.toLowerCase();
    if (descriptionWords.includes('innovation') || descriptionWords.includes('cutting-edge')) {
      motivationText = `I am particularly drawn to ${company}'s commitment to innovation and would be thrilled to contribute to your cutting-edge projects.`;
    } else if (descriptionWords.includes('team') || descriptionWords.includes('collaboration')) {
      motivationText = `I am excited about the collaborative environment at ${company} and the opportunity to work with your talented team.`;
    } else if (descriptionWords.includes('growth') || descriptionWords.includes('scale')) {
      motivationText = `${company}'s growth trajectory and scale of impact align perfectly with my career aspirations.`;
    } else {
      motivationText = `I am impressed by ${company}'s reputation in the industry and would be honored to contribute to your continued success.`;
    }
  } else {
    motivationText = `I have long admired ${company}'s work and would be thrilled to contribute to your team's success.`;
  }

  return `${currentDate}

Dear Hiring Manager,

I am writing to express my strong interest in the ${position} position at ${company}. ${motivationText}

${experienceText}

${educationText}

${projectsText}

My technical expertise includes ${skills}, which I believe align well with the requirements for this role. ${salaryText} ${locationText}

I am confident that my combination of technical skills, professional experience, and passion for excellence make me an ideal candidate for this position. I would welcome the opportunity to discuss how my background and enthusiasm can contribute to ${company}'s continued success.

Thank you for considering my application. I look forward to hearing from you soon.

Best regards,
${candidateName}
${candidateEmail}
${candidatePhone}`;
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    database: db ? 'Connected' : 'Disconnected'
  });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  if (mongoClient) {
    await mongoClient.close();
    console.log('MongoDB connection closed');
  }
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
