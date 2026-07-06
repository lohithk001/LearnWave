# 🎓 LearnWave - Modern Learning Management Platform

A comprehensive, production-ready learning management system built with cutting-edge technologies, featuring AI-powered assistance (RAG PDF Question-Answering), voice navigation, and real-time collaboration.

---

## ✨ Technology Stack

### 🎯 Core Framework
- **⚡ Next.js 15** - The React framework for production with App Router (Full-Stack environment where frontend and backend coexist)
- **📘 TypeScript 5** - Type-safe JavaScript for better developer experience
- **🎨 Tailwind CSS 4** - Utility-first CSS framework for rapid UI development

### 🧩 UI Components & Styling
- **🧩 shadcn/ui** - High-quality, accessible components built on Radix UI
- **🎯 Lucide React** - Beautiful & consistent icon library
- **🌈 Framer Motion** - Production-ready motion library for React
- **🎨 Next Themes** - Perfect dark/light mode integration

### 📋 Forms & Validation
- **🎣 React Hook Form** - Performant forms with easy validation
- **✅ Zod** - TypeScript-first schema validation

### 🔄 State Management & Data Fetching
- **🐻 Zustand** - Simple, scalable state management
- **🔄 TanStack Query** - Powerful data synchronization for React
- **🌐 Axios** - Promise-based HTTP client

### 🗄️ Database & Backend
- **🗄️ Prisma** - Next-generation Node.js and TypeScript ORM
- **PostgreSQL** - Production-ready relational database
- **🔐 NextAuth.js** - Complete open-source authentication solution

### 🎨 Advanced UI Features
- **📊 TanStack Table** - Headless UI for building tables and datagrids
- **📊 Recharts** - Redefined chart library built with React and D3
- **🖼️ Sharp** - High performance image processing

### 🤖 AI Integration & Media
- **🧠 Google Gemini AI** - Integrated AI assistant for academic help
- **🗣️ Web Speech API** - Voice-based navigation and commands
- **🎤 Web Audio API** - Audio capture and visualization (waveforms)

---

## 🏗️ Architecture Guide

LearnWave is a full-stack application where both frontend (UI/UX) and backend (API endpoints, database operations) coexist.

### 📁 Detailed Folder Structure

```
learnwave099/
├── src/
│   ├── app/                    # Next.js App Router pages & API routes
│   │   ├── page.tsx           # Homepage (/)
│   │   ├── auth/              # Authentication pages (login/register)
│   │   ├── student/           # Student dashboard & features
│   │   ├── mentor/            # Mentor dashboard & features
│   │   ├── admin/             # Admin dashboard & management
│   │   └── api/               # Backend API routes
│   │       ├── auth/          # Authentication endpoints (login/register)
│   │       ├── student/       # Profile, dashboard, and settings APIs
│   │       ├── mentor/        # Mentor settings, profile, and dashboard APIs
│   │       ├── ai/            # Chat and RAG integration endpoints
│   │       ├── uploads/       # Static file retrieval handlers
│   │       └── ...
│   ├── components/            # Reusable React components
│   │   ├── ui/                # shadcn/ui components (buttons, input, etc.)
│   │   ├── layout/            # Dashboard layout (sidebar, bottom-nav)
│   │   └── ...
│   ├── hooks/                 # Custom React hooks (speech recognition, etc.)
│   └── lib/                   # Utility configurations (db connection, auth helper, Gemini config)
├── prisma/                    # Database schema and migration files
├── public/                    # Static assets (including user-uploaded avatars in uploads/avatars)
└── uploads/                   # Stored PDFs/study resources
```

### 🔄 Request Flow & Communication
```
[User Action in Frontend] 
     ↓
[API Call (fetch/axios) to Next.js API Route]
     ↓
[Authentication/Role Check (JWT verification)]
     ↓
[Database Query (Prisma Client)]
     ↓
[JSON API Response]
     ↓
[Update React State / Display UI]
```

---

## 🎨 Key Features

### 🎓 For Students
- **📚 Dashboard** - Personalized learning dashboard with academic tracking.
- **📚 RAG (PDF QA) AI Assistant** - Enable "Use Internal Resources" to ask questions and get answers cited page-by-page from uploaded PDF materials.
- **📢 Announcements** - Real-time VTU announcements and updates.
- **📖 Resources** - Download, filter, and view study notes, textbooks, and past papers.
- **👁️ Inline PDF Viewer** - Click the "View" button to read PDFs directly in a beautiful embedded modal window.
- **📚 Virtual Library** - Dedicated sidebar category to browse textbooks and reference materials.
- **👨‍🏫 Find Mentors** - Browse, search, and book sessions with approved mentors.
- **🗣️ Voice Navigation** - Navigate the entire dashboard via speech commands.
- **👤 Profile Picture** - Upload and manage profile photos (persisted in DB).

