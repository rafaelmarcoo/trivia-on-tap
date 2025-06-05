import { getSupabase } from './supabase'

// XP and Level Configuration
const LEVELING_CONFIG = {
  // Base XP required for level 1
  BASE_XP_REQUIRED: 100,
  // Multiplier for each subsequent level (exponential growth)
  LEVEL_MULTIPLIER: 1.15,
  // Maximum level cap
  MAX_LEVEL: 100,
  
  // XP Rewards for different actions
  XP_REWARDS: {
    // Single Player Rewards
    CORRECT_ANSWER: 10,
    PERFECT_GAME: 50,        // All questions correct
    FIRST_TRY_CORRECT: 5,    // Answer correctly on first try (time bonus)
    QUICK_ANSWER: 3,         // Answer within first 10 seconds
    
    // Challenge Rewards
    CHALLENGE_WIN: 100,
    CHALLENGE_LOSS: 25,      // Participation reward
    CHALLENGE_TIE: 60,
    CHALLENGE_PERFECT: 75,   // Perfect score in challenge
    
    // Bonus Multipliers
    DIFFICULTY_BONUS: {
      easy: 1.0,
      medium: 1.2,
      hard: 1.5
    },
    
    // Streak Bonuses
    STREAK_MULTIPLIER: {
      5: 1.1,    // 5 game win streak = 10% bonus
      10: 1.2,   // 10 game win streak = 20% bonus
      20: 1.3,   // 20 game win streak = 30% bonus
      50: 1.5    // 50 game win streak = 50% bonus
    }
  },
  
  // Level Rewards/Unlocks
  LEVEL_REWARDS: {
    5: { type: 'badge', name: 'Novice Scholar', description: 'Reached level 5!' },
    10: { type: 'badge', name: 'Quiz Enthusiast', description: 'Reached level 10!' },
    15: { type: 'feature', name: 'Custom Avatars', description: 'Unlock custom profile pictures' },
    20: { type: 'badge', name: 'Trivia Adept', description: 'Reached level 20!' },
    25: { type: 'feature', name: 'Challenge Timer+', description: 'Extended challenge time limits' },
    30: { type: 'badge', name: 'Knowledge Seeker', description: 'Reached level 30!' },
    40: { type: 'badge', name: 'Trivia Master', description: 'Reached level 40!' },
    50: { type: 'badge', name: 'Wisdom Keeper', description: 'Reached level 50!' },
    75: { type: 'badge', name: 'Grand Scholar', description: 'Reached level 75!' },
    100: { type: 'badge', name: 'Trivia Legend', description: 'Maximum level achieved!' }
  }
}

/**
 * Calculate XP required for a specific level
 * @param {number} level - Target level
 * @returns {number} Total XP required to reach that level
 */
export const calculateXPForLevel = (level) => {
  if (level <= 1) return 0
  if (level > LEVELING_CONFIG.MAX_LEVEL) return calculateXPForLevel(LEVELING_CONFIG.MAX_LEVEL)
  
  let totalXP = 0
  for (let i = 1; i < level; i++) {
    const xpForLevel = Math.floor(LEVELING_CONFIG.BASE_XP_REQUIRED * Math.pow(LEVELING_CONFIG.LEVEL_MULTIPLIER, i - 1))
    totalXP += xpForLevel
  }
  return totalXP
}

/**
 * Calculate what level a player should be at based on total XP
 * @param {number} totalXP - Player's total accumulated XP
 * @returns {number} Player's current level
 */
export const calculateLevelFromXP = (totalXP) => {
  if (totalXP < 0) return 1
  
  let level = 1
  let currentXP = 0
  
  while (level < LEVELING_CONFIG.MAX_LEVEL) {
    const xpForNextLevel = Math.floor(LEVELING_CONFIG.BASE_XP_REQUIRED * Math.pow(LEVELING_CONFIG.LEVEL_MULTIPLIER, level - 1))
    if (currentXP + xpForNextLevel > totalXP) break
    currentXP += xpForNextLevel
    level++
  }
  
  return level
}

/**
 * Get XP progress info for current level
 * @param {number} totalXP - Player's total XP
 * @returns {object} Level progress information
 */
