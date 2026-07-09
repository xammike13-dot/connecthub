import { motion } from 'framer-motion';
import { 
  Package, 
  ShoppingCart, 
  Home, 
  Users, 
  FileText, 
  Search,
  Inbox,
  AlertCircle,
  CheckCircle,
  CreditCard,
  Bike,
  Building,
} from 'lucide-react';
import Button from './Button';

const EmptyState = ({
  icon,
  title,
  message,
  actionLabel,
  onAction,
  variant = 'default',
}) => {
  const variants = {
    default: {
      icon: <Inbox className="w-16 h-16 text-neutral-400" />,
      bgColor: 'bg-neutral-50',
    },
    search: {
      icon: <Search className="w-16 h-16 text-neutral-400" />,
      bgColor: 'bg-neutral-50',
    },
    cart: {
      icon: <ShoppingCart className="w-16 h-16 text-neutral-400" />,
      bgColor: 'bg-neutral-50',
    },
    orders: {
      icon: <Package className="w-16 h-16 text-neutral-400" />,
      bgColor: 'bg-neutral-50',
    },
    rentals: {
      icon: <Home className="w-16 h-16 text-neutral-400" />,
      bgColor: 'bg-neutral-50',
    },
    users: {
      icon: <Users className="w-16 h-16 text-neutral-400" />,
      bgColor: 'bg-neutral-50',
    },
    documents: {
      icon: <FileText className="w-16 h-16 text-neutral-400" />,
      bgColor: 'bg-neutral-50',
    },
    error: {
      icon: <AlertCircle className="w-16 h-16 text-red-500" />,
      bgColor: 'bg-red-50',
    },
    success: {
      icon: <CheckCircle className="w-16 h-16 text-green-500" />,
      bgColor: 'bg-green-50',
    },
    payment: {
      icon: <CreditCard className="w-16 h-16 text-neutral-400" />,
      bgColor: 'bg-neutral-50',
    },
    transport: {
      icon: <Bike className="w-16 h-16 text-neutral-400" />,
      bgColor: 'bg-neutral-50',
    },
    building: {
      icon: <Building className="w-16 h-16 text-neutral-400" />,
      bgColor: 'bg-neutral-50',
    },
  };

  const currentVariant = variants[variant];
  const displayIcon = icon || currentVariant.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`
        ${currentVariant.bgColor}
        rounded-xl p-8 text-center
        flex flex-col items-center justify-center
        min-h-[300px]
        border border-neutral-200
      `}
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.3 }}
        className="mb-4"
      >
        {displayIcon}
      </motion.div>
      
      <motion.h3
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.3 }}
        className="text-lg font-semibold text-neutral-900 mb-2"
      >
        {title}
      </motion.h3>
      
      <motion.p
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.3 }}
        className="text-neutral-500 text-sm max-w-md mb-6"
      >
        {message}
      </motion.p>
      
      {actionLabel && onAction && (
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.3 }}
        >
          <Button onClick={onAction}>
            {actionLabel}
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
};

export default EmptyState;