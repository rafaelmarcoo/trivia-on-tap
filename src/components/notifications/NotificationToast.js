'use client'

import { useState, useEffect } from 'react'
import { MessageCircle, UserPlus, X, User, Gamepad2, Clock, ChevronRight } from 'lucide-react'
import Image from 'next/image'

export default function NotificationToast({ notification, onClose, onRemove }) {
  const [isVisible, setIsVisible] = useState(false)
  const [isExiting, setIsExiting] = useState(false)

  useEffect(() => {
    // Show notification with animation
    const timer = setTimeout(() => setIsVisible(true), 100)
    return () => clearTimeout(timer)
  }, [])

  const handleClose = () => {
    setIsExiting(true)
    setTimeout(() => {
      onRemove(notification.id)
    }, 300)
  }

  const handleClick = () => {
    if (notification.onClick) {
      notification.onClick()
    }
    handleClose()
  }

  const getIcon = () => {
    switch (notification.type) {
      case 'message':
        return <MessageCircle size={20} className="text-green-600" />
      case 'friend_request':
        return <UserPlus size={20} className="text-blue-600" />
      case 'challenge':
        return <Gamepad2 size={20} className="text-purple-600" />
      default:
        return <User size={20} className="text-amber-600" />
    }
  }

  const getThemeColors = () => {
    switch (notification.type) {
      case 'message':
        return {
          accent: 'border-l-green-400',
          bg: 'from-green-50/90 to-emerald-50/90',
          iconBg: 'bg-green-100/80',
          hoverBg: 'hover:from-green-100/90 hover:to-emerald-100/90',
          progressBar: 'from-green-500 to-green-600'
        }
      case 'friend_request':
        return {
          accent: 'border-l-blue-400',
          bg: 'from-blue-50/90 to-sky-50/90',
          iconBg: 'bg-blue-100/80',
          hoverBg: 'hover:from-blue-100/90 hover:to-sky-100/90',
          progressBar: 'from-blue-500 to-blue-600'
        }
      case 'challenge':
        return {
          accent: 'border-l-purple-400',
          bg: 'from-purple-50/90 to-violet-50/90',
          iconBg: 'bg-purple-100/80',
          hoverBg: 'hover:from-purple-100/90 hover:to-violet-100/90',
          progressBar: 'from-purple-500 to-purple-600'
        }
      default:
        return {
          accent: 'border-l-amber-400',
          bg: 'from-amber-50/90 to-orange-50/90',
          iconBg: 'bg-amber-100/80',
          hoverBg: 'hover:from-amber-100/90 hover:to-orange-100/90',
          progressBar: 'from-amber-500 to-amber-600'
        }
    }
  }

  const theme = getThemeColors()

  const formatTime = (timestamp) => {
    const now = new Date()
    const messageTime = new Date(timestamp)
    const diffInMinutes = Math.floor((now - messageTime) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    
    return messageTime.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  return (
    <div
      className={`
        fixed top-4 right-4 z-50 
        bg-gradient-to-br ${theme.bg} backdrop-blur-lg border-l-4 ${theme.accent}
        rounded-2xl shadow-2xl border border-white/20 p-4 md:p-5 w-80 md:w-96
        transform transition-all duration-300 ease-out
        ${isVisible && !isExiting ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
        ${notification.onClick ? `cursor-pointer hover:shadow-3xl hover:scale-[1.02] ${theme.hoverBg} hover:border-white/30` : ''}
      `}
      onClick={notification.onClick ? handleClick : undefined}
    >
      {/* Close button */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          handleClose()
        }}
        className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-white/20 transition-all duration-200 text-gray-400 hover:text-gray-600 backdrop-blur-sm"
      >
        <X size={16} />
      </button>

      <div className="flex items-start gap-3 md:gap-4">
        {/* Icon */}
        <div className={`flex-shrink-0 mt-1 p-2.5 ${theme.iconBg} backdrop-blur-sm rounded-xl shadow-lg border border-white/30`}>
          {getIcon()}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 pr-6">
          {/* Header with title and timestamp */}
          <div className="flex items-center gap-2 mb-2">
            <h4 className="font-bold text-gray-800 text-sm md:text-base">
              {notification.title}
            </h4>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Clock size={12} />
              <span>{formatTime(notification.timestamp)}</span>
            </div>
          </div>
          
          {/* Message */}
          <p className="text-gray-700 text-sm md:text-base leading-relaxed mb-3">
            {notification.message}
          </p>

          {/* Preview content for messages */}
          {notification.type === 'message' && notification.data?.content && (
            <div className="mb-3 p-3 bg-white/40 backdrop-blur-sm rounded-xl text-xs md:text-sm text-gray-600 italic border border-white/20 shadow-sm">
              <div className="flex items-start gap-2">
                <MessageCircle size={14} className="text-green-500 mt-0.5 flex-shrink-0" />
                <span>
                  &ldquo;{notification.data.content.substring(0, 80)}
                  {notification.data.content.length > 80 ? '...' : ''}&rdquo;
                </span>
              </div>
            </div>
          )}

          {/* Challenge details */}
          {notification.type === 'challenge' && notification.data && (
            <div className="mb-3 p-3 bg-white/40 backdrop-blur-sm rounded-xl border border-white/20 shadow-sm">
              <div className="flex items-center gap-2 text-xs md:text-sm text-gray-600">
                <Gamepad2 size={14} className="text-purple-500" />
                <span>
                  {notification.data.categories?.join(', ') || 'Mixed categories'} • 
                  Level {notification.data.difficulty || 1}
                </span>
              </div>
            </div>
          )}

          {/* Action hint */}
          {notification.onClick && (
            <div className="flex items-center gap-1 text-xs md:text-sm text-gray-600 font-medium bg-white/30 backdrop-blur-sm rounded-lg px-2 py-1 border border-white/20">
              <span>
                {notification.type === 'message' ? 'View conversation' : 
                 notification.type === 'challenge' ? 'View challenge' : 'View details'}
              </span>
              <ChevronRight size={12} />
            </div>
          )}
        </div>
      </div>

      {/* Progress bar for auto-dismiss */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 rounded-b-2xl overflow-hidden">
        <div 
          className={`h-full bg-gradient-to-r ${theme.progressBar} rounded-b-2xl`}
          style={{
            animation: 'progress 5s linear forwards'
          }}
        />
      </div>

      <style jsx>{`
        @keyframes progress {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  )
} 