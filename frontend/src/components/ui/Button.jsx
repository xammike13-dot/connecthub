import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  isDisabled = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  className = '',
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variants = {
    // Primary - Blue
    primary: 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-blue focus:ring-blue-500 focus:ring-offset-white',
    // Secondary - Outline blue
    secondary: 'border-2 border-blue-600 text-blue-600 hover:bg-blue-50 focus:ring-blue-500 focus:ring-offset-white',
    // Success - Green
    success: 'bg-green-600 text-white hover:bg-green-700 hover:shadow-green focus:ring-green-500 focus:ring-offset-white',
    // Danger - Red
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 focus:ring-offset-white',
    // Warning - Yellow/Orange
    warning: 'bg-yellow-500 text-white hover:bg-yellow-600 focus:ring-yellow-500 focus:ring-offset-white',
    // Outline - Neutral
    outline: 'border-2 border-neutral-300 text-neutral-700 hover:bg-neutral-50 hover:border-neutral-400 focus:ring-neutral-500 focus:ring-offset-white',
    // Ghost button
    ghost: 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 focus:ring-neutral-500',
    // Link style
    link: 'text-blue-600 hover:text-blue-700 underline focus:ring-blue-500',
    // Dark button
    dark: 'bg-neutral-900 text-white hover:bg-neutral-800 focus:ring-neutral-500 focus:ring-offset-white',
  };
  
  const sizes = {
    xs: 'px-2.5 py-1.5 text-xs',
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
    xl: 'px-8 py-4 text-xl',
  };

  return (
    <motion.button
      whileHover={{ scale: isLoading ? 1 : 1.02 }}
      whileTap={{ scale: isLoading ? 1 : 0.98 }}
      className={`
        ${baseStyles}
        ${variants[variant]}
        ${sizes[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      disabled={isLoading || isDisabled}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
      ) : leftIcon ? (
        <span className="mr-2">{leftIcon}</span>
      ) : null}
      {children}
      {!isLoading && rightIcon && (
        <span className="ml-2">{rightIcon}</span>
      )}
    </motion.button>
  );
};

export default Button;