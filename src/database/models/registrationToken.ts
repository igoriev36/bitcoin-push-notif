import mongoose from 'mongoose';

const RegistrationTokenSchema = new mongoose.Schema({
  token: String,
  user: String,
  hasBitcoin: Boolean,
  createdAt: Number,
  updatedAt: Number,
});

export default mongoose.model('RegistrationToken', RegistrationTokenSchema);
