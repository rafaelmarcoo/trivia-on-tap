'use client'

import { useState, useEffect } from 'react'
import { MessageCircle, UserPlus, X, User } from 'lucide-react'
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
        return <MessageCircle size={20} className="text-amber-600" />
      case 'friend_request':
        return <UserPlus size={20} className="text-amber-700" />
      default:
        return <User size={20} className="text-amber-500" />
    }
  }

  const getAccentColor = () => {
    switch (notification.type) {
      case 'message':
        return 'border-l-amber-500'
      case 'friend_request':
        return 'border-l-amber-600'
      default:
        return 'border-l-amber-400'
    }
  }

  return (
    <div
      className={`
        fixed top-4 right-4 z-50 
        bg-gradient-to-br from-amber-50 to-orange-50 backdrop-blur-sm border-l-4 ${getAccentColor()}
        rounded-lg shadow-xl border border-amber-200 p-4 min-w-80 max-w-96
        transform transition-all duration-300 ease-out
        ${isVisible && !isExiting ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
        ${notification.onClick ? 'cursor-pointer hover:shadow-2xl hover:scale-[1.02] hover:from-amber-100 hover:to-orange-100' : ''}
      `}
      onClick={notification.onClick ? handleClick : undefined}
    >
      {/* Close button */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          handleClose()
        }}
        className="absolute top-2 right-2 p-1 rounded-full hover:bg-amber-100 transition-colors text-amber-400 hover:text-amber-600"
      >
        <X size={16} />
      </button>

      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 mt-0.5 p-2 bg-amber-100 rounded-full">
          {getIcon()}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold text-amber-900 text-sm">
              {notification.title}
            </h4>
            <span className="text-xs text-amber-600">
              {new Date(notification.timestamp).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </span>
          </div>
          
          <p className="text-amber-800 text-sm leading-relaxed">
            {notification.message}
          </p>

          {/* Preview content for messages */}
          {notification.type === 'message' && notification.data?.content && (
            <div className="mt-2 p-2 bg-amber-100/50 rounded text-xs text-amber-700 italic border border-amber-200">
              &ldquo;{notification.data.content.substring(0, 60)}
              {notification.data.content.length > 60 ? '...' : ''}&rdquo;
            </div>
          )}

          {/* Action hint */}
          {notification.onClick && (
            <div className="mt-2 text-xs text-amber-700 font-medium">
              Click to {notification.type === 'message' ? 'view message' : 'view request'}
            </div>
          )}
        </div>
      </div>

      {/* Progress bar for auto-dismiss */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-200 rounded-b-lg overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-amber-500 to-amber-600"
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