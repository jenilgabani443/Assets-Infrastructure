import mongoose from 'mongoose';

const AuditLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true
  },
  action: {
    type: String,
    required: [true, 'Action is required'],
    enum: {
      values: ['create', 'update', 'delete', 'stage_change', 'login'],
      message: '{VALUE} is not a valid audit action'
    },
    index: true
  },
  entity: {
    type: String,
    required: [true, 'Entity is required'],
    trim: true,
    index: true
  },
  entityId: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
    index: true
  },
  summary: {
    type: String,
    required: [true, 'Summary description is required'],
    trim: true
  },
  changes: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
});

export const AuditLog = mongoose.model('AuditLog', AuditLogSchema);
export default AuditLog;
