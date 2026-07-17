import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ImageUpload from '../components/ImageUpload';
import GuidedWalkthrough from '../components/GuidedWalkthrough';
import api from '../services/apiClient';

const BusinessSetupPage = () => {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [businessLogo, setBusinessLogo] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessLocation, setBusinessLocation] = useState('');
  const [businessContact, setBusinessContact] = useState('');

  const [loading, setLoading] = useState(false);
  const [showWalkthrough, setShowWalkthrough] = useState(false);
  const [initializedData, setInitializedData] = useState(false);

  // Instrumentation Logs
  useEffect(() => {
    console.log('[BusinessSetupPage] MOUNTED');
    return () => {
      console.log('[BusinessSetupPage] UNMOUNTED');
    };
  }, []);

  useEffect(() => {
    console.log('[BusinessSetupPage] user or initializedData updated:', {
      userExists: !!user,
      onboardingCompleted: user?.onboardingCompleted,
      initializedData
    });
    if (user) {
      if (user.onboardingCompleted && !showWalkthrough) {
        console.log('[BusinessSetupPage] Redirecting to /business/dashboard because onboardingCompleted is true and walkthrough is not active');
        navigate('/business/dashboard', { replace: true });
        return;
      }
      if (!initializedData) {
        console.log('[BusinessSetupPage] Initializing form data from user:', user);
        if (user.businessLogo || user.businessProfile?.businessLogo) {
          setBusinessLogo(user.businessLogo || user.businessProfile?.businessLogo);
        }
        if (user.businessProfile?.businessName) {
          setBusinessName(user.businessProfile.businessName);
        }
        if (user.businessProfile?.businessLocation) {
          setBusinessLocation(user.businessProfile.businessLocation);
        }
        if (user.businessProfile?.businessContact) {
          setBusinessContact(user.businessProfile.businessContact);
        }
        setInitializedData(true);
      }
    }
  }, [user, navigate, initializedData, showWalkthrough]);

  const handleSubmit = async () => {
    if (!businessLogo) {
      alert('Please upload your Business Logo.');
      return;
    }
    if (!businessName.trim()) {
      alert('Please enter your Business Name.');
      return;
    }
    if (!businessLocation.trim()) {
      alert('Please enter your Business Location.');
      return;
    }
    if (!businessContact.trim()) {
      alert('Please enter your Business Contact Details.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/setup/business', {
        businessLogo,
        businessName,
        businessLocation,
        businessContact,
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
      const defaultLogo = "https://images.unsplash.com/photo-1472851294608-062f824d296e?auto=format&fit=crop&w=500&q=80";
      await api.post('/setup/business', {
        businessLogo: defaultLogo,
        businessName: `${user?.name || 'My'}'s Shop`,
        businessLocation: 'Eldoret',
        businessContact: user?.phone || 'Phone not provided',
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
    navigate('/business/dashboard');
  };

  const walkthroughSteps = [
    {
      title: 'Products',
      heading: 'Add Products to Your Store',
      description: 'Go to your Products page to create new listings. Upload clear images, specify quantities, and set pricing to showcase what you offer.',
      actionItems: [
        'Navigate to Products',
        'Add details (name, price, stock)',
        'Upload product images',
        'Publish your item'
      ]
    },
    {
      title: 'Inventory',
      heading: 'Manage Your Inventory',
      description: 'Track stock levels, modify details, and hide or activate items directly from the Business Dashboard.',
      actionItems: [
        'Monitor active stock counts',
        'Adjust prices or quantities easily',
        'Mark items out of stock',
        'Analyze sales performance'
      ]
    },
    {
      title: 'Orders',
      heading: 'Receive Customer Orders',
      description: 'Get notified in real-time when customers order your products. Accept orders promptly to keep customers happy.',
      actionItems: [
        'View incoming order requests',
        'Check ordered items and quantities',
        'Accept and prepare orders',
        'Keep customers updated on preparation'
      ]
    },
    {
      title: 'Payments',
      heading: 'Receive Payments Securely',
      description: 'ConnectHub holds payments securely in escrow when orders are placed and releases them directly to your wallet once delivered.',
      actionItems: [
        'Secure customer deposits',
        'Automatic escrow tracking',
        'Direct payouts to your Wallet',
        'Safe balance withdrawals'
      ]
    },
    {
      title: 'Deliveries',
      heading: 'Manage Deliveries',
      description: 'Prepare packages and coordinate with our trusted delivery riders to deliver items to the customer\'s address.',
      actionItems: [
        'Package prepared orders securely',
        'Hand over to designated delivery riders',
        'Track active transit status',
        'Confirm successful handovers'
      ]
    },
    {
      title: 'Profile',
      heading: 'Edit Profile & Settings',
      description: 'Keep your business details, contacts, and operational address up to date through Profile Settings.',
      actionItems: [
        'Edit business contacts',
        'Update operational addresses',
        'Renew logos and descriptions',
        'Configure system preferences'
      ]
    }
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

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-neutral-200">
          <h2 className="text-2xl font-bold text-neutral-900 mb-6 text-center">
            Business Information
          </h2>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-neutral-800 mb-2">
                Business Logo *
              </label>
              <ImageUpload
                onUpload={(img) => setBusinessLogo(typeof img === 'string' ? img : img?.url || '')}
                currentImage={businessLogo}
                aspectRatio="square"
                label="Business Logo"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-neutral-800 mb-2">
                Business Name *
              </label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="input-field"
                placeholder="e.g. Eldoret Fast Foods"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-neutral-800 mb-2">
                Business Location *
              </label>
              <input
                type="text"
                value={businessLocation}
                onChange={(e) => setBusinessLocation(e.target.value)}
                className="input-field"
                placeholder="e.g. Moi University Main Stage, Eldoret"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-neutral-800 mb-2">
                Business Contact Details *
              </label>
              <input
                type="text"
                value={businessContact}
                onChange={(e) => setBusinessContact(e.target.value)}
                className="input-field"
                placeholder="e.g. Phone: +254712345678, Email: contact@store.com"
                required
              />
            </div>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row justify-between gap-4">
            <button
              type="button"
              onClick={handleSkipSetup}
              disabled={loading}
              className="px-6 py-3 border border-neutral-300 rounded-lg bg-white hover:bg-neutral-50 transition-colors text-neutral-700 font-medium w-full sm:w-auto"
            >
              Skip Setup
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="btn-primary w-full sm:w-auto px-8 py-3 flex items-center justify-center gap-2"
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
                'Finish Setup'
              )}
            </button>
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