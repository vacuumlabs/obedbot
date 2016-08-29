import mongoose, {Schema} from 'mongoose';

const schema = new Schema({
  timestamp: String,
  text: String,
  userId: String,
});

export const Order = mongoose.model('Order', schema, 'orders');
