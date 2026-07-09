import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
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
    color: 'bg-gold-500',
    gradient: 'from-gold-500 to-gold-600',
  },
  {
    icon: <Home className="w-6 h-6" />,
    title: 'Property Rentals',
    description: 'Find and book rental properties easily',
    color: 'bg-gold-500',
    gradient: 'from-gold-400 to-gold-600',
  },
  {
    icon: <Bike className="w-6 h-6" />,
    title: 'Bodaboda Transport',
    description: 'Quick and reliable motorcycle taxi service',
    color: 'bg-gold-500',
    gradient: 'from-gold-500 to-gold-700',
  },
  {
    icon: <Heart className="w-6 h-6" />,
    title: 'Healthcare Services',
    description: 'Access healthcare providers and services',
    color: 'bg-gold-500',
    gradient: 'from-gold-400 to-gold-500',
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
  return (
    <div className="min-h-screen bg-neutral-950">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-neutral-900 via-neutral-950 to-neutral-900">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTTAgNjBMMCAwTDYwIDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyMTIsIDE3NSwgNTUsIDAuMDUpIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-20" />
        <div className="relative max-w-7xl mx-auto px-4 py-24 md:py-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl"
          >
            <div className="inline-flex items-center gap-2 bg-gold-500/10 border border-gold-500/20 rounded-full px-4 py-2 mb-6">
              <span className="w-2 h-2 bg-gold-500 rounded-full animate-pulse" />
              <span className="text-gold-400 text-sm font-medium">Kenya's Premier Multi-Service Platform</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-6 text-white">
              Everything You Need,
              <br />
              <span className="text-transparent bg-clip-text bg-gold-gradient">In One Place</span>
            </h1>
            <p className="text-xl md:text-2xl text-neutral-400 mb-8 max-w-2xl">
              Shop, rent properties, book rides, and access healthcare services - all through one secure platform.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/register">
                <Button size="lg" className="group">
                  Get Started
                  <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" size={20} />
                </Button>
              </Link>
              <Link to="/marketplace">
                <Button size="lg" variant="secondary">
                  Browse Marketplace
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-16 pt-16 border-t border-neutral-800">
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
              >
                <p className="text-3xl md:text-4xl font-bold text-white">{stat.value}</p>
                <p className="text-neutral-500">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-16 bg-neutral-900/50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Our Services
            </h2>
            <p className="text-lg text-neutral-400 max-w-2xl mx-auto">
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
                className="bg-neutral-900/80 backdrop-blur-sm rounded-xl shadow-dark p-6 border border-neutral-800 hover:border-gold-500/50 hover:shadow-gold transition-all"
              >
                <div className={`w-12 h-12 bg-gradient-to-br ${feature.gradient} rounded-lg flex items-center justify-center text-white mb-4 shadow-lg`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-neutral-400 mb-4">{feature.description}</p>
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
                  className="text-gold-400 font-medium flex items-center gap-1 hover:gap-2 transition-all"
                >
                  Learn More <ChevronRight size={16} />
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Why Choose Connect Hub?
            </h2>
            <p className="text-lg text-neutral-400 max-w-2xl mx-auto">
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
                <div className="w-16 h-16 bg-gold-500/10 rounded-full flex items-center justify-center text-gold-400 mx-auto mb-4 border border-gold-500/20">
                  {benefit.icon}
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{benefit.title}</h3>
                <p className="text-neutral-400">{benefit.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 bg-neutral-900/50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              What People Say
            </h2>
            <p className="text-lg text-neutral-400">Join thousands of satisfied users</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-neutral-900/80 backdrop-blur-sm rounded-xl shadow-dark p-6 border border-neutral-800"
              >
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-gold-400 fill-current" />
                  ))}
                </div>
                <p className="text-neutral-300 mb-6">"{testimonial.text}"</p>
                <div className="flex items-center gap-3">
                  <img
                    src={testimonial.avatar}
                    alt={testimonial.name}
                    className="w-12 h-12 rounded-full object-cover border-2 border-gold-500/20"
                  />
                  <div>
                    <p className="font-semibold text-white">{testimonial.name}</p>
                    <p className="text-sm text-neutral-500">{testimonial.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-gold-600 via-gold-500 to-gold-600">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-neutral-950 mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-neutral-800 mb-8">
            Join Connect Hub today and experience the convenience of having everything in one place.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register">
              <Button size="lg" className="bg-neutral-950 text-white hover:bg-neutral-900 border-2 border-neutral-900">
                Create Account
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline" className="border-neutral-950 text-neutral-950 hover:bg-neutral-950 hover:text-white">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-neutral-950 border-t border-neutral-900 py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-gold-gradient rounded-lg flex items-center justify-center">
                  <span className="text-neutral-950 font-bold text-lg">C</span>
                </div>
                <h3 className="text-white font-bold text-lg">Connect Hub</h3>
              </div>
              <p className="text-neutral-500 text-sm">
                Your one-stop platform for shopping, rentals, transport, and healthcare services.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/marketplace" className="text-neutral-500 hover:text-gold-400 transition-colors">Marketplace</Link></li>
                <li><Link to="/rentals" className="text-neutral-500 hover:text-gold-400 transition-colors">Rentals</Link></li>
                <li><Link to="/transport" className="text-neutral-500 hover:text-gold-400 transition-colors">Bodaboda</Link></li>
                <li><Link to="/healthcare" className="text-neutral-500 hover:text-gold-400 transition-colors">Healthcare</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="text-neutral-500 hover:text-gold-400 transition-colors">About Us</a></li>
                <li><a href="#" className="text-neutral-500 hover:text-gold-400 transition-colors">Careers</a></li>
                <li><a href="#" className="text-neutral-500 hover:text-gold-400 transition-colors">Press</a></li>
                <li><a href="#" className="text-neutral-500 hover:text-gold-400 transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="text-neutral-500 hover:text-gold-400 transition-colors">Help Center</a></li>
                <li><a href="#" className="text-neutral-500 hover:text-gold-400 transition-colors">Safety</a></li>
                <li><a href="#" className="text-neutral-500 hover:text-gold-400 transition-colors">Terms of Service</a></li>
                <li><a href="#" className="text-neutral-500 hover:text-gold-400 transition-colors">Privacy Policy</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-neutral-900 mt-8 pt-8 text-center text-sm text-neutral-500">
            <p>&copy; 2024 Connect Hub. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;