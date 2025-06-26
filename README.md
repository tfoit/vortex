# Vortex Office Agent - Advisory Minutes Processing POC

A comprehensive Proof of Concept (POC) for an office agent that assists client advisors with processing advisory minutes using AI-powered document analysis.

## 🌟 Features

- **VORTEX Animation PWA**: Beautiful animated interface with Progressive Web App capabilities
- **Document Upload**: Drag-and-drop interface for uploading advisory minutes (PDF, DOC, Images)
- **Camera Capture**: Built-in camera functionality for capturing handwritten notes with OCR
- **AI Analysis**: OpenAI GPT-4o integration for intelligent document analysis
- **Smart Actions**: Automated suggestions for compliance forms, client notes, and follow-ups
- **Session Management**: UUID-based session tracking with sub-sessions for each action
- **Mock Banking Services**: Simulated backend banking systems for realistic workflows
- **Real-time Processing**: Live progress tracking and status updates

## 🏗️ Architecture

### Frontend (React PWA)

- React 18 with modern hooks and context
- Tailwind CSS for styling with custom animations
- Framer Motion for smooth animations
- React Router for navigation
- PWA capabilities with service worker
- Camera integration with WebRTC
- Drag-and-drop file uploads

### Backend (Node.js/Express)

- Express.js REST API
- OpenAI GPT-4o integration
- Document processing with OCR (Tesseract.js)
- PDF parsing and image optimization
- Mock banking service simulation
- UUID-based session management
- File upload handling with Multer

### Key Services

- **Session Manager**: Handles UUID generation and session lifecycle
- **Document Processor**: OCR, PDF parsing, and text extraction
- **AI Service**: OpenAI integration for document analysis
- **Mock Banking Service**: Simulates bank backend systems

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- OpenAI API key (optional - will use mock responses if not provided)

### Installation

1. **Clone and install dependencies:**

```bash
# Install all dependencies
npm run install-all
```

2. **Configure environment variables:**

```bash
# Copy environment template
cp server/.env.example server/.env

# Edit server/.env and add your OpenAI API key
OPENAI_API_KEY=your_openai_api_key_here
```

3. **Start the development servers:**

```bash
# Start both frontend and backend
npm run dev

# Or start individually:
# npm run server  # Backend on http://localhost:5000
# npm run client  # Frontend on http://localhost:3000
```

4. **Access the application:**
   - Frontend: http://localhost:7770
   - Backend API: http://localhost:7775/api

## 📱 Usage

### Creating a Session

1. **Upload Document**: Drag and drop advisory minutes or click to select files
2. **Camera Capture**: Use the camera button to photograph handwritten notes
3. **AI Analysis**: The system automatically processes and analyzes the document
4. **Review Results**: View AI insights, key points, risk assessment, and compliance flags
5. **Execute Actions**: Click on suggested actions to trigger banking operations

### Session Flow

```
Document Upload/Capture
         ↓
   Session Created (UUID)
         ↓
   AI Analysis & Processing
         ↓
   Suggested Actions Generated
         ↓
   User Selects Action
         ↓
   Sub-Session Created (Sub-UUID)
         ↓
   Banking Service Execution
         ↓
   Results Stored & Displayed
```

### Supported File Types

- **Images**: JPEG, PNG (with OCR processing)
- **Documents**: PDF, DOC, DOCX
- **Camera**: Real-time capture with optimization

### Action Types

- **CREATE_CLIENT_NOTE**: Generate and store client meeting notes
- **FILL_COMPLIANCE_FORM**: Auto-populate compliance documentation
- **UPDATE_CLIENT_PROFILE**: Update client information in banking systems
- **SCHEDULE_FOLLOW_UP**: Create follow-up meeting appointments

## 🔧 Configuration

### Environment Variables

**Server (.env):**

```env
OPENAI_API_KEY=your_openai_api_key_here
PORT=7775
NODE_ENV=development
CORS_ORIGIN=http://localhost:7770
```

**Client (.env.local):**

```env
REACT_APP_API_URL=http://localhost:7775/api
```

### OpenAI Configuration

The system uses OpenAI GPT-4o for document analysis. If no API key is provided, it will use intelligent mock responses based on document content.

**Features with OpenAI:**

