import mongoose from 'mongoose';

const AlertSchema = new mongoose.Schema({
  user: String,
  lastSend: Number,
  createdAt: Number,
});

export default mongoose.model('Alert', AlertSchema);
