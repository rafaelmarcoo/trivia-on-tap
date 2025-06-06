# Trivia On Tap 🎯

A modern, engaging web application that brings pub quiz excitement to your fingertips! Challenge yourself with AI-powered trivia questions, compete with friends, and climb the leaderboards in this beautifully crafted trivia experience.

## ✨ Features

### 🎮 Game Modes
- **Single Player** - Test your knowledge solo with AI-generated questions
- **Multiplayer** - Compete against random players in real-time matches
- **Friend Challenges** - Challenge your friends to head-to-head trivia battles
- **Tutorial Mode** - Learn the ropes with guided gameplay

### 🤖 AI-Powered Questions
- Dynamic question generation using OpenAI GPT-4
- Multiple question types: Multiple Choice, True/False, One-Word, Math
- Adaptive difficulty based on your level
- Diverse categories: General, History, Technology, Geography, Science, Math

### 🎯 Gamification & Progression
- User leveling system with XP rewards
- Level-up achievements and notifications
- Performance tracking and game history
- Personal statistics and progress monitoring

### 👥 Social Features
- Friend system with messaging
- Friend challenge system
- Real-time notifications
- Lobby system for multiplayer matching
- Custom profile images with cloud storage

### 🎨 Modern UI/UX
- Responsive design with beautiful gradients
- Smooth animations and transitions
- Mobile-optimized interface
- Real-time game state updates
- Accessible design patterns

## 🚀 Installation & Setup

### Prerequisites
- **Node.js** (v18 or higher)
- **npm** or **yarn** package manager
- **Supabase** account and project
- **OpenAI** API account and key

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/trivia-on-tap.git
cd trivia-on-tap
```

### 2. Install Dependencies
```bash
npm install
# or
yarn install
```

### 3. Environment Setup
Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_OPENAI_API_KEY=your_openai_api_key
```

### 4. Supabase Setup
1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Set up the required database tables:
   - `user` - User profiles and levels
   - `game_sessions` - Game tracking
   - `game_questions` - Question storage
   - `game_lobbies` - Multiplayer lobbies
   - `friend_requests` - Social features
   - `messages` - Friend messaging
3. Create a storage bucket named `profile-image` for user avatars
4. Configure Row Level Security (RLS) policies for your tables

### 5. Run the Application

#### Development Mode
```bash
npm run dev
# or
yarn dev
```
Visit [http://localhost:3000](http://localhost:3000) to see the application.

#### Production Build
```bash
npm run build
npm run start
# or
yarn build
yarn start
```

### 6. Additional Commands

```bash
# Run tests
npm run test

# Run tests in watch mode
npm run test:watch

# Generate test coverage report
npm run test:coverage

# Lint code
npm run lint
```

## 🛠️ Tech Stack

### Frontend
- **React 19** - Latest React with concurrent features
- **Next.js 15** - Full-stack React framework with App Router
- **TailwindCSS 4** - Utility-first CSS framework
- **Lucide React** - Beautiful icon library

### Backend & Infrastructure
- **Supabase** - Database, authentication, and real-time subscriptions
- **Supabase Auth** - Secure user authentication system
- **Supabase Realtime** - Live updates for multiplayer features
- **Supabase Storage** - File storage for profile images and assets

### AI & APIs
- **OpenAI API** - GPT-4 integration for question generation
- **Custom AI prompts** - Structured JSON responses for consistent question format

### Development & Testing
- **JavaScript/JSX** - Primary programming language
- **Jest** - Testing framework with comprehensive mocks
- **ESLint** - Code linting and quality assurance

## 🎪 Usage

### Getting Started
1. Create an account or sign in
2. Complete the tutorial to learn the game mechanics
3. Choose your preferred game mode from the dashboard

### Single Player Mode
- Select your preferred trivia categories
- Answer 20 AI-generated questions
- Earn XP and level up based on performance
- Track your progress in game history

### Multiplayer Features
- Join the matchmaking queue for random opponents
- Challenge friends directly through the friends system
- Real-time scoring and live game updates
- Competitive leaderboards

### Progression System
- Gain XP for correct answers and game completion
- Level up to unlock harder questions
- Track statistics and improvement over time
- Unlock achievements and milestones

## 🎯 Game Mechanics

### Question Types
- **Multiple Choice**: Choose from 4 options
- **True/False**: Simple binary questions
- **One-Word**: Type single-word answers
- **Math**: Numerical problem solving

### Scoring & Timing
- 30 seconds per question
- Points awarded for correct answers
- Time bonus for quick responses
- Level-based difficulty scaling

### Real-time Features
- Live opponent updates in multiplayer
- Real-time notifications system
- Dynamic lobby management
- Instant friend messaging