- Advanced document understanding
- Context-aware action suggestions
- Intelligent compliance flag detection
- Professional note generation

**Mock Mode Features:**

- Content-based analysis simulation
- Realistic action suggestions
- Banking workflow simulation

## 🏦 Banking Service Simulation

The mock banking service simulates real banking operations:

### Client Notes Service

- Creates timestamped client notes
- Categorizes notes (follow-up, compliance, risk, etc.)
- Links to client and advisor records

### Compliance Forms Service

- Supports KYC, AML, MiFID forms
- Auto-fills fields from document analysis
- Tracks completion percentage
- Manages approval workflows

### Client Profile Service

- Updates client information
- Tracks risk profiles and portfolios
- Maintains contact history
- Audit trail for changes

### Follow-up Scheduling

- Creates calendar appointments
- Sends notifications
- Manages meeting types and priorities
- Integration with advisor calendars

## 📊 Session Management

### UUID Structure

- **Session ID**: Primary identifier for each advisory session
- **Sub-Session IDs**: Created for each executed action
- **Document IDs**: Unique identifiers for uploaded documents
- **Action IDs**: Track individual suggested actions

### Session Data

```json
{
  "id": "uuid-v4",
  "clientAdvisorId": "advisor_123",
  "clientId": "client_456",
  "createdAt": "2024-01-15T10:30:00Z",
  "status": "active",
  "documents": [...],
  "analysis": {...},
  "suggestedActions": [...],
  "subSessions": {...},
  "actionResults": {...}
}
```

## 🛠️ Development

### Project Structure

```
vortex-office-agent/
├── client/                 # React PWA frontend
│   ├── public/            # PWA assets and manifest
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── context/       # React context providers
│   │   ├── services/      # API service layer
│   │   └── styles/        # CSS and Tailwind config
├── server/                # Node.js backend
│   ├── services/          # Business logic services
│   ├── uploads/           # File upload directory
│   └── server.js          # Express server
└── package.json           # Root package configuration
```

### Available Scripts

**Root level:**

- `npm run dev` - Start both frontend and backend
- `npm run install-all` - Install all dependencies
- `npm run build` - Build production frontend
- `npm start` - Start production server

**Backend:**

- `npm run server` - Start development server
- `npm start` - Start production server

**Frontend:**

- `npm run client` - Start development server
- `npm run build` - Build for production

### API Endpoints

**Session Management:**

- `POST /api/sessions` - Create new session
- `GET /api/sessions/:id` - Get session details
- `GET /api/sessions` - List all sessions

**Document Processing:**

- `POST /api/sessions/:id/upload` - Upload document
- `POST /api/sessions/:id/capture` - Process camera capture

**Action Execution:**

- `POST /api/sessions/:id/actions/:actionId` - Execute action

**Health:**

- `GET /api/health` - API health check

## 🔒 Security Considerations

### Production Deployment

- Add authentication and authorization
- Implement rate limiting and request validation
- Use HTTPS for all communications
- Secure file upload validation
- Database encryption for sensitive data
- API key management and rotation

### Data Privacy

- Implement data retention policies
- Add GDPR compliance features
- Secure document storage
- Audit logging for all operations

## 🚀 Deployment

### Production Build

```bash
# Build frontend
npm run build

# Start production server
npm start
```

### Environment Setup

- Configure production environment variables
- Set up proper CORS origins
- Configure file upload limits
- Set up monitoring and logging

### PWA Features

- Offline capability with service worker
- App-like experience on mobile devices
- Push notifications (can be added)
- Background sync (can be added)

## 🤝 Contributing

This is a POC project demonstrating the integration of AI-powered document processing with banking workflows. The codebase is designed to be:

- **Scalable**: Modular architecture with clear separation of concerns
- **Maintainable**: Well-documented code with consistent patterns
- **Extensible**: Easy to add new document types and banking services
- **Testable**: Clear interfaces between components

## 📄 License

MIT License - This is a proof of concept for demonstration purposes.

## 🔮 Future Enhancements

- Multi-language support
- Advanced OCR with handwriting recognition
- Integration with real banking APIs
- Machine learning model training
- Advanced analytics and reporting
- Mobile app versions
- Voice-to-text integration
- Blockchain-based audit trails
