const express = require('express');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB connection
let db;
let mongoClient;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://chapapau8u492u:chapapau8u492u@cluster0studentos.23ubx9r.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0StudentOS';

// Gemini API configuration
const GEMINI_API_KEY = 'AIzaSyBmE7h85j2gCHUuqtkofhZcjtRYwN-8O78';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

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
    db = mongoClient.db('studentos');
    
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
app.use(cors({
  origin: [
    'https://e696d393-e4c6-4336-8245-a06a9e89584f.lovableproject.com',
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

// Helper function to call Gemini API
async function callGeminiAPI(prompt) {
  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.candidates && data.candidates[0].content.parts[0].text) {
      return data.candidates[0].content.parts[0].text.trim();
    } else {
      throw new Error('Invalid response from Gemini API');
    }
  } catch (error) {
    console.error('Gemini API call failed:', error);
    throw error;
  }
}

// Helper function to validate and convert ID
function processResumeId(id) {
  console.log('Processing resume ID:', id, 'Type:', typeof id);
  
  if (!id) {
    return { isObjectId: false, id: id, stringId: id };
  }
  
  const stringId = String(id);
  
  if (ObjectId.isValid(stringId) && stringId.length === 24 && /^[0-9a-fA-F]{24}$/.test(stringId)) {
    console.log('ID is valid ObjectId format');
    return { isObjectId: true, id: new ObjectId(stringId), stringId: stringId };
  }
  
  console.log('ID treated as string format');
  return { isObjectId: false, id: stringId, stringId: stringId };
}

// AI Resume Generation endpoint
app.post('/api/ai/generate-resume', ensureDBConnection, async (req, res) => {
  try {
    const { summary, resumeName } = req.body;
    
    if (!summary || !resumeName) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: summary and resumeName'
      });
    }

    const prompt = `You are an expert ATS-optimized resume builder and career consultant. Create a comprehensive, professional resume based on this information:

CANDIDATE SUMMARY: "${summary}"
RESUME NAME: "${resumeName}"

INSTRUCTIONS:
- Create a modern, ATS-friendly resume that will pass automated screening systems
- Use action verbs, quantifiable achievements, and industry-relevant keywords
- Ensure all sections are professionally written and error-free
- Make the content compelling and competitive for today's job market
- Extract or intelligently generate realistic professional information

REQUIRED OUTPUT FORMAT (JSON):
{
  "personalInfo": {
    "fullName": "extracted or professionally generated name",
    "email": "professional.email@domain.com",
    "phone": "+1 (555) 123-4567",
    "location": "City, State",
    "summary": "compelling 3-4 line professional summary with quantifiable achievements"
  },
  "experiences": [
    {
      "id": "1",
      "jobTitle": "relevant senior position title",
      "company": "Credible Company Name",
      "location": "City, State",
      "startDate": "2022-01",
      "endDate": "",
      "current": true,
      "description": "• Led cross-functional team of 8+ members, resulting in 25% improvement in project delivery\\n• Implemented scalable solutions that reduced processing time by 40% and increased efficiency\\n• Managed $500K+ budget while maintaining 98% client satisfaction rate\\n• Collaborated with C-suite executives to align technical strategy with business objectives"
    },
    {
      "id": "2",
      "jobTitle": "relevant mid-level position",
      "company": "Previous Company Name",
      "location": "City, State",
      "startDate": "2020-03",
      "endDate": "2021-12",
      "current": false,
      "description": "• Developed and maintained enterprise-level applications serving 10,000+ users\\n• Optimized database performance, achieving 30% faster query response times\\n• Mentored 3 junior developers, contributing to team productivity increase of 20%\\n• Spearheaded adoption of new technologies, reducing development cycle by 15%"
    }
  ],
  "education": [
    {
      "id": "1",
      "degree": "relevant Bachelor's or Master's degree",
      "school": "Reputable University Name",
      "location": "City, State",
      "graduationDate": "2020-05",
      "gpa": "3.7"
    }
  ],
  "skills": [
    {"id": "1", "name": "highly relevant technical skill", "level": "advanced"},
    {"id": "2", "name": "industry-standard tool", "level": "intermediate"},
    {"id": "3", "name": "complementary skill", "level": "intermediate"},
    {"id": "4", "name": "additional relevant skill", "level": "intermediate"},
    {"id": "5", "name": "soft skill", "level": "advanced"},
    {"id": "6", "name": "certification or methodology", "level": "intermediate"}
  ]
}

CRITICAL REQUIREMENTS:
- All achievements must include specific metrics and numbers
- Use industry-standard job titles and company types
- Ensure descriptions are ATS-optimized with relevant keywords
- Professional email format: firstname.lastname@domain.com
- Skills should match the resume name and industry focus
- Experience should show career progression and growth
- Return ONLY valid JSON, no additional text`;

    try {
      const generatedContent = await callGeminiAPI(prompt);
      
      // Try to parse JSON from response
      const jsonMatch = generatedContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const resumeData = JSON.parse(jsonMatch[0]);
        res.json({
          success: true,
          resume: resumeData
        });
      } else {
        throw new Error('No JSON found in AI response');
      }
    } catch (parseError) {
      console.error('AI parsing error:', parseError);
      // Fallback structured response
      res.json({
        success: true,
        resume: createFallbackResume(summary, resumeName)
      });
    }
  } catch (error) {
    console.error('AI resume generation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate resume with AI',
      details: error.message
    });
  }
});

