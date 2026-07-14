import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { 
  ShoppingBag, 
  Home, 
  Bike, 
  Heart, 
  Shield, 
  Truck,
  CreditCard,
  Phone,
  Star,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';
import Button from '../components/ui/Button';

const features = [
  {
    icon: <ShoppingBag className="w-6 h-6" />,
    title: 'Online Shopping',
    description: 'Browse and buy products from verified businesses',
    color: 'bg-blue-600',
    gradient: 'from-blue-500 to-blue-600',
  },
  {
    icon: <Home className="w-6 h-6" />,
    title: 'Property Rentals',
    description: 'Find and book rental properties easily',
    color: 'bg-blue-600',
    gradient: 'from-blue-400 to-blue-600',
  },
  {
    icon: <Bike className="w-6 h-6" />,
    title: 'Bodaboda Transport',
    description: 'Quick and reliable motorcycle taxi service',
    color: 'bg-blue-600',
    gradient: 'from-blue-500 to-blue-700',
  },
  {
    icon: <Heart className="w-6 h-6" />,
    title: 'Healthcare Services',
    description: 'Access healthcare providers and services',
    color: 'bg-blue-600',
    gradient: 'from-blue-400 to-blue-500',
  },
];

const benefits = [
  {
    icon: <Shield className="w-8 h-8" />,
    title: 'Secure Payments',
    description: 'All transactions are protected with industry-standard encryption',
  },
  {
    icon: <Truck className="w-8 h-8" />,
    title: 'Fast Delivery',
    description: 'Get your orders delivered quickly and efficiently',
  },
  {
    icon: <CreditCard className="w-8 h-8" />,
    title: 'Easy Wallet',
    description: 'Manage your funds with our integrated wallet system',
  },
  {
    icon: <Phone className="w-8 h-8" />,
    title: '24/7 Support',
    description: 'Our team is always ready to help you',
  },
];

const testimonials = [
  {
    name: 'John Kamau',
    role: 'Customer',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100',
    rating: 5,
    text: 'Connect Hub has made shopping so convenient. I can order everything I need and pay securely.',
  },
  {
    name: 'Sarah Mwangi',
    role: 'Business Owner',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100',
    rating: 5,
    text: 'Since joining Connect Hub, my business has grown significantly. The platform is easy to use.',
  },
  {
    name: 'Peter Ochieng',
    role: 'Rider',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100',
    rating: 5,
    text: 'As a bodaboda rider, this app has helped me get more customers and manage my earnings better.',
  },
];

const HomePage = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated && user) {
      const dashboardMap = {
        customer: '/customer/dashboard',
        landlord: '/landlord/dashboard',
        business: '/business/dashboard',
        rider: '/rider/dashboard',
        admin: '/admin/dashboard',
      };
      const targetPath = dashboardMap[user.role] || '/';
      navigate(targetPath, { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-50 via-white to-slate-100 overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTTAgNjBMMCAwTDYwIDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSg1OSwgMTMwLCAyNDYsIDAuMDUpIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30" />
        <div className="relative max-w-7xl mx-auto px-4 py-24 md:py-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl text-left"
          >
            <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-2 mb-6">
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              <span className="text-blue-600 text-sm font-medium">Kenya's Premier Multi-Service Platform</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-6 text-neutral-900 leading-tight">
              Everything You Need,
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-800">In One Place</span>
            </h1>
            <p className="text-lg md:text-xl text-neutral-600 mb-8 max-w-2xl">
              Shop, rent properties, book rides, and access healthcare services - all through one secure platform.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/register">
                <Button size="lg" className="group btn-primary">
                  Get Started
                  <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" size={20} />
                </Button>
              </Link>
              <Link to="/marketplace">
                <Button size="lg" variant="secondary" className="bg-white hover:bg-neutral-100 text-blue-600 border border-blue-200">
                  Browse Marketplace
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-16 pt-16 border-t border-neutral-200">
            {[
              { value: '10K+', label: 'Active Users' },
              { value: '5K+', label: 'Products' },
              { value: '1K+', label: 'Properties' },
              { value: '500+', label: 'Riders' },
            ].map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
                className="text-left"
              >
                <p className="text-3xl md:text-4xl font-bold text-blue-600">{stat.value}</p>
                <p className="text-neutral-500 text-sm mt-1">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-4">
              Our Services
            </h2>
            <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
              Discover all the ways Connect Hub can help you
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -5 }}
                className="bg-slate-50 rounded-xl shadow-sm p-6 border border-neutral-200 hover:border-blue-500 hover:shadow-md transition-all text-left"
              >
                <div className={`w-12 h-12 bg-gradient-to-br ${feature.gradient} rounded-lg flex items-center justify-center text-white mb-4 shadow-sm`}>
                  {feature.icon}
                </div>
                <h3 className="text-lg font-bold text-neutral-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-neutral-600 text-sm mb-4 leading-relaxed">{feature.description}</p>
                <Link
                  to={
                    index === 0
                      ? '/marketplace'
                      : index === 1
                      ? '/rentals'
                      : index === 2
                      ? '/transport'
                      : '/healthcare'
                  }
                  className="text-blue-600 font-semibold flex items-center gap-1 hover:gap-2 transition-all text-sm"
                >
                  Learn More <ChevronRight size={16} />
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-4">
              Why Choose Connect Hub?
            </h2>
            <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
              We're committed to providing the best experience
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {benefits.map((benefit, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="text-center"
              >
                <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center text-blue-600 mx-auto mb-4 border border-blue-500/20">
                  {benefit.icon}
                </div>
                <h3 className="text-lg font-bold text-neutral-900 mb-2">{benefit.title}</h3>
                <p className="text-neutral-600 text-sm leading-relaxed">{benefit.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-4">
              What People Say
            </h2>
            <p className="text-lg text-neutral-600 max-w-2xl mx-auto">Join thousands of satisfied users</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-slate-50 rounded-xl shadow-sm p-6 border border-neutral-200 text-left"
              >
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-neutral-700 text-sm mb-6 leading-relaxed italic">"{testimonial.text}"</p>
                <div className="flex items-center gap-3">
                  <img
                    src={testimonial.avatar}
                    alt={testimonial.name}
                    className="w-12 h-12 rounded-full object-cover border-2 border-blue-500/20"
                  />
                  <div>
                    <p className="font-bold text-neutral-900 text-sm">{testimonial.name}</p>
                    <p className="text-xs text-neutral-500 mt-0.5">{testimonial.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 via-blue-500 to-blue-700 text-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-lg text-blue-100 mb-8 leading-relaxed max-w-2xl mx-auto">
            Join Connect Hub today and experience the convenience of having everything in one place.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register">
              <Button size="lg" className="bg-white text-blue-600 hover:bg-neutral-100 hover:text-blue-700 border border-transparent shadow-md font-semibold">
                Create Account
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10 hover:text-white font-semibold">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-50 border-t border-neutral-200 py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-left">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">C</span>
                </div>
                <h3 className="text-neutral-900 font-bold text-lg">Connect Hub</h3>
              </div>
              <p className="text-neutral-500 text-sm leading-relaxed">
                Your one-stop platform for shopping, rentals, transport, and healthcare services.
              </p>
            </div>
            <div>
              <h4 className="text-neutral-800 font-bold text-sm uppercase tracking-wider mb-4">Quick Links</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/marketplace" className="text-neutral-600 hover:text-blue-600 transition-colors">Marketplace</Link></li>
                <li><Link to="/rentals" className="text-neutral-600 hover:text-blue-600 transition-colors">Rentals</Link></li>
                <li><Link to="/transport" className="text-neutral-600 hover:text-blue-600 transition-colors">Bodaboda</Link></li>
                <li><Link to="/healthcare" className="text-neutral-600 hover:text-blue-600 transition-colors">Healthcare</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-neutral-800 font-bold text-sm uppercase tracking-wider mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="text-neutral-600 hover:text-blue-600 transition-colors">About Us</a></li>
                <li><a href="#" className="text-neutral-600 hover:text-blue-600 transition-colors">Careers</a></li>
                <li><a href="#" className="text-neutral-600 hover:text-blue-600 transition-colors">Press</a></li>
                <li><a href="#" className="text-neutral-600 hover:text-blue-600 transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-neutral-800 font-bold text-sm uppercase tracking-wider mb-4">Support</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="text-neutral-600 hover:text-blue-600 transition-colors">Help Center</a></li>
                <li><a href="#" className="text-neutral-600 hover:text-blue-600 transition-colors">Safety</a></li>
                <li><a href="#" className="text-neutral-600 hover:text-blue-600 transition-colors">Terms of Service</a></li>
                <li><a href="#" className="text-neutral-600 hover:text-blue-600 transition-colors">Privacy Policy</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-neutral-200 mt-12 pt-8 text-center text-sm text-neutral-500">
            <p>&copy; 2024 Connect Hub. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;