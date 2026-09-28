import mongoose from 'mongoose';

const MaintenanceLogSchema = new mongoose.Schema(
  {
    asset: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Asset',
      required: [true, 'Asset reference is required'],
      index: true
    },
    title: {
      type: String,
      required: [true, 'Maintenance title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters']
    },
    type: {
      type: String,
      required: [true, 'Maintenance type is required'],
      enum: {
        values: ['preventive', 'corrective', 'inspection'],
        message: '{VALUE} is not a valid maintenance type'
      },
      index: true
    },
    status: {
      type: String,
      enum: {
        values: ['scheduled', 'in_progress', 'completed', 'overdue'],
        message: '{VALUE} is not a valid maintenance status'
      },
      default: 'scheduled',
      index: true
    },
    scheduledDate: {
      type: Date,
      required: [true, 'Scheduled date is required'],
      index: true
    },
    completedDate: {
      type: Date,
      default: null
    },
    cost: {
      type: Number,
      min: [0, 'Maintenance cost cannot be negative'],
      default: 0
    },
    technician: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true
    },
    notes: {
      type: String,
      trim: true,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

export const MaintenanceLog = mongoose.model('MaintenanceLog', MaintenanceLogSchema);
export default MaintenanceLog;