export const getLevelProgress = (totalXP) => {
  const currentLevel = calculateLevelFromXP(totalXP)
  const currentLevelStartXP = calculateXPForLevel(currentLevel)
  const nextLevelRequiredXP = calculateXPForLevel(currentLevel + 1)
  const xpInCurrentLevel = totalXP - currentLevelStartXP
  const xpNeededForNextLevel = nextLevelRequiredXP - currentLevelStartXP
  const progressPercent = Math.floor((xpInCurrentLevel / xpNeededForNextLevel) * 100)
  
  return {
    currentLevel,
    totalXP,
    xpInCurrentLevel,
    xpNeededForNextLevel,
    progressPercent,
    isMaxLevel: currentLevel >= LEVELING_CONFIG.MAX_LEVEL
  }
}

/**
 * Calculate XP earned from a single-player game
 * @param {object} gameData - Game session data
 * @returns {object} XP breakdown and total
 */
export const calculateSinglePlayerXP = (gameData) => {
  const {
    score,
    totalQuestions,
    questions, // Array of question objects with timing info
    difficulty = 'medium',
    categories = []
  } = gameData
  
  let xpBreakdown = {
    correctAnswers: 0,
    perfectGame: 0,
    quickAnswers: 0,
    difficultyBonus: 0,
    total: 0
  }
  
  // Base XP for correct answers
  xpBreakdown.correctAnswers = score * LEVELING_CONFIG.XP_REWARDS.CORRECT_ANSWER
  
  // Perfect game bonus
  if (score === totalQuestions) {
    xpBreakdown.perfectGame = LEVELING_CONFIG.XP_REWARDS.PERFECT_GAME
  }
  
  // Quick answer bonuses (if timing data available)
  if (questions && Array.isArray(questions)) {
    const quickAnswers = questions.filter(q => 
      q.isCorrect && q.timeTaken && q.timeTaken <= 10
    ).length
    xpBreakdown.quickAnswers = quickAnswers * LEVELING_CONFIG.XP_REWARDS.QUICK_ANSWER
  }
  
  // Calculate base total
  const baseXP = xpBreakdown.correctAnswers + xpBreakdown.perfectGame + xpBreakdown.quickAnswers
  
  // Apply difficulty multiplier
  const difficultyMultiplier = LEVELING_CONFIG.XP_REWARDS.DIFFICULTY_BONUS[difficulty] || 1.0
  xpBreakdown.difficultyBonus = Math.floor(baseXP * (difficultyMultiplier - 1))
  
  xpBreakdown.total = baseXP + xpBreakdown.difficultyBonus
  
  return xpBreakdown
}

/**
 * Calculate XP earned from a friend challenge
 * @param {object} challengeData - Challenge result data
 * @returns {object} XP breakdown and total
 */
export const calculateChallengeXP = (challengeData) => {
  const {
    playerScore,
    opponentScore,
    totalQuestions,
    difficulty = 'medium',
    isWinner,
    isTie,
    playerAnswers = [] // Array of player's answers with timing
  } = challengeData
  
  let xpBreakdown = {
    gameResult: 0,
    correctAnswers: 0,
    perfectGame: 0,
    quickAnswers: 0,
    difficultyBonus: 0,
    total: 0
  }
  
  // Base XP for game result
  if (isTie) {
    xpBreakdown.gameResult = LEVELING_CONFIG.XP_REWARDS.CHALLENGE_TIE
  } else if (isWinner) {
    xpBreakdown.gameResult = LEVELING_CONFIG.XP_REWARDS.CHALLENGE_WIN
  } else {
    xpBreakdown.gameResult = LEVELING_CONFIG.XP_REWARDS.CHALLENGE_LOSS
  }
  
  // XP for correct answers
  xpBreakdown.correctAnswers = playerScore * LEVELING_CONFIG.XP_REWARDS.CORRECT_ANSWER
  
  // Perfect game bonus
  if (playerScore === totalQuestions) {
    xpBreakdown.perfectGame = LEVELING_CONFIG.XP_REWARDS.CHALLENGE_PERFECT
  }
  
  // Quick answer bonuses
  if (playerAnswers && Array.isArray(playerAnswers)) {
    const quickAnswers = playerAnswers.filter(a => 
      a.is_correct && a.time_taken && a.time_taken <= 10
    ).length
    xpBreakdown.quickAnswers = quickAnswers * LEVELING_CONFIG.XP_REWARDS.QUICK_ANSWER
  }
  
  // Calculate base total
  const baseXP = xpBreakdown.gameResult + xpBreakdown.correctAnswers + 
                 xpBreakdown.perfectGame + xpBreakdown.quickAnswers
  
  // Apply difficulty multiplier
  const difficultyMultiplier = LEVELING_CONFIG.XP_REWARDS.DIFFICULTY_BONUS[difficulty] || 1.0
  xpBreakdown.difficultyBonus = Math.floor(baseXP * (difficultyMultiplier - 1))
  
  xpBreakdown.total = baseXP + xpBreakdown.difficultyBonus
  
  return xpBreakdown
}