// AI Summary Generation endpoint
app.post('/api/ai/generate-summary', ensureDBConnection, async (req, res) => {
  try {
    const { fullName, jobTitle, experience, skills } = req.body;
    
    if (!fullName || !jobTitle) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: fullName and jobTitle'
      });
    }

    const prompt = `You are a professional resume writer and career consultant specializing in creating compelling professional summaries.

CREATE A PROFESSIONAL SUMMARY FOR:
- Name: ${fullName}
- Target Role: ${jobTitle}
- Experience Level: ${experience || 'Not specified'}
- Key Skills: ${skills || 'Not specified'}

REQUIREMENTS:
- Write 3-4 impactful bullet points that immediately grab attention
- Each bullet should be 15-25 words maximum
- Include quantifiable achievements where possible
- Use powerful action words and industry keywords
- Focus on value proposition and unique strengths
- Make it ATS-optimized and recruiter-friendly
- Avoid generic phrases and clichés

FORMAT: Return bullet points with • symbol, no additional text

EXAMPLE QUALITY:
• Results-driven ${jobTitle} with 5+ years expertise in [key area], delivering 30% improvement in [metric]
• Proven track record of leading cross-functional teams and managing $500K+ budgets with 98% success rate
• Technical expert in [specific skills] with demonstrated ability to scale solutions for 10,000+ users
• Strategic problem-solver who reduced operational costs by 25% while increasing team productivity by 40%`;

    try {
      const generatedSummary = await callGeminiAPI(prompt);
      res.json({
        success: true,
        summary: generatedSummary
      });
    } catch (error) {
      // Fallback summary
      const fallbackSummary = `• Experienced ${jobTitle} with strong background in ${skills || 'relevant technologies'} and proven results\n• Demonstrated expertise in leading projects and collaborating with cross-functional teams\n• Committed to delivering high-quality solutions that drive business growth and efficiency\n• Passionate about continuous learning and staying current with industry best practices`;
      
      res.json({
        success: true,
        summary: fallbackSummary
      });
    }
  } catch (error) {
    console.error('AI summary generation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate summary with AI',
      details: error.message
    });
  }
});

