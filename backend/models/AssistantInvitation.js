import mongoose from 'mongoose';

const assistantInvitationSchema = new mongoose.Schema(
  {
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
    },
    assistantName: {
      type: String,
      trim: true,
      default: '',
    },
    assistantPhone: {
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
    assistant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('AssistantInvitation', assistantInvitationSchema);
