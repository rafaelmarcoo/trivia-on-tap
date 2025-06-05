import React, { useState, useEffect } from 'react'
import { Trophy, Star, Zap, Gift, X } from 'lucide-react'
import { getLevelProgress } from '@/utils/levelingSystem'

const LevelUpModal = ({ 
  isOpen, 
  onClose, 
  levelUpData 
}) => {
  const [showDetails, setShowDetails] = useState(false)
  
  useEffect(() => {
    if (isOpen) {
      // Show details after animation
      const timer = setTimeout(() => setShowDetails(true), 500)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  if (!isOpen || !levelUpData) return null

  const {
    oldLevel,
    newLevel,
    xpGained,
    rewards = [],
    levelProgress
  } = levelUpData

  const levelDifference = newLevel - oldLevel

  const handleClose = () => {
    setShowDetails(false)
    setTimeout(onClose, 200)
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in-0 duration-500">
      <div className="bg-gradient-to-br from-amber-50 to-orange-100 rounded-3xl border-2 border-amber-300/50 p-8 max-w-md w-full shadow-2xl animate-in slide-in-from-bottom-4 duration-500 relative">
        
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 text-amber-600 hover:text-amber-800 transition-colors duration-200"
        >
          <X size={20} />
        </button>

        {/* Level Up Animation */}
        <div className="text-center mb-6">
          <div className="relative mb-4">
            {/* Animated Trophy */}
            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center shadow-lg animate-bounce">
              <Trophy className="text-white" size={40} />
            </div>
            
            {/* Sparkles Animation */}
            <div className="absolute inset-0 pointer-events-none">
              {[...Array(6)].map((_, i) => (
                <Star
                  key={i}
                  className={`absolute text-amber-400 animate-ping`}
                  size={12}
                  style={{
                    top: `${20 + (i * 10)}%`,
                    left: `${10 + (i * 15)}%`,
                    animationDelay: `${i * 200}ms`
                  }}
                />
              ))}
            </div>
          </div>

          <h2 className="text-3xl font-bold text-amber-900 mb-2">
            Level Up! 🎉
          </h2>
          
          <div className="text-lg text-amber-800 mb-4">
            {levelDifference > 1 ? (
              <span>
                You gained <span className="font-bold text-amber-600">{levelDifference} levels!</span>
              </span>
            ) : (
              <span>
                You reached <span className="font-bold text-amber-600">Level {newLevel}!</span>
              </span>
            )}
          </div>

          {/* Level Progress Display */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 mb-6 border border-amber-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-amber-700">Level {oldLevel}</span>
              <span className="text-sm text-amber-700">Level {newLevel}</span>
            </div>
            
            <div className="w-full bg-amber-200 rounded-full h-3 mb-2 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-amber-400 to-amber-600 rounded-full transition-all duration-1000 ease-out"
                style={{ width: '100%' }}
              />
            </div>
            
            <div className="flex items-center justify-center gap-2 text-amber-600">
              <Zap size={16} />
              <span className="text-sm font-medium">+{xpGained} XP</span>
            </div>
          </div>
        </div>

        {/* Rewards Section */}
        {showDetails && rewards.length > 0 && (
          <div className="animate-in slide-in-from-bottom-2 duration-300">
            <div className="bg-gradient-to-r from-amber-100 to-orange-100 rounded-xl p-4 border border-amber-300/50 mb-6">
              <h3 className="text-lg font-bold text-amber-900 mb-3 flex items-center gap-2">
                <Gift className="text-amber-600" size={20} />
                New Rewards!
              </h3>
              
              <div className="space-y-2">
                {rewards.map((reward, index) => (
                  <div 
                    key={index}
                    className="bg-white/60 backdrop-blur-sm rounded-lg p-3 border border-amber-200/50 animate-in slide-in-from-left-2 duration-300"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center flex-shrink-0">
                        {reward.type === 'badge' ? (
                          <Trophy className="text-white" size={16} />
                        ) : (
                          <Star className="text-white" size={16} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-amber-900 text-sm">
                          {reward.name}
                        </h4>
                        <p className="text-xs text-amber-700">
                          {reward.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Current Level Status */}
        {showDetails && levelProgress && (
          <div className="animate-in slide-in-from-bottom-2 duration-300">
            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-amber-200/50 mb-6">
              <h3 className="text-sm font-semibold text-amber-900 mb-2">Current Progress</h3>
              
              <div className="flex items-center justify-between text-xs text-amber-700 mb-1">
                <span>Level {levelProgress.currentLevel}</span>
                {!levelProgress.isMaxLevel && (
                  <span>Level {levelProgress.currentLevel + 1}</span>
                )}
              </div>
              
              {!levelProgress.isMaxLevel ? (
                <>
                  <div className="w-full bg-amber-200 rounded-full h-2 mb-2">
                    <div 
                      className="h-full bg-gradient-to-r from-amber-400 to-amber-600 rounded-full transition-all duration-500"
                      style={{ width: `${levelProgress.progressPercent}%` }}
                    />
                  </div>
                  <div className="text-center text-xs text-amber-600">
                    {levelProgress.xpInCurrentLevel} / {levelProgress.xpNeededForNextLevel} XP
                  </div>
                </>
              ) : (
                <div className="text-center text-amber-800 font-semibold">
                  🏆 Maximum Level Reached! 🏆
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={handleClose}
          className="w-full bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold py-3 px-6 rounded-xl hover:from-amber-600 hover:to-amber-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
        >
          Awesome! 🎉
        </button>
      </div>
    </div>
  )
}

export default LevelUpModal 