'use client'

import { useNotifications } from './InGameNotificationProvider'
import NotificationToast from './NotificationToast'

export default function NotificationOverlay() {
  const { notifications, removeNotification } = useNotifications()

  if (notifications.length === 0) {
    return null
  }

  return (
    <div className="fixed inset-0 pointer-events-none z-40">
      <div className="relative w-full h-full">
        {notifications.map((notification, index) => {
          // Responsive positioning
          const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
          const topOffset = isMobile ? 16 + (index * 110) : 16 + (index * 120)
          const rightOffset = isMobile ? 8 : 16
          
          return (
            <div
              key={notification.id}
              className="pointer-events-auto"
              style={{
                position: 'absolute',
                top: `${topOffset}px`,
                right: `${rightOffset}px`,
                zIndex: 50 + index, // Ensure proper stacking
                transition: 'all 0.3s ease-out',
                transform: `translateY(${index * (isMobile ? -2 : -4)}px)` // Slight staggered effect
              }}
            >
              <NotificationToast
                notification={notification}
                onRemove={removeNotification}
              />
            </div>
          )
        })}
      </div>
      
      {/* Background overlay for multiple notifications */}
      {notifications.length > 1 && (
        <div 
          className="fixed inset-0 bg-black/5 backdrop-blur-[1px] pointer-events-none transition-opacity duration-300"
          style={{ zIndex: 39 }}
        />
      )}
    </div>
  )
} 