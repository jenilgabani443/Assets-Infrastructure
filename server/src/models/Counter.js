import mongoose from 'mongoose';

const CounterSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  seq: {
    type: Number,
    default: 0
  }
});

/**
 * Atomically increments and retrieves the next sequence number
 * @param {string} counterName - Identifier for the counter sequence
 * @returns {Promise<number>} - Next sequence number
 */
CounterSchema.statics.getNextSequence = async function (counterName) {
  const counter = await this.findOneAndUpdate(
    { name: counterName },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  return counter.seq;
};

export const Counter = mongoose.model('Counter', CounterSchema);
export default Counter;
