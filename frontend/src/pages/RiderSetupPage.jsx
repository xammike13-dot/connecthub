import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ImageUpload from '../components/ImageUpload';
import GuidedWalkthrough from '../components/GuidedWalkthrough';
import api from '../services/apiClient';

const RiderSetupPage = () => {
  const [step, setStep] = useState(1);
  const [profilePhoto, setProfilePhoto] = useState('');
  const [motorcyclePhoto, setMotorcyclePhoto] = useState('');
  const [selectedWorkingAreas, setSelectedWorkingAreas] = useState([]);
  const [workingHours, setWorkingHours] = useState({
    start: '06:00',
    end: '22:00',
  });
  const [dayRatePerKm, setDayRatePerKm] = useState('25');
  const [nightRatePerKm, setNightRatePerKm] = useState('35');
  const [loading, setLoading] = useState(false);
  const [showWalkthrough, setShowWalkthrough] = useState(false);
  const [initializedData, setInitializedData] = useState(false);
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();

  // Instrumentation Logs
  useEffect(() => {
    console.log('[RiderSetupPage] MOUNTED');
    return () => {
      console.log('[RiderSetupPage] UNMOUNTED');
    };
  }, []);

  useEffect(() => {
    console.log('[RiderSetupPage] user or initializedData updated:', {
      userExists: !!user,
      onboardingCompleted: user?.onboardingCompleted,
      initializedData
    });
    if (user) {
      if (user.onboardingCompleted && !showWalkthrough) {
        console.log('[RiderSetupPage] Redirecting to /rider/dashboard because onboardingCompleted is true and walkthrough is not active');
        navigate('/rider/dashboard', { replace: true });
        return;
      }
      if (!initializedData) {
        console.log('[RiderSetupPage] Initializing form data from user:', user);
        if (user.profilePhoto || user.avatar) {
          setProfilePhoto(user.profilePhoto || user.avatar);
        }
        if (user.riderProfile?.motorcycle?.photo) {
          setMotorcyclePhoto(user.riderProfile.motorcycle.photo);
        }
        if (user.riderProfile?.workingArea?.selectedWorkingAreas) {
          setSelectedWorkingAreas(user.riderProfile.workingArea.selectedWorkingAreas);
        }
        if (user.riderProfile?.workingHours?.start || user.riderProfile?.workingHours?.end) {
          setWorkingHours({
            start: user.riderProfile.workingHours.start || '06:00',
            end: user.riderProfile.workingHours.end || '22:00',
          });
        }
        if (user.riderProfile?.dayRatePerKm) {
          setDayRatePerKm(String(user.riderProfile.dayRatePerKm));
        }
        if (user.riderProfile?.nightRatePerKm) {
          setNightRatePerKm(String(user.riderProfile.nightRatePerKm));
        }
        setInitializedData(true);
      }
    }
  }, [user, navigate, initializedData, showWalkthrough]);

  const handleNext = () => {
    if (step === 1) {
      if (!profilePhoto) {
        alert('Please upload a Profile Photo.');
        return;
      }
    }
    if (step === 2) {
      if (!motorcyclePhoto) {
        alert('Please upload a Motorcycle Photo.');
        return;
      }
    }
    if (step === 3) {
      if (selectedWorkingAreas.length === 0) {
        alert('Please select at least one Working Area.');
        return;
      }
    }
    if (step === 4) {
      if (!workingHours.start || !workingHours.end) {
        alert('Please fill in both Start and End times.');
        return;
      }
    }
    if (step < 5) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSubmit = async () => {
    if (!profilePhoto) {
      alert('Please upload a Profile Photo.');
      return;
    }
    if (!motorcyclePhoto) {
      alert('Please upload a Motorcycle Photo.');
      return;
    }
    if (selectedWorkingAreas.length === 0) {
      alert('Please select at least one Working Area.');
      return;
    }
    if (!dayRatePerKm || !nightRatePerKm) {
      alert('Please set both Day Rate and Night Rate.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/setup/rider', {
        profilePhoto,
        motorcyclePhoto,
        workingArea: {
          county: 'Uasin Gishu',
          town: 'Eldoret',
          serviceRadius: '10',
          selectedWorkingAreas,
        },
        workingHours,
        dayRatePerKm: parseFloat(dayRatePerKm),
        nightRatePerKm: parseFloat(nightRatePerKm),
      });

      // Show guided walkthrough after setup
      setShowWalkthrough(true);

      // Refresh the user profile to sync setupCompleted: true in context
      await refreshProfile();
    } catch (error) {
      console.error('Setup failed:', error);
      const serverMessage = error.response?.data?.message || 'Failed to complete setup. Please try again.';
      alert(serverMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSkipSetup = async () => {
    setLoading(true);
    try {
      const defaultPhoto = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80";
      const defaultMoto = "https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=500&q=80";
      await api.post('/setup/rider', {
        profilePhoto: defaultPhoto,
        motorcyclePhoto: defaultMoto,
        workingArea: {
          county: 'Uasin Gishu',
          town: 'Eldoret',
          serviceRadius: '10',
          selectedWorkingAreas: ['Stage'],
        },
        workingHours: {
          start: '06:00',
          end: '22:00',
        },
        dayRatePerKm: 25,
        nightRatePerKm: 35,
      });

      // Show guided walkthrough after setup
      setShowWalkthrough(true);

      // Refresh the user profile to sync setupCompleted: true in context
      await refreshProfile();
    } catch (error) {
      console.error('Skip setup failed:', error);
      alert('Failed to skip setup. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleWalkthroughComplete = () => {
    navigate('/rider/dashboard');
  };

  const walkthroughSteps = [
    {
      title: 'Welcome',
      heading: 'Go Online to Start Receiving Rides',
      description: 'When you\'re ready to work, go online in your dashboard. You\'ll start receiving ride requests from customers in your area.',
      actionItems: [
        'Click "Go Online" in your dashboard',
        'Wait for ride requests',
        'Accept rides you want to take',
        'Navigate to customer location'
      ]
    },
    {
      title: 'Rides',
      heading: 'Complete Rides',
      description: 'Follow the GPS navigation to pick up customers and deliver them to their destinations safely and efficiently.',
      actionItems: [
        'Navigate to customer pickup location',
        'Confirm customer identity',
        'Navigate to destination',
        'Collect payment or confirm cash payment'
      ]
    },
    {
      title: 'Earnings',
      heading: 'Track Your Earnings',
      description: 'Monitor your daily earnings and analyze your performance through the rider dashboard.',
      actionItems: [
        'View daily and weekly earnings',
        'Track completed rides',
        'Analyze peak earning hours',
        'Withdraw earnings to your wallet'
      ]
    }
  ];

  const handleToggleArea = (area) => {
    if (selectedWorkingAreas.includes(area)) {
      setSelectedWorkingAreas(selectedWorkingAreas.filter((a) => a !== area));
    } else {
      setSelectedWorkingAreas([...selectedWorkingAreas, area]);
    }
  };

  const workingAreaOptions = [
    'Chebaiywa (Cheba)',
    'Stage',
    'Kesses',
    'Mabs',
  ];

  const steps = [
    {
      title: 'Upload Rider Profile Photo',
      description: 'Add a photo of yourself for customers to recognize you',
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
      title: 'Upload Motorcycle Photo',
      description: 'Add a photo of your motorcycle',
      content: (
        <div className="space-y-4">
          <ImageUpload
            onUpload={(img) => setMotorcyclePhoto(typeof img === 'string' ? img : img?.url || '')}
            currentImage={motorcyclePhoto}
            aspectRatio="landscape"
            label="Motorcycle Photo"
          />
        </div>
      ),
    },
    {
      title: 'Working Area',
      description: 'Select the working areas where you offer services',
      content: (
        <div className="space-y-4">
          <label className="block text-sm font-semibold text-neutral-800 mb-2">
            Select one or more Areas *
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {workingAreaOptions.map((area) => (
              <button
                type="button"
                key={area}
                onClick={() => handleToggleArea(area)}
                className={`flex items-center gap-3 p-4 rounded-xl border text-left font-medium transition-all ${
                  selectedWorkingAreas.includes(area)
                    ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm'
                    : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded flex items-center justify-center border transition-all ${
                    selectedWorkingAreas.includes(area)
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : 'border-neutral-300 bg-white'
                  }`}
                >
                  {selectedWorkingAreas.includes(area) && (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span>{area}</span>
              </button>
            ))}
          </div>
        </div>
      ),
    },
    {
      title: 'Working Hours',
      description: 'Set your availability hours',
      content: (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Start Time
            </label>
            <input
              type="time"
              value={workingHours.start}
              onChange={(e) => setWorkingHours({ ...workingHours, start: e.target.value })}
              className="input-field"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              End Time
            </label>
            <input
              type="time"
              value={workingHours.end}
              onChange={(e) => setWorkingHours({ ...workingHours, end: e.target.value })}
              className="input-field"
              required
            />
          </div>
        </div>
      ),
    },
    {
      title: 'Rates Per KM',
      description: 'Set your rates for day and night services',
      content: (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Day Rate (KSh)
            </label>
            <div className="relative">
              <input
                type="number"
                value={dayRatePerKm}
                onChange={(e) => setDayRatePerKm(e.target.value)}
                className="input-field pl-16"
                placeholder="25"
                required
              />
              <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-neutral-500 font-medium">
                KSh
              </span>
            </div>
            <p className="text-sm text-neutral-500 mt-1">For daytime rides (e.g. 6:00 AM to 6:00 PM)</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Night Rate (KSh)
            </label>
            <div className="relative">
              <input
                type="number"
                value={nightRatePerKm}
                onChange={(e) => setNightRatePerKm(e.target.value)}
                className="input-field pl-16"
                placeholder="35"
                required
              />
              <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-neutral-500 font-medium">
                KSh
              </span>
            </div>
            <p className="text-sm text-neutral-500 mt-1">For nighttime rides (e.g. 6:00 PM to 6:00 AM)</p>
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
          <h1 className="mt-4 text-2xl font-bold text-neutral-900">Rider Setup</h1>
          <p className="mt-2 text-neutral-500">Complete your profile to start accepting rides</p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {[1, 2, 3, 4, 5].map((stepNum) => (
              <div key={stepNum} className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm ${
                    step >= stepNum
                      ? 'bg-blue-600 text-white'
                      : 'bg-neutral-200 text-neutral-500'
                  }`}
                >
                  {step > stepNum ? '✓' : stepNum}
                </div>
                {stepNum < 5 && (
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

          <div className="mt-8 flex flex-col sm:flex-row justify-between gap-4">
            <div className="flex gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleSkipSetup}
                disabled={loading}
                className="px-6 py-3 border border-neutral-300 rounded-lg bg-white hover:bg-neutral-50 transition-colors text-neutral-700 font-medium flex-1 sm:flex-none"
              >
                Skip Setup
              </button>
              {step > 1 && (
                <button
                  type="button"
                  onClick={handleBack}
                  className="px-6 py-3 border border-neutral-300 rounded-lg bg-white hover:bg-neutral-50 transition-colors text-neutral-700 font-medium flex-1 sm:flex-none"
                >
                  Back
                </button>
              )}
            </div>

            <div className="flex gap-3 w-full sm:w-auto justify-end">
              {step < 5 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="btn-primary px-6 py-3 w-full sm:w-auto"
                >
                  Next
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading}
                  className="btn-primary px-6 py-3 flex items-center justify-center gap-2 w-full sm:w-auto"
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
        onClose={() => navigate('/rider/dashboard')}
        onComplete={handleWalkthroughComplete}
        storageKey="rider_walkthrough"
      />
    </div>
  );
};

export default RiderSetupPage;