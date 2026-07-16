import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ImageUpload from '../components/ImageUpload';
import GuidedWalkthrough from '../components/GuidedWalkthrough';
import api from '../services/apiClient';

const BusinessSetupPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && user.onboardingCompleted) {
      navigate('/business/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const [businessLogo, setBusinessLogo] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessDescription, setBusinessDescription] = useState('');
  const [businessCategory, setBusinessCategory] = useState('');
  const [businessLocation, setBusinessLocation] = useState('');
  const [businessContact, setBusinessContact] = useState('');

  const [loading, setLoading] = useState(false);
  const [showWalkthrough, setShowWalkthrough] = useState(false);
  const { refreshProfile } = useAuth();

  const handleSubmit = async () => {
    if (!businessLogo) {
      alert('Please upload your Business Logo.');
      return;
    }
    if (!businessName.trim()) {
      alert('Please enter your Business Name.');
      return;
    }
    if (!businessDescription.trim()) {
      alert('Please enter your Business Description.');
      return;
    }
    if (!businessCategory) {
      alert('Please select your Business Category.');
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
        businessDescription,
        businessCategory,
        businessLocation,
        businessContact,
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

  const categories = [
    'Food',
    'Household',
    'Electronics',
    'Fashion',
    'Gas',
    'Wines & Spirits',
    'Second Hand',
    'Health Care',
    'Test'
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
                Business Description *
              </label>
              <textarea
                value={businessDescription}
                onChange={(e) => setBusinessDescription(e.target.value)}
                className="input-field min-h-[100px]"
                placeholder="Describe your products and services..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-neutral-800 mb-2">
                Business Category *
              </label>
              <select
                value={businessCategory}
                onChange={(e) => setBusinessCategory(e.target.value)}
                className="input-field"
                required
              >
                <option value="">Select Category</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
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

          <div className="mt-8 flex justify-end">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="btn-primary w-full md:w-auto px-8 py-3 flex items-center justify-center gap-2"
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