// AI Experience Description endpoint
app.post('/api/ai/generate-experience', ensureDBConnection, async (req, res) => {
  try {
    const { jobTitle, company, duration, responsibilities } = req.body;
    
    if (!jobTitle || !company) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: jobTitle and company'
      });
    }

    const prompt = `You are an expert resume writer specializing in creating compelling work experience descriptions that pass ATS systems and impress hiring managers.

CREATE PROFESSIONAL BULLET POINTS FOR:
- Position: ${jobTitle}
- Company: ${company}
- Duration: ${duration || 'Not specified'}
- Key Responsibilities: ${responsibilities || 'Not specified'}

EXPERT REQUIREMENTS:
- Write 4-5 powerful bullet points that showcase impact and achievements
- Start each bullet with strong action verbs (Led, Implemented, Optimized, Managed, Developed, etc.)
- Include specific metrics and quantifiable results (percentages, dollar amounts, timeframes, team sizes)
- Use industry-relevant keywords for ATS optimization
- Focus on accomplishments, not just duties
- Each bullet should be 20-30 words for optimal readability
- Show career progression and increasing responsibility

STRUCTURE EACH BULLET:
Action Verb + What you did + How you did it + Quantifiable result/impact

EXAMPLE QUALITY LEVEL:
• Led cross-functional team of 12 developers, resulting in 40% faster product delivery and $2M cost savings
• Implemented automated testing framework that reduced bug reports by 60% and improved code quality scores
• Managed $800K annual budget while maintaining 99% client satisfaction and exceeding revenue targets by 15%
• Developed scalable microservices architecture serving 50,000+ concurrent users with 99.9% uptime
• Collaborated with C-suite executives to align technical roadmap, driving 25% increase in market share

FORMAT: Return only bullet points with • symbol, no additional text`;

    try {
      const generatedDescription = await callGeminiAPI(prompt);
      res.json({
        success: true,
        description: generatedDescription
      });
    } catch (error) {
      // Fallback description
      const fallbackDescription = `• Led key initiatives and projects in ${jobTitle} role at ${company} with measurable impact\n• Collaborated with cross-functional teams to deliver high-quality solutions on time and within budget\n• Implemented best practices and process improvements that increased efficiency by 20%\n• Managed stakeholder relationships and communicated technical concepts to non-technical audiences\n• Contributed to team growth and mentored junior colleagues in professional development`;
      
      res.json({
        success: true,
        description: fallbackDescription
      });
    }
  } catch (error) {
    console.error('AI experience generation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate experience description with AI',
      details: error.message
    });
  }
});

