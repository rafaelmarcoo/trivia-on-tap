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
        return <MessageCircle size={20} className="text-blue-500" />
      case 'friend_request':
        return <UserPlus size={20} className="text-green-500" />
      default:
        return <User size={20} className="text-gray-500" />
    }
  }

  const getAccentColor = () => {
    switch (notification.type) {
      case 'message':
        return 'border-l-blue-500'
      case 'friend_request':
        return 'border-l-green-500'
      default:
        return 'border-l-gray-500'
    }
  }

  return (
    <div
      className={`
        fixed top-4 right-4 z-50 
        bg-white/95 backdrop-blur-sm border-l-4 ${getAccentColor()}
        rounded-lg shadow-xl p-4 min-w-80 max-w-96
        transform transition-all duration-300 ease-out
        ${isVisible && !isExiting ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
        ${notification.onClick ? 'cursor-pointer hover:shadow-2xl hover:scale-[1.02]' : ''}
      `}
      onClick={notification.onClick ? handleClick : undefined}
    >
      {/* Close button */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          handleClose()
        }}
        className="absolute top-2 right-2 p-1 rounded-full hover:bg-gray-100 transition-colors"
      >
        <X size={16} className="text-gray-400" />
      </button>

      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 mt-0.5">
          {getIcon()}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold text-gray-900 text-sm">
              {notification.title}
            </h4>
            <span className="text-xs text-gray-500">
              {new Date(notification.timestamp).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </span>
          </div>
          
          <p className="text-gray-700 text-sm leading-relaxed">
            {notification.message}
          </p>

          {/* Preview content for messages */}
          {notification.type === 'message' && notification.data?.content && (
            <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600 italic">
              "{notification.data.content.substring(0, 60)}
              {notification.data.content.length > 60 ? '...' : ''}"
            </div>
          )}

          {/* Action hint */}
          {notification.onClick && (
            <div className="mt-2 text-xs text-blue-600">
              Click to {notification.type === 'message' ? 'view message' : 'view request'}
            </div>
          )}
        </div>
      </div>

      {/* Progress bar for auto-dismiss */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200 rounded-b-lg overflow-hidden">
        <div 
          className="h-full bg-blue-500 animate-pulse"
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