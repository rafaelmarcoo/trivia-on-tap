# Friend Challenge System - Setup Guide

## Overview
The friend challenge system has been polished and separated from the multiplayer mode. Friends can now challenge each other to synchronized trivia battles where both players answer the same questions, and scores are compared at the end.

## 🗄️ Database Setup

**IMPORTANT**: You must run the database schema updates first!

1. **Apply the schema updates**:
   - Go to your Supabase dashboard → SQL Editor
   - Copy and paste the contents of `docs/friend-challenge-schema-updates.sql`
   - Run the SQL commands
   - This will add missing columns and create new tables for the challenge system

## ✨ Features

### ✅ What's Implemented:

1. **Challenge Invitations**
   - Friends can challenge each other with custom categories and difficulty
   - Real-time notifications when someone challenges you
   - Accept/decline challenge invitations

2. **Synchronized Gameplay**
   - Both players get identical questions
   - Not first-to-answer - both players can take their time (30s per question)
   - Answers are tracked separately for each player

3. **Score Comparison**
   - Final scores are tallied and compared
   - Winner determination (or tie if scores are equal)
   - Challenge results are stored in the database

4. **Real-time Updates**
   - Live score tracking during gameplay
   - Notifications for new challenges
   - Seamless game flow between players

## 🎮 How to Use

### For Players:

1. **Sending a Challenge**:
   - Go to Friends page → Friends tab
   - Click "Challenge" button next to any friend
   - Select categories and difficulty
   - Send the challenge

2. **Receiving Challenges**:
   - You'll get a real-time notification when challenged
   - Go to Friends page → Challenges tab
   - Accept or decline pending challenges

3. **Playing the Challenge**:
   - Once accepted, both players are taken to the challenge game
   - Answer 10 questions (30 seconds each)
   - See your opponent's score in real-time
   - View final results when complete

### For Developers:

#### Key Components:
- `ChallengeInvitations.js` - Shows pending challenges and handles accept/decline
- `FriendChallengeModal.js` - Modal for sending challenges (already existed, now enhanced)
- `challenge/page.js` - The actual challenge game page
- Database functions for challenge management

#### Database Tables:
- `game_lobbies` - Enhanced with challenge-specific fields
- `friend_challenge_answers` - Tracks answers from both players
- `challenge_results` - Stores final challenge outcomes

## 🔧 Technical Details

### Key Database Functions:
- `get_pending_friend_challenges()` - Gets challenges waiting for acceptance
- `calculate_challenge_results()` - Calculates final scores and winner

### Real-time Features:
- Supabase real-time subscriptions for live updates
- Challenge notifications via the notification system
- Live score tracking during gameplay

### Navigation Flow:
1. Friends page → Challenge friend → Modal opens
2. Challenge sent → Friend gets notification
3. Friend accepts → Both taken to challenge game
4. Game completes → Results shown → Back to friends

## 🛠️ Customization

### Question Count:
Currently set to 10 questions per challenge. Change `totalQuestions` in `challenge/page.js` to modify.

### Time Limits:
Currently 30 seconds per question. Modify `setTimeLeft(30)` calls to change.

### Categories:
Add/modify available categories in `FriendChallengeModal.js` categories array.

## 🐛 Testing

Test the complete flow:
1. Create two user accounts
2. Make them friends
3. Send a challenge from one to the other
4. Accept the challenge
5. Play through the game
6. Verify results are stored correctly

## 🔮 Future Enhancements

Potential additions:
- Challenge history/leaderboards
- Tournament-style challenges
- Team challenges
- Custom question sets
- Challenge replays

## 🆘 Troubleshooting

**Common Issues:**

1. **"Challenge not found" error**:
   - Ensure database schema updates are applied
   - Check that lobby_type is set to 'friend_challenge'

2. **Questions not loading**:
   - Verify OpenAI API key is configured
   - Check browser console for API errors

3. **Real-time updates not working**:
   - Ensure Supabase real-time is enabled
   - Check browser network tab for WebSocket connections

**Database Checks:**
```sql
-- Check if schema updates were applied
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'game_lobbies' AND column_name IN ('invited_friend_id', 'categories', 'difficulty', 'lobby_type');

-- Check challenge data
SELECT * FROM friend_challenge_answers WHERE lobby_id = 'your-lobby-id';
SELECT * FROM challenge_results WHERE lobby_id = 'your-lobby-id';
```

## 📱 UI/UX Notes

The challenge system uses the same amber color scheme as the rest of the app. The interface is responsive and includes:
- Loading states
- Error handling
- Real-time score updates
- Clear visual feedback for answers
- Professional game flow

Enjoy your polished friend challenge system! 🎉 