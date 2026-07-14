import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ImageUpload from '../components/ImageUpload';
import GuidedWalkthrough from '../components/GuidedWalkthrough';
import api from '../services/apiClient';

const LandlordSetupPage = () => {
  const [step, setStep] = useState(1);
  const [profilePhoto, setProfilePhoto] = useState('');
  const [businessLogo, setBusinessLogo] = useState('');
  const [loading, setLoading] = useState(false);
  const [showWalkthrough, setShowWalkthrough] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const { refreshProfile } = useAuth();

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await api.post('/setup/landlord', {
        profilePhoto,
        businessLogo,
      });

      // Refresh the user profile to sync setupCompleted: true in context
      await refreshProfile();
      
      // Show guided walkthrough after setup
      setShowWalkthrough(true);
    } catch (error) {
      console.error('Setup failed:', error);
      const serverMessage = error.response?.data?.message || 'Failed to complete setup. Please try again.';
      alert(serverMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleWalkthroughComplete = () => {
    navigate('/landlord/dashboard');
  };

  const walkthroughSteps = [
    {
      title: 'Welcome',
      heading: 'Add Your First Property',
      description: 'Start by listing your rental properties. This is how tenants will discover and book from you.',
      actionItems: [
        'Click "Add Property" in your dashboard',
        'Upload high-quality property photos',
        'Set competitive rental prices',
        'Publish your property to go live'
      ]
    },
    {
      title: 'Properties',
      heading: 'Manage Your Properties',
      description: 'Keep your property listings updated and monitor your rental performance through the dashboard.',
      actionItems: [
        'Track property views and inquiries',
        'Update property details anytime',
        'Manage availability and pricing',
        'Analyze booking trends'
      ]
    },
    {
      title: 'Bookings',
      heading: 'Manage Bookings',
      description: 'When tenants request bookings, you\'ll receive notifications. Review and accept them quickly to fill your vacancies.',
      actionItems: [
        'Review incoming booking requests',
        'Accept or decline requests',
        'Set move-in dates',
        'Track payment status'
      ]
    }
  ];

  const steps = [
    {
      title: 'Upload Profile Photo',
      description: 'Add a professional photo to help tenants recognize you',
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
      description: 'Add your business or property management logo',
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
    {
      title: 'Finish',
      description: 'Review your information and complete setup',
      content: (
        <div className="space-y-4">
          <div className="bg-neutral-50 rounded-lg p-4">
            <h3 className="font-semibold text-neutral-900 mb-2">Setup Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-600">Name:</span>
                <span className="font-medium">{user?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-600">Email:</span>
                <span className="font-medium">{user?.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-600">Profile Photo:</span>
                <span className="font-medium">{profilePhoto ? '✓ Uploaded' : 'Not uploaded'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-600">Business Logo:</span>
                <span className="font-medium">{businessLogo ? '✓ Uploaded' : 'Not uploaded'}</span>
              </div>
            </div>
          </div>
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
          <h1 className="mt-4 text-2xl font-bold text-neutral-900">Landlord Setup</h1>
          <p className="mt-2 text-neutral-500">Complete your profile to get started</p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {[1, 2, 3].map((stepNum) => (
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
                {stepNum < 3 && (
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

            {step < 3 ? (
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
        onClose={() => navigate('/landlord/dashboard')}
        onComplete={handleWalkthroughComplete}
        storageKey="landlord_walkthrough"
      />
    </div>
  );
};

export default LandlordSetupPage;
