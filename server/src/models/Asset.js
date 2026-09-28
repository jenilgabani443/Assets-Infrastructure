import mongoose from 'mongoose';
import Counter from './Counter.js';

export const LIFECYCLE_STAGES = [
  'Planned',
  'Procured',
  'Installed',
  'In Service',
  'Under Maintenance',
  'Decommissioned'
];

export const ALLOWED_STAGE_TRANSITIONS = {
  Planned: ['Procured'],
  Procured: ['Installed'],
  Installed: ['In Service'],
  'In Service': ['Under Maintenance', 'Decommissioned'],
  'Under Maintenance': ['In Service', 'Decommissioned'],
  Decommissioned: []
};

const LocationSchema = new mongoose.Schema(
  {
    address: {
      type: String,
      trim: true,
      default: ''
    },
    lat: {
      type: Number,
      default: null
    },
    lng: {
      type: Number,
      default: null
    }
  },
  { _id: false }
);

const AssetSchema = new mongoose.Schema(
  {
    assetTag: {
      type: String,
      unique: true,
      trim: true
    },
    name: {
      type: String,
      required: [true, 'Asset name is required'],
      trim: true,
      maxlength: [200, 'Asset name cannot exceed 200 characters']
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AssetCategory',
      required: [true, 'Asset category is required'],
      index: true
    },
    subcategory: {
      type: String,
      trim: true,
      default: ''
    },
    status: {
      type: String,
      enum: {
        values: ['active', 'inactive', 'retired'],
        message: '{VALUE} is not a valid status'
      },
      default: 'active',
      index: true
    },
    lifecycleStage: {
      type: String,
      enum: {
        values: LIFECYCLE_STAGES,
        message: '{VALUE} is not a valid lifecycle stage'
      },
      default: 'Planned',
      index: true
    },
    location: {
      type: LocationSchema,
      default: () => ({ address: '', lat: null, lng: null })
    },
    purchaseDate: {
      type: Date,
      default: null
    },
    installationDate: {
      type: Date,
      default: null
    },
    cost: {
      type: Number,
      min: [0, 'Cost cannot be negative'],
      default: 0
    },
    expectedLifespanYears: {
      type: Number,
      min: [0, 'Expected lifespan cannot be negative'],
      default: null
    },
    warrantyExpiry: {
      type: Date,
      default: null
    },
    department: {
      type: String,
      trim: true,
      default: '',
      index: true
    },
    imageUrl: {
      type: String,
      trim: true,
      default: ''
    },
    customFields: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Auto-generate AST-0001 style assetTag on save if not provided
AssetSchema.pre('save', async function (next) {
  if (!this.assetTag) {
    try {
      const nextSeq = await Counter.getNextSequence('assetTag');
      this.assetTag = `AST-${String(nextSeq).padStart(4, '0')}`;
      next();
    } catch (error) {
      next(error);
    }
  } else {
    next();
  }
});

// Full-text search index on name, assetTag, subcategory
AssetSchema.index({
  name: 'text',
  assetTag: 'text',
  subcategory: 'text'
});

export const Asset = mongoose.model('Asset', AssetSchema);
export default Asset;
