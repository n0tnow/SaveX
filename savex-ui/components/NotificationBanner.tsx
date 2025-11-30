'use client';

import { useState, useEffect } from 'react';

type NotificationType = 'timing' | 'batch' | 'route' | 'price' | 'info';
type NotificationSeverity = 'info' | 'warning' | 'success' | 'error';

interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  action?: string;
  actionLabel?: string;
  severity: NotificationSeverity;
  dismissible: boolean;
}

interface NotificationBannerProps {
  fromToken?: string;
  toToken?: string;
  amount?: string;
  batchQueueSize?: number;
  timingSavings?: number;
  bestHour?: number;
  currentHour?: number;
}

export function NotificationBanner({
  fromToken,
  toToken,
  amount,
  batchQueueSize = 0,
  timingSavings = 0,
  bestHour,
  currentHour,
}: NotificationBannerProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const newNotifications: Notification[] = [];

    // Timing optimization notification
    if (timingSavings > 0.1 && bestHour !== undefined && currentHour !== undefined) {
      const hoursUntilBest = bestHour > currentHour
        ? bestHour - currentHour
        : 24 - currentHour + bestHour;

      newNotifications.push({
        id: 'timing',
        type: 'timing',
        message: `⏰ Wait ${hoursUntilBest} hour${hoursUntilBest > 1 ? 's' : ''} to save ${timingSavings.toFixed(2)}%!`,
        action: 'schedule',
        actionLabel: 'Schedule Swap',
        severity: timingSavings > 0.2 ? 'warning' : 'info',
        dismissible: true,
      });
    } else if (timingSavings <= 0.05 && currentHour === bestHour) {
      newNotifications.push({
        id: 'timing-good',
        type: 'timing',
        message: '✅ Best time to swap is NOW! Spreads are at their lowest.',
        severity: 'success',
        dismissible: true,
      });
    }

    // Batch queue notification
    if (batchQueueSize === 1) {
      newNotifications.push({
        id: 'batch-1',
        type: 'batch',
        message: '📦 Add 1 more swap to enable batch execution and save 10%!',
        severity: 'info',
        dismissible: true,
      });
    } else if (batchQueueSize >= 2 && batchQueueSize < 5) {
      const savings = batchQueueSize === 2 ? 10 : batchQueueSize === 3 ? 20 : 30;
      newNotifications.push({
        id: 'batch-ready',
        type: 'batch',
        message: `💰 Execute batch now to save ${savings}%! (${batchQueueSize} swaps queued)`,
        action: 'execute-batch',
        actionLabel: 'Execute Batch',
        severity: 'success',
        dismissible: true,
      });
    } else if (batchQueueSize >= 5) {
      newNotifications.push({
        id: 'batch-optimal',
        type: 'batch',
        message: `🎉 Optimal batch size reached! Execute now to save 40-50% on fees! (${batchQueueSize} swaps)`,
        action: 'execute-batch',
        actionLabel: 'Execute Batch',
        severity: 'success',
        dismissible: false,
      });
    }

    // Price alert notification (example)
    if (fromToken === 'XLM' && toToken === 'USDC' && amount) {
      const amountNum = parseFloat(amount);
      if (amountNum > 1000) {
        newNotifications.push({
          id: 'large-swap',
          type: 'price',
          message: '⚠️ Large swap detected. Consider splitting into smaller batches to reduce slippage.',
          severity: 'warning',
          dismissible: true,
        });
      }
    }

    // Route optimization notification
    if (fromToken && toToken && fromToken !== toToken && amount) {
      const hasCommonPair = (fromToken === 'XLM' || toToken === 'XLM') ||
                           (fromToken === 'USDC' || toToken === 'USDC');

      if (!hasCommonPair) {
        newNotifications.push({
          id: 'route-multi-hop',
          type: 'route',
          message: '🗺️ Multi-hop routing available. Check route visualizer for best path.',
          severity: 'info',
          dismissible: true,
        });
      }
    }

    setNotifications(newNotifications);
  }, [fromToken, toToken, amount, batchQueueSize, timingSavings, bestHour, currentHour]);

  const dismissNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const getSeverityStyle = (severity: NotificationSeverity) => {
    switch (severity) {
      case 'success':
        return 'bg-gray-800 border-green-500/50 text-green-400';
      case 'warning':
        return 'bg-gray-800 border-orange-500/50 text-orange-400';
      case 'error':
        return 'bg-gray-800 border-red-500/50 text-red-400';
      case 'info':
      default:
        return 'bg-gray-800 border-blue-500/50 text-blue-400';
    }
  };

  const getSeverityIcon = (severity: NotificationSeverity) => {
    switch (severity) {
      case 'success':
        return '✅';
      case 'warning':
        return '⚠️';
      case 'error':
        return '❌';
      case 'info':
      default:
        return 'ℹ️';
    }
  };

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`border-2 rounded-lg p-3 ${getSeverityStyle(notification.severity)} animate-slideIn`}
        >
          <div className="flex items-start justify-between gap-3">
            {/* Icon + Message */}
            <div className="flex items-start gap-2 flex-1">
              <span className="text-lg">{getSeverityIcon(notification.severity)}</span>
              <div className="flex-1">
                <p className="text-sm font-semibold">{notification.message}</p>
              </div>
            </div>

            {/* Action + Dismiss */}
            <div className="flex items-center gap-2">
              {notification.action && notification.actionLabel && (
                <button
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                    notification.severity === 'success'
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : notification.severity === 'warning'
                      ? 'bg-orange-600 text-white hover:bg-orange-700'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                  onClick={() => {
                    // Handle action (to be implemented)
                    console.log('Action:', notification.action);
                  }}
                >
                  {notification.actionLabel}
                </button>
              )}

              {notification.dismissible && (
                <button
                  onClick={() => dismissNotification(notification.id)}
                  className="text-gray-400 hover:text-gray-200 text-lg"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>
      ))}

      <style jsx>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-slideIn {
          animation: slideIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
