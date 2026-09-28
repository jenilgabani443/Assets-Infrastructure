import mongoose from 'mongoose';
import { LIFECYCLE_STAGES } from './Asset.js';

const LifecycleEventSchema = new mongoose.Schema({
  asset: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Asset',
    required: [true, 'Asset reference is required'],
    index: true
  },
  fromStage: {
    type: String,
    enum: {
      values: [...LIFECYCLE_STAGES, null],
      message: '{VALUE} is not a valid lifecycle stage'
    },
    default: null
  },
  toStage: {
    type: String,
    required: [true, 'Destination lifecycle stage is required'],
    enum: {
      values: LIFECYCLE_STAGES,
      message: '{VALUE} is not a valid lifecycle stage'
    }
  },
  changedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User who changed stage is required'],
    index: true
  },
  remarks: {
    type: String,
    trim: true,
    default: ''
  },
  date: {
    type: Date,
    default: Date.now,
    index: true
  }
});

export const LifecycleEvent = mongoose.model('LifecycleEvent', LifecycleEventSchema);
export default LifecycleEvent;
