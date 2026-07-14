import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ImageUpload from '../components/ImageUpload';
import GuidedWalkthrough from '../components/GuidedWalkthrough';
import api from '../services/apiClient';

const BusinessSetupPage = () => {
  const [step, setStep] = useState(1);
  const [profilePhoto, setProfilePhoto] = useState('');
  const [businessLogo, setBusinessLogo] = useState('');
  const [loading, setLoading] = useState(false);
  const [showWalkthrough, setShowWalkthrough] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleNext = () => {
    if (step < 2) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await api.post('/setup/business', {
        profilePhoto,
        businessLogo,
      });
      
      // Show guided walkthrough after setup
      setShowWalkthrough(true);
    } catch (error) {
      console.error('Setup failed:', error);
      const msg = error.response?.data?.message || error.response?.data?.error || 'Failed to complete setup. Please try again.';
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleWalkthroughComplete = () => {
    navigate('/business/dashboard');
  };

  const walkthroughSteps = [
    {
      title: 'Welcome',
      heading: 'Add Your First Product',
      description: 'Start by adding products to your inventory. This is how customers will discover and purchase from you.',
      actionItems: [
        'Click "Add Product" in your dashboard',
        'Upload high-quality product images',
        'Set competitive prices',
        'Publish your product to go live'
      ]
    },
    {
      title: 'Inventory',
      heading: 'Manage Your Products',
      description: 'Keep your inventory updated and monitor your product performance through the dashboard.',
      actionItems: [
        'Track product views and orders',
        'Update product details anytime',
        'Manage stock levels',
        'Analyze sales trends'
      ]
    },
    {
      title: 'Orders',
      heading: 'Fulfill Orders',
      description: 'When customers place orders, you\'ll receive notifications. Process them quickly to build your reputation.',
      actionItems: [
        'Review incoming orders',
        'Confirm order acceptance',
        'Prepare products for delivery',
        'Track order status'
      ]
    }
  ];

  const steps = [
    {
      title: 'Upload Profile Photo',
      description: 'Add a professional photo for your business profile',
      content: (
        <div className="space-y-4">
          <ImageUpload
            onUpload={(url) => setProfilePhoto(url)}
            currentImage={profilePhoto}
            aspectRatio="square"
            label="Profile Photo"
          />
        </div>
      ),
    },
    {
      title: 'Upload Business Logo',
      description: 'Add your business logo to appear on your products',
      content: (
        <div className="space-y-4">
          <ImageUpload
            onUpload={(url) => setBusinessLogo(url)}
            currentImage={businessLogo}
            aspectRatio="square"
            label="Business Logo"
          />
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-neutral-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center shadow-blue mx-auto">
            <span className="text-white font-bold text-3xl">C</span>
          </div>
          <h1 className="mt-4 text-2xl font-bold text-neutral-900">Business Setup</h1>
          <p className="mt-2 text-neutral-500">Complete your profile to start selling</p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {[1, 2].map((stepNum) => (
              <div key={stepNum} className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                    step >= stepNum
                      ? 'bg-blue-600 text-white'
                      : 'bg-neutral-200 text-neutral-500'
                  }`}
                >
                  {step > stepNum ? '✓' : stepNum}
                </div>
                {stepNum < 2 && (
                  <div
                    className={`w-full h-1 mx-2 ${
                      step > stepNum ? 'bg-blue-600' : 'bg-neutral-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-neutral-200">
          <h2 className="text-2xl font-bold text-neutral-900 mb-2">
            Step {step}: {steps[step - 1].title}
          </h2>
          <p className="text-neutral-500 mb-6">{steps[step - 1].description}</p>

          {steps[step - 1].content}

          <div className="mt-8 flex justify-between">
            {step > 1 ? (
              <button
                type="button"
                onClick={handleBack}
                className="px-6 py-3 border border-neutral-300 rounded-lg bg-white hover:bg-neutral-50 transition-colors text-neutral-700 font-medium"
              >
                Back
              </button>
            ) : (
              <div />
            )}

            {step < 2 ? (
              <button
                type="button"
                onClick={handleNext}
                className="btn-primary px-6 py-3"
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="btn-primary px-6 py-3 flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Completing...
                  </>
                ) : (
                  'Finish'
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Guided Walkthrough */}
      <GuidedWalkthrough
        steps={walkthroughSteps}
        isOpen={showWalkthrough}
        onClose={() => navigate('/business/dashboard')}
        onComplete={handleWalkthroughComplete}
        storageKey="business_walkthrough"
      />
    </div>
  );
};

export default BusinessSetupPage;
