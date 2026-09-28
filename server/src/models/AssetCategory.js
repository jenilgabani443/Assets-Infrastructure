import mongoose from 'mongoose';

const FieldDefinitionSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: [true, 'Field key is required'],
      trim: true
    },
    label: {
      type: String,
      required: [true, 'Field label is required'],
      trim: true
    },
    type: {
      type: String,
      required: [true, 'Field type is required'],
      enum: {
        values: ['text', 'number', 'date', 'select', 'boolean'],
        message: '{VALUE} is not a valid field type'
      }
    },
    options: {
      type: [String],
      default: []
    },
    required: {
      type: Boolean,
      default: false
    },
    unit: {
      type: String,
      trim: true,
      default: ''
    }
  },
  { _id: false }
);

const AssetCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      unique: true,
      trim: true
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    icon: {
      type: String,
      default: 'Box'
    },
    fieldDefinitions: {
      type: [FieldDefinitionSchema],
      default: []
    }
  },
  {
    timestamps: true
  }
);

export const AssetCategory = mongoose.model('AssetCategory', AssetCategorySchema);
export default AssetCategory;
