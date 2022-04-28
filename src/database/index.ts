import mongoose from 'mongoose';
import config from '../config';

export default async () => {
  await mongoose
    .connect(config.MONGO_URI)
    .then(() => {
      console.log('Database connected');
    })
    .catch((err) => {
      console.log(err);
    });
};