### 👨‍🏫 For Mentors
- **📊 Premium Dark Dashboard** - Live overview of bookings, students, ratings, and active hours with an interactive weekly contribution heatmap and engagement statistics charts.
- **📅 Session Management** - Control availability and schedule timeslots.
- **💰 Earnings Portal** - Analyze real-time transaction ledgers and daily payout distributions.
- **📤 Parameter-Based Uploads** - Submit notes/books classified by VTU scheme, branch, semester, subject, and module.
- **👤 Profile & Settings** - Manage professional bio, hourly rate, and profile picture.

### 👑 For Admins
- **📊 Analytics Dashboard** - Real-time statistics on users, sessions, and revenue.
- **👥 User Management** - Paginated directory of students, mentors, and admins with search/delete.
- **✅ Mentor Approvals** - Dedicated interface to approve or reject pending mentor applications.
- **📢 Announcement Editor** - Publish system-wide announcements with priority levels.
- **📖 Resource Hub** - Upload study files or review and approve pending mentor submissions.

---

## 🚀 Quick Start & Installation

### Setup Dependencies & Start Dev Server
```bash
# Install dependencies (utilizing legacy peer deps flag for package compatibility)
npm install --legacy-peer-deps

# Run database generation
npx prisma generate

# Run development server
npm run dev
```

### Database Management
```bash
# Push schema updates to DB
npx prisma db push

# Run migrations
npx prisma migrate dev

# Launch Prisma Studio to browse tables
npx prisma studio
```

### 🔐 Default Login Credentials (for testing)

- **Admin Account**: `admin@learnwave.com` | Password: `admin123`
- **Student Account**: `student@test.com` | Password: `student123`
- **Mentor Account**: `mentor@test.com` | Password: `mentor123`

---

## 🎤 Voice Navigation Commands

1. Toggle **"🎤 Voice Navigation"** in the sidebar.
2. Speak one of the following commands clearly in English:
   - **Student**: "home" / "dashboard", "announcements", "resources", "mentors", "ai assistant", "quiz".
   - **Mentor**: "students", "sessions", "earnings", "profile", "settings".
   - **Admin**: "users", "analytics", "announcements", "settings".
3. The platform will read out audio confirmation and navigate to the page automatically.

---

## 🤖 RAG (Retrieval-Augmented Generation) & PDF QA

RAG allows students to ask questions and receive AI answers compiled directly from uploaded study materials.

### Setup and PDF processing
1. Upload PDF notes in the Resource Hub.
2. Run the script to extract and chunk the text:
   ```bash
   npm run process-pdfs
   ```
   *This extracts text page-by-page, divides it into ~500-token chunks, and saves them to `document_chunks` table.*
3. Toggle **"Use Internal Resources"** on the AI Assistant page (`/ai-assistant`) to fetch cited answers.
4. Verify resource status via:
   ```bash
   npx tsx scripts/check-resources.ts
   ```

### API Endpoints for RAG
- `POST /api/resources/process` - Processes a single PDF (`resourceId` in body).
- `POST /api/ai/rag-chat` - Main RAG query endpoint (`question`, `useInternalResources` toggle, optional `subject` and `semester`).

---

## 🎨 Design System & Aesthetics

- **Student & Admin Dashboard**: Warm beige aesthetics with HSL-balanced tones (`Background: #FDFBF9`, `Sidebar/Dock: #F8F3EE`, `Borders: #E8DFD3`, `Buttons: #6B5844`).
- **Mentor Dashboard**: Premium dark navy analytics layout styled after professional dashboard wireframes (gradient banner, stats metric distributions, github activity calendar, custom Recharts graphs, and glassmorphism detail matrices).
- **Layout Modes**: Supports **Bottom Dock** navigation and classic **Side Sidebar** navigation. Toggleable under Settings.
- **Glassmorphism**: Backdrop blur elements with semi-transparent card panels.
- **Security Role Routing**: Next.js proxy guards are active to redirect unauthorized cross-role requests (e.g. students trying to access `/mentor` or `/admin`) back to the homepage login grid automatically.

---

## 🆘 Support & Troubleshooting

- **Microphone Permission**: Allow browser microphone permissions for Voice Navigation. Works best in Chrome/Edge.
- **AI Not Responding**: Check that your `GEMINI_API_KEY` is correctly defined in `.env.local`. Test with `npx tsx scripts/test-gemini.ts`.
- **Reset Database**: If tables get out of sync, run `npx prisma migrate reset` to clean and reseed.




hii