/**
 * Update player's XP and level in database
 * @param {string} userId - Player's auth ID
 * @param {number} xpGained - XP to add
 * @param {string} source - Source of XP (for tracking)
 * @returns {object} Result with level up info
 */
export const updatePlayerXP = async (userId, xpGained, source = 'game') => {
  try {
    const supabase = getSupabase()
    
    // Get current player data
    const { data: currentData, error: fetchError } = await supabase
      .from('user')
      .select('user_level, total_xp, user_name')
      .eq('auth_id', userId)
      .single()
    
    if (fetchError) throw fetchError
    
    const oldXP = currentData.total_xp || 0
    const newXP = oldXP + xpGained
    const oldLevel = currentData.user_level || 1
    const newLevel = calculateLevelFromXP(newXP)
    
    // Update database
    const { error: updateError } = await supabase
      .from('user')
      .update({
        total_xp: newXP,
        user_level: newLevel
      })
      .eq('auth_id', userId)
    
    if (updateError) throw updateError
    
    // Check for level rewards
    const leveledUp = newLevel > oldLevel
    const rewards = []
    
    if (leveledUp) {
      for (let level = oldLevel + 1; level <= newLevel; level++) {
        if (LEVELING_CONFIG.LEVEL_REWARDS[level]) {
          rewards.push({
            level,
            ...LEVELING_CONFIG.LEVEL_REWARDS[level]
          })
        }
      }
    }
    
    return {
      success: true,
      data: {
        oldLevel,
        newLevel,
        oldXP,
        newXP,
        xpGained,
        leveledUp,
        rewards,
        levelProgress: getLevelProgress(newXP)
      }
    }
  } catch (error) {
    console.error('Error updating player XP:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Award XP for single player game completion
 * @param {string} userId - Player's auth ID
 * @param {object} gameData - Game session data
 * @returns {object} XP update result
 */
export const awardSinglePlayerXP = async (userId, gameData) => {
  const xpBreakdown = calculateSinglePlayerXP(gameData)
  const result = await updatePlayerXP(userId, xpBreakdown.total, 'single_player')
  
  return {
    ...result,
    xpBreakdown
  }
}

/**
 * Award XP for friend challenge completion
 * @param {string} userId - Player's auth ID
 * @param {object} challengeData - Challenge result data
 * @returns {object} XP update result
 */
export const awardChallengeXP = async (userId, challengeData) => {
  const xpBreakdown = calculateChallengeXP(challengeData)
  const result = await updatePlayerXP(userId, xpBreakdown.total, 'friend_challenge')
  
  return {
    ...result,
    xpBreakdown
  }
}

/**
 * Get player's current level status
 * @param {string} userId - Player's auth ID
 * @returns {object} Player's level information
 */
export const getPlayerLevelStatus = async (userId) => {
  try {
    const supabase = getSupabase()
    
    const { data, error } = await supabase
      .from('user')
      .select('user_level, total_xp, user_name')
      .eq('auth_id', userId)
      .single()
    
    if (error) throw error
    
    const totalXP = data.total_xp || 0
    const levelProgress = getLevelProgress(totalXP)
    
    return {
      success: true,
      data: {
        ...data,
        ...levelProgress
      }
    }
  } catch (error) {
    console.error('Error getting player level status:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

export { LEVELING_CONFIG } 