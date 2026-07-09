import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';

const Alert = ({
  type = 'info',
  title,
  message,
  onClose,
  autoClose = false,
  autoCloseDuration = 5000,
  showIcon = true,
  showCloseButton = true,
  className = '',
}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (autoClose) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        onClose?.();
      }, autoCloseDuration);
      return () => clearTimeout(timer);
    }
  }, [autoClose, autoCloseDuration, onClose]);

  const handleClose = () => {
    setIsVisible(false);
    onClose?.();
  };

  const types = {
    success: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-800',
      icon: <CheckCircle className="w-5 h-5 text-green-500" />,
      titleColor: 'text-green-800',
    },
    error: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-800',
      icon: <AlertCircle className="w-5 h-5 text-red-500" />,
      titleColor: 'text-red-800',
    },
    warning: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-800',
      icon: <AlertTriangle className="w-5 h-5 text-yellow-500" />,
      titleColor: 'text-yellow-800',
    },
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-800',
      icon: <Info className="w-5 h-5 text-blue-500" />,
      titleColor: 'text-blue-800',
    },
  };

  const currentType = types[type];

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className={`
            ${currentType.bg}
            border-l-4 ${currentType.border}
            p-4 rounded-lg shadow-md
            ${className}
          `}
        >
          <div className="flex items-start">
            {showIcon && (
              <div className="flex-shrink-0 mr-3">
                {currentType.icon}
              </div>
            )}
            <div className="flex-1">
              {title && (
                <h4 className={`font-semibold ${currentType.titleColor} mb-1`}>
                  {title}
                </h4>
              )}
              {message && (
                <p className={`text-sm ${currentType.text}`}>
                  {message}
                </p>
              )}
            </div>
            {showCloseButton && (
              <button
                onClick={handleClose}
                className={`flex-shrink-0 ml-3 ${currentType.text} hover:opacity-75 transition-opacity`}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Alert container for toast notifications
export const AlertContainer = ({ alerts, onRemove }) => {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-3 max-w-sm">
      <AnimatePresence>
        {alerts.map((alert) => (
          <Alert
            key={alert.id}
            type={alert.type}
            title={alert.title}
            message={alert.message}
            autoClose={alert.autoClose !== false}
            autoCloseDuration={alert.duration || 5000}
            onClose={() => onRemove(alert.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};

export default Alert;