import mongoose from 'mongoose';

const caretakerInvitationSchema = new mongoose.Schema(
  {
    landlord: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
    },
    caretakerName: {
      type: String,
      trim: true,
      default: '',
    },
    caretakerPhone: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'expired', 'disabled'],
      default: 'pending',
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    caretaker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('CaretakerInvitation', caretakerInvitationSchema);
