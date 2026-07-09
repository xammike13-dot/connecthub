import { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';

const GuidedWalkthrough = ({ 
  steps, 
  isOpen, 
  onClose, 
  onComplete,
  storageKey 
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    // Check if walkthrough was already completed
    if (storageKey) {
      const completed = localStorage.getItem(`${storageKey}_completed`);
      if (completed) {
        onClose();
      }
    }
  }, [storageKey, onClose]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    if (storageKey) {
      localStorage.setItem(`${storageKey}_completed`, 'true');
    }
    if (onComplete) onComplete();
    onClose();
  };

  const handleSkip = () => {
    if (storageKey) {
      localStorage.setItem(`${storageKey}_completed`, 'true');
    }
    onClose();
  };

  if (!isOpen) return null;

  const step = steps[currentStep];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">{currentStep + 1}</span>
            </div>
            <span className="text-white font-semibold">
              {step.title}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {step.icon && (
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                {step.icon}
              </div>
            </div>
          )}
          
          <h3 className="text-xl font-bold text-neutral-900 mb-2">
            {step.heading}
          </h3>
          
          <p className="text-neutral-600 mb-6">
            {step.description}
          </p>

          {step.actionItems && (
            <div className="space-y-2 mb-6">
              {step.actionItems.map((item, index) => (
                <div key={index} className="flex items-start gap-2">
                  <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-sm text-neutral-700">{item}</span>
                </div>
              ))}
            </div>
          )}

          {/* Progress */}
          <div className="flex gap-1 mb-6">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`flex-1 h-1 rounded-full ${
                  index <= currentStep ? 'bg-blue-600' : 'bg-neutral-200'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-neutral-50 border-t border-neutral-200 flex items-center justify-between">
          <button
            onClick={handleSkip}
            className="text-neutral-600 hover:text-neutral-900 text-sm font-medium"
          >
            Skip Tour
          </button>

          <div className="flex gap-2">
            {currentStep > 0 && (
              <button
                onClick={handlePrevious}
                className="px-4 py-2 border border-neutral-300 rounded-lg bg-white hover:bg-neutral-50 transition-colors text-neutral-700 font-medium flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>
            )}
            
            <button
              onClick={handleNext}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 transition-colors text-white font-medium rounded-lg flex items-center gap-1"
            >
              {currentStep === steps.length - 1 ? 'Finish' : 'Next'}
              {currentStep < steps.length - 1 && <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GuidedWalkthrough;