function createFallbackResume(summary, resumeName) {
  const summaryLower = summary.toLowerCase();
  
  // Extract potential name
  const nameMatch = summary.match(/(?:i am|my name is|i'm)\s+([a-zA-Z\s]+)/i);
  const extractedName = nameMatch ? nameMatch[1].trim() : 'Professional User';
  
  // Determine field and skills based on resume name and summary
  let field = 'Technology';
  let jobTitle = 'Software Engineer';
  let skills = ['JavaScript', 'React', 'Node.js', 'Python', 'Git', 'SQL'];
  
  if (summaryLower.includes('marketing') || summaryLower.includes('sales') || resumeName.toLowerCase().includes('marketing')) {
    field = 'Marketing';
    jobTitle = 'Marketing Specialist';
    skills = ['Digital Marketing', 'SEO', 'Content Creation', 'Analytics', 'Social Media', 'Campaign Management'];
  } else if (summaryLower.includes('design') || summaryLower.includes('creative') || resumeName.toLowerCase().includes('design')) {
    field = 'Design';
    jobTitle = 'UI/UX Designer';
    skills = ['Figma', 'Photoshop', 'User Research', 'Wireframing', 'Prototyping', 'Adobe Creative Suite'];
  } else if (summaryLower.includes('data') || summaryLower.includes('analyst') || resumeName.toLowerCase().includes('data')) {
    field = 'Data Science';
    jobTitle = 'Data Analyst';
    skills = ['Python', 'SQL', 'Excel', 'Tableau', 'Power BI', 'Statistics'];
  }

  return {
    personalInfo: {
      fullName: extractedName,
      email: `${extractedName.toLowerCase().replace(/\s+/g, '.')}@example.com`,
      phone: '+1 (555) 123-4567',
      location: 'City, State',
      summary: `Results-driven ${jobTitle} with proven expertise in ${field.toLowerCase()} and track record of delivering measurable business impact. Experienced in leading cross-functional teams and implementing scalable solutions that drive growth. Passionate about leveraging technology to solve complex problems and exceed organizational objectives.`
    },
    experiences: [{
      id: '1',
      jobTitle: `Senior ${jobTitle}`,
      company: 'Tech Solutions Inc.',
      location: 'City, State',
      startDate: '2022-01',
      endDate: '',
      current: true,
      description: `• Led team of 6+ professionals, resulting in 30% improvement in project delivery timelines\n• Implemented innovative solutions that increased efficiency by 25% and reduced operational costs\n• Managed $300K+ annual budget while maintaining 95% client satisfaction rate\n• Collaborated with senior leadership to align technical strategy with business objectives`
    }],
    education: [{
      id: '1',
      degree: `Bachelor of Science in ${field}`,
      school: 'State University',
      location: 'City, State',
      graduationDate: '2020-05',
      gpa: '3.7'
    }],
    skills: skills.map((skill, index) => ({
      id: (index + 1).toString(),
      name: skill,
      level: index < 3 ? 'advanced' : 'intermediate'
    }))
  };
}

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
      id: resume._id ? resume._id.toString() : resume.id,
      title: resume.title || `${resume.personalInfo?.firstName || resume.personalInfo?.fullName || 'Untitled'} Resume`.trim(),
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
    if (!resume.personalInfo || (!resume.personalInfo.firstName && !resume.personalInfo.fullName && !resume.title)) {
      return res.status(400).json({ 
        error: 'Missing required fields', 
        message: 'Resume must have either a title or personal info with name' 
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
    
    const processedId = processResumeId(id);
    console.log('Processed ID:', processedId);
    
    const updateData = {
      ...req.body,
      updatedAt: new Date()
    };
    
    // Remove the id field from updateData to avoid conflicts
    delete updateData.id;

    let result;
    let updatedResume;

    if (processedId.isObjectId) {
      console.log('Attempting ObjectId-based update');
      // Try ObjectId-based update first
      result = await db.collection('resumes').updateOne(
        { _id: processedId.id },
        { $set: updateData }
      );
      
      if (result.matchedCount > 0) {
        updatedResume = await db.collection('resumes').findOne({ _id: processedId.id });
      }
    }
    
    // If ObjectId didn't work or it's a string ID, try string-based query
    if (!result || result.matchedCount === 0) {
      console.log('Attempting string-based update with id field');
      result = await db.collection('resumes').updateOne(
        { id: processedId.stringId },
        { $set: updateData }
      );
      
      if (result.matchedCount > 0) {
        updatedResume = await db.collection('resumes').findOne({ id: processedId.stringId });
      }
    }

    if (!result || result.matchedCount === 0) {
      console.log('Resume not found with either method');
      return res.status(404).json({ error: 'Resume not found' });
    }

    console.log('Resume updated successfully');
    
    const responseResume = {
      ...updatedResume,
      id: updatedResume._id ? updatedResume._id.toString() : updatedResume.id,
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
    console.log(`Deleting resume with ID: ${id}`);
    
    const processedId = processResumeId(id);
    let result;

    if (processedId.isObjectId) {
      // Try ObjectId-based deletion first
      result = await db.collection('resumes').deleteOne({ _id: processedId.id });
    }
    
    // If ObjectId didn't work or it's a string ID, try string-based query
    if (!result || result.deletedCount === 0) {
      result = await db.collection('resumes').deleteOne({ id: processedId.stringId });
    }

    if (!result || result.deletedCount === 0) {
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
      updatedAt: new Date(),
      // Ensure resume information is properly stored
      resumeUsed: req.body.resumeUsed || null
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

// Generate cover letter with enhanced AI generation
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
      const processedId = processResumeId(resumeId);
      
      if (processedId.isObjectId) {
        resumeData = await db.collection('resumes').findOne({ _id: processedId.id });
      }
      
      if (!resumeData) {
        resumeData = await db.collection('resumes').findOne({ id: processedId.stringId });
      }
      
      console.log('Resume data found:', resumeData ? 'Yes' : 'No');
    } catch (error) {
      console.log('Could not fetch resume from DB:', error.message);
    }

    // Generate AI-powered cover letter
    const prompt = `You are a professional cover letter writer with expertise in creating compelling, personalized cover letters that get results.

WRITE A PROFESSIONAL COVER LETTER FOR:
- Company: ${company}
- Position: ${position}
- Job Description: ${description || 'Not provided'}
- Location: ${location || 'Not specified'}
- Salary: ${salary || 'Not specified'}

CANDIDATE INFORMATION:
${resumeData ? `
- Name: ${resumeData.personalInfo?.fullName || 'Candidate'}
- Email: ${resumeData.personalInfo?.email || 'email@example.com'}
- Phone: ${resumeData.personalInfo?.phone || 'phone number'}
- Current Role: ${resumeData.experiences?.[0]?.jobTitle || 'Professional'}
- Skills: ${resumeData.skills?.map(s => s.name).join(', ') || 'Relevant skills'}
- Summary: ${resumeData.personalInfo?.summary || 'Experienced professional'}
` : 'Limited candidate information available'}

REQUIREMENTS:
- Professional business letter format with proper header and closing
- Compelling opening that immediately captures attention
- 2-3 body paragraphs highlighting relevant experience and achievements
- Specific examples of how candidate's skills match the role requirements
- Professional yet personable tone that shows genuine interest
- Strong closing with clear call-to-action
- Include quantifiable achievements where possible
- Tailor content specifically to the company and position
- Keep total length between 250-400 words

FORMAT: Return complete cover letter with proper business formatting including date, addresses, salutation, body paragraphs, and professional closing.`;

    try {
      const generatedCoverLetter = await callGeminiAPI(prompt);
      res.json({ 
        success: true,
        coverLetter: generatedCoverLetter,
        message: 'AI-powered cover letter generated successfully'
      });
    } catch (error) {
      console.error('AI cover letter generation failed:', error);
      
      // Enhanced fallback cover letter generation
      const fallbackCoverLetter = generatePersonalizedCoverLetter({
        company,
        position,
        description,
        location,
        salary,
        resumeData
      });
      
      res.json({ 
        success: true,
        coverLetter: fallbackCoverLetter,
        message: 'Cover letter generated successfully'
      });
    }
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
    ? `${resumeData.personalInfo?.firstName || resumeData.personalInfo?.fullName || ''} ${resumeData.personalInfo?.lastName || ''}`.trim()
    : '[Your Name]';
  
  const candidateEmail = resumeData?.personalInfo?.email || '[Your Email]';
  const candidatePhone = resumeData?.personalInfo?.phone || '[Your Phone]';
  const candidateLocation = resumeData?.personalInfo?.location || '[Your Location]';
  
  // Extract skills and experience
  const skills = resumeData?.skills?.slice(0, 5).map(skill => skill.name).join(', ') || 'relevant technical skills';
  const topExperience = resumeData?.experience?.[0] || resumeData?.experiences?.[0] || null;
  const education = resumeData?.education?.[0] || null;
  const projects = resumeData?.projects?.slice(0, 2) || [];
  
  // Build experience paragraph
  let experienceText = '';
  if (topExperience) {
    const duration = topExperience.current ? 'Currently' : `From ${topExperience.startDate} to ${topExperience.endDate || 'present'}`;
    experienceText = `In my role as ${topExperience.position || topExperience.jobTitle} at ${topExperience.company}, I have ${topExperience.description?.substring(0, 150) || 'gained valuable experience in the field'}.`;
  }
  
  // Build education paragraph
  let educationText = '';
  if (education) {
    educationText = `I hold a ${education.degree} in ${education.field} from ${education.institution || education.school}${education.gpa ? ` with a GPA of ${education.gpa}` : ''}.`;
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
