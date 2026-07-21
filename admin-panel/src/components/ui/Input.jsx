import { forwardRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

const Input = forwardRef(({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  type = 'text',
  fullWidth = false,
  className = '',
  containerClassName = '',
  showPasswordToggle = false,
  ...props
}, ref) => {
  const [showPassword, setShowPassword] = useState(false);
  const inputType = showPasswordToggle
    ? (showPassword ? 'text' : 'password')
    : type;

  return (
    <div className={`mb-4 ${containerClassName}`}>
      {label && (
        <label className="block text-sm font-medium text-neutral-700 mb-1">
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
            {leftIcon}
          </div>
        )}
        <input
          ref={ref}
          type={inputType}
          className={`
            w-full px-4 py-3 border rounded-lg
            transition-all duration-200
            focus:outline-none focus:ring-2 focus:ring-offset-2
            disabled:cursor-not-allowed
            ${leftIcon ? 'pl-10' : ''}
            ${showPasswordToggle ? 'pr-10' : ''}
            ${error
              ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
              : 'border-neutral-300 focus:ring-blue-500 focus:border-blue-500'
            }
            ${fullWidth ? 'w-full' : ''}
            ${className.includes('bg-') ? '' : 'bg-white disabled:bg-neutral-50'}
            ${className.includes('text-') ? '' : 'text-neutral-900'}
            ${className.includes('placeholder-') ? '' : 'placeholder-neutral-400'}
            ${className.includes('focus:ring-offset-') ? '' : 'focus:ring-offset-white'}
            ${className}
          `}
          {...props}
        />
        {showPasswordToggle && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-600"
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        )}
        {rightIcon && !showPasswordToggle && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            {rightIcon}
          </div>
        )}
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
      {helperText && !error && (
        <p className="mt-1 text-sm text-neutral-500">{helperText}</p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;