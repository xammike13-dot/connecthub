import { useState, useEffect } from 'react';

const CountdownTimer = ({ 
  seconds = 60, 
  onExpire, 
  onTick,
  className = '',
  format = 'mm:ss' 
}) => {
  const [timeLeft, setTimeLeft] = useState(seconds);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    setTimeLeft(seconds);
    setIsExpired(false);
  }, [seconds]);

  useEffect(() => {
    if (timeLeft <= 0) {
      setIsExpired(true);
      if (onExpire) onExpire();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        const newTime = prev - 1;
        if (onTick) onTick(newTime);
        return newTime;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, onExpire, onTick]);

  const formatTime = (totalSeconds) => {
    const minutes = Math.floor(totalSeconds / 60);
    const remainingSeconds = totalSeconds % 60;

    if (format === 'mm:ss') {
      return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    } else if (format === 'seconds') {
      return `${remainingSeconds}s`;
    }
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <span className={className}>
      {isExpired ? 'Expired' : formatTime(timeLeft)}
    </span>
  );
};

export default CountdownTimer;
