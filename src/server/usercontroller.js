import User from './userModel';

// Create a new user
export async function createUser(req, res) {
  try {
    const { name, email, password, walletAddress } = req.body;
    const existingUser = await User.findOne({ walletAddress });
    if (existingUser) {
      return res.status(409).json({ message: 'User already exists' });
    }
    const newUser = new User({ name, email, password, walletAddress });
    await newUser.save();
    res.status(201).json({ message: 'User created successfully', user: newUser });
  } catch (error) {
    res.status(500).json({ message: 'Error creating user', error });
  }
}

export async function updateUser(req, res) {
  try {
    const { walletAddress, name, email } = req.body;
    const user = await User.findOneAndUpdate({ walletAddress }, { name, email }, { new: true });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json({ message: 'User updated successfully', user });
  } catch (error) {
    res.status(500).json({ message: 'Error updating user', error });
  }
}