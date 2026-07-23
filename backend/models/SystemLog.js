import mongoose from 'mongoose';

const systemLogSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: [
      'api_error',
      'unhandled_error',
      'database_connection',
      'payment_failure',
      'push_notification_failure',
      'auth_failure',
      'admin_action'
    ]
  },
  message: {
    type: String,
    required: true
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  statusCode: {
    type: Number,
    default: null
  },
  path: {
    type: String,
    default: null
  },
  method: {
    type: String,
    default: null
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  ip: {
    type: String,
    default: null
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for fast queries on monitoring dashboard
systemLogSchema.index({ type: 1, timestamp: -1 });
systemLogSchema.index({ timestamp: -1 });

const SystemLog = mongoose.model('SystemLog', systemLogSchema);

export default SystemLog;
