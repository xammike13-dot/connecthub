import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

const PasswordInput = ({ 
  id, 
  name, 
  value, 
  onChange, 
  placeholder = 'Enter password',
  autoComplete = 'current-password',
  required = false,
  className = 'input-field',
  ...props 
}) => {
  const [showPassword, setShowPassword] = useState(false);

  const togglePassword = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="relative">
      <input
        id={id}
        name={name}
        type={showPassword ? 'text' : 'password'}
        autoComplete={autoComplete}
        required={required}
        value={value}
        onChange={onChange}
        className={className}
        placeholder={placeholder}
        {...props}
      />
      <button
        type="button"
        onClick={togglePassword}
        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-400 hover:text-neutral-600 focus:outline-none"
        tabIndex="-1"
      >
        {showPassword ? (
          <EyeOff className="w-5 h-5" />
        ) : (
          <Eye className="w-5 h-5" />
        )}
      </button>
    </div>
  );
};

export default PasswordInput;
