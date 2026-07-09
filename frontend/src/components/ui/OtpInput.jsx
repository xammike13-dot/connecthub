import { useState, useEffect, useRef } from 'react';

const OtpInput = ({ length = 6, value, onChange, onComplete }) => {
  const [otp, setOtp] = useState(new Array(length).fill(''));
  const inputRefs = useRef([]);

  useEffect(() => {
    // Initialize with provided value
    if (value) {
      const otpArray = value.split('');
      const newOtp = new Array(length).fill('');
      otpArray.forEach((char, index) => {
        if (index < length) newOtp[index] = char;
      });
      setOtp(newOtp);
    }
  }, [value, length]);

  const handleChange = (e, index) => {
    const val = e.target.value;
    
    // Only allow numbers
    if (!/^\d*$/.test(val)) return;

    const newOtp = [...otp];
    newOtp[index] = val.slice(-1); // Take only last character
    setOtp(newOtp);

    // Call onChange with the full OTP
    const otpValue = newOtp.join('');
    if (onChange) {
      onChange(otpValue);
    }

    // Auto-focus next input
    if (val && index < length - 1) {
      inputRefs.current[index + 1].focus();
    }

    // Call onComplete when all digits are filled
    if (otpValue.length === length && onComplete) {
      onComplete(otpValue);
    }
  };

  const handleKeyDown = (e, index) => {
    // Handle backspace
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, length);
    
    if (!/^\d+$/.test(pastedData)) return;

    const newOtp = [...otp];
    pastedData.split('').forEach((char, index) => {
      if (index < length) newOtp[index] = char;
    });
    setOtp(newOtp);

    const otpValue = newOtp.join('');
    if (onChange) {
      onChange(otpValue);
    }

    if (otpValue.length === length && onComplete) {
      onComplete(otpValue);
    }

    // Focus the last filled input or the next empty one
    const nextIndex = Math.min(pastedData.length, length - 1);
    inputRefs.current[nextIndex].focus();
  };

  return (
    <div className="flex gap-2 justify-center">
      {otp.map((digit, index) => (
        <input
          key={index}
          ref={(ref) => (inputRefs.current[index] = ref)}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={digit}
          onChange={(e) => handleChange(e, index)}
          onKeyDown={(e) => handleKeyDown(e, index)}
          onPaste={handlePaste}
          className="w-12 h-12 text-center text-2xl font-bold border-2 border-neutral-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
        />
      ))}
    </div>
  );
};

export default OtpInput;
