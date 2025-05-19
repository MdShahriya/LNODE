import express from 'express';
import mongoose from 'mongoose';
import userController from './userController';

const app = express();
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/topay', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// User creation endpoint
app.post('/api/users', userController.createUser);
app.put('/api/users', userController.updateUser);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});