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
        {notifications.map((notification, index) => (
          <div
            key={notification.id}
            className="pointer-events-auto"
            style={{
              position: 'absolute',
              top: `${16 + index * 120}px`, // Stack notifications vertically
              right: '16px',
              zIndex: 50 + index // Ensure proper stacking
            }}
          >
            <NotificationToast
              notification={notification}
              onRemove={removeNotification}
            />
          </div>
        ))}
      </div>
    </div>
  )
} 