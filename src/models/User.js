import mongoose, {Schema} from 'mongoose';

const schema = new Schema({
  userId: String,
  channelId: String,
  username: String,
});

export const User = mongoose.model('User', schema, 'users');
