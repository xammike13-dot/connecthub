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
  const [propertyName, setPropertyName] = useState('');
  const [propertyDescription, setPropertyDescription] = useState('');
  const [propertyLocation, setPropertyLocation] = useState('');
  const [contactDetails, setContactDetails] = useState('');

  const [loading, setLoading] = useState(false);
  const [showWalkthrough, setShowWalkthrough] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && user.onboardingCompleted) {
      navigate('/landlord/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const handleNext = () => {
    if (step === 2) {
      if (!propertyName.trim() || !propertyDescription.trim() || !propertyLocation.trim() || !contactDetails.trim()) {
        alert('Please fill in all Property details.');
        return;
      }
    }
    if (step === 3) {
      if (!businessLogo) {
        alert('Please upload your Property/Business Logo.');
        return;
      }
    }
    if (step < 4) {
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
    if (!profilePhoto) {
      alert('Please upload a Profile Photo.');
      return;
    }
    if (!businessLogo) {
      alert('Please upload a Property/Business Logo.');
      return;
    }
    if (!propertyName.trim() || !propertyDescription.trim() || !propertyLocation.trim() || !contactDetails.trim()) {
      alert('Please fill in all details.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/setup/landlord', {
        profilePhoto,
        businessLogo,
        propertyName,
        propertyDescription,
        propertyLocation,
        contactDetails,
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
      title: 'Properties',
      heading: 'Add Rental Properties',
      description: 'Easily list your single rooms, bedsitters, apartments, or hostels by navigating to the Properties page and clicking "Add Property".',
      actionItems: [
        'Go to Properties',
        'Click "Add Property"',
        'Fill in property specifications',
        'Save your draft or publish'
      ]
    },
    {
      title: 'Photos',
      heading: 'Upload Property Photos',
      description: 'Attract tenants by uploading clear, bright photos of your rooms, bathroom, kitchen, and exterior views.',
      actionItems: [
        'Capture clear landscape photos',
        'Add multiple photos per room',
        'Rearrange photo order',
        'Save changes'
      ]
    },
    {
      title: 'Pricing',
      heading: 'Set Rent Prices',
      description: 'Configure standard monthly rent rates, initial security deposits, and any utility or amenity fees transparently.',
      actionItems: [
        'Input monthly rent amount',
        'Specify refundable deposits',
        'Clarify water/electricity terms',
        'Show complete cost breakdown'
      ]
    },
    {
      title: 'Vacancies',
      heading: 'Manage Vacancies',
      description: 'Toggle room availability states instantly as tenants move in or check out, keeping your listings fresh and accurate.',
      actionItems: [
        'Monitor occupied vs vacant units',
        'Mark rooms as occupied',
        'Mark rooms as vacant',
        'Update total room counts'
      ]
    },
    {
      title: 'Bookings',
      heading: 'Receive Bookings',
      description: 'Review incoming rental booking requests from students and other tenants. Accept or schedule viewings instantly.',
      actionItems: [
        'Get notified of new bookings',
        'View tenant profiles',
        'Approve and reserve rooms',
        'Coordinate check-in dates'
      ]
    },
    {
      title: 'Edit Listings',
      heading: 'Edit Listings Anytime',
      description: 'Keep your listings updated by editing rental descriptions, amenities, guidelines, and rules whenever needed.',
      actionItems: [
        'Update amenities lists',
        'Rewrite descriptive details',
        'Adjust rent pricing dynamically',
        'Modify safety/house rules'
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
            onUpload={(img) => setProfilePhoto(typeof img === 'string' ? img : img?.url || '')}
            currentImage={profilePhoto}
            aspectRatio="square"
            label="Profile Photo"
          />
        </div>
      ),
    },
    {
      title: 'Property Details',
      description: 'Add name, description, and location of your rental business',
      content: (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-neutral-800 mb-2">
              Property/Business Name *
            </label>
            <input
              type="text"
              value={propertyName}
              onChange={(e) => setPropertyName(e.target.value)}
              className="input-field"
              placeholder="e.g. Goshen Student Hostels"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-neutral-800 mb-2">
              Property Description *
            </label>
            <textarea
              value={propertyDescription}
              onChange={(e) => setPropertyDescription(e.target.value)}
              className="input-field min-h-[100px]"
              placeholder="Describe your property, rules, and amenities..."
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-neutral-800 mb-2">
              Property Location *
            </label>
            <input
              type="text"
              value={propertyLocation}
              onChange={(e) => setPropertyLocation(e.target.value)}
              className="input-field"
              placeholder="e.g. near Moi University Main Gate"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-neutral-800 mb-2">
              Contact Details *
            </label>
            <input
              type="text"
              value={contactDetails}
              onChange={(e) => setContactDetails(e.target.value)}
              className="input-field"
              placeholder="e.g. Phone: +254712345678, WhatsApp: +254712345678"
              required
            />
          </div>
        </div>
      ),
    },
    {
      title: 'Upload Property Logo',
      description: 'Add your property management or business logo',
      content: (
        <div className="space-y-4">
          <ImageUpload
            onUpload={(img) => setBusinessLogo(typeof img === 'string' ? img : img?.url || '')}
            currentImage={businessLogo}
            aspectRatio="square"
            label="Property/Business Logo"
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
                <span className="text-neutral-600">Property Name:</span>
                <span className="font-medium">{propertyName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-600">Property Location:</span>
                <span className="font-medium">{propertyLocation}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-600">Contact Details:</span>
                <span className="font-medium">{contactDetails}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-600">Profile Photo:</span>
                <span className="font-medium">{profilePhoto ? '✓ Uploaded' : 'Not uploaded'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-600">Property Logo:</span>
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
            {[1, 2, 3, 4].map((stepNum) => (
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
                {stepNum < 4 && (
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

            <div className="flex gap-3">
              {step < 4 ? (
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
