import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { 
    type: String, 
    required: true, 
    unique: true,
    lowercase: true,
    trim: true
  },
  password: { type: String, required: true, select: false },
  role: { type: String, default: 'user' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Static method to create user
userSchema.statics.createUser = async function(userData) {
  try {
    const user = new this({
      name: userData.name,
      email: userData.email.toLowerCase().trim(),
      password: userData.password
    });
    
    const savedUser = await user.save();
    return savedUser.toObject();
  } catch (error) {
    if (error.code === 11000) {
      throw new Error('User already exists with this email');
    }
    throw error;
  }
};

// Static method to find user by email
userSchema.statics.findByEmail = async function(email) {
  try {
    if (!email) return null;
    const normalizedEmail = email.toLowerCase().trim();
    return await this.findOne({ email: normalizedEmail });
  } catch (error) {
    console.error('Error in findByEmail:', error);
    return null;
  }
};

// Static method to find user by ID
userSchema.statics.findById = async function(id) {
  try {
    if (!id) return null;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.error('Invalid ObjectId:', id);
      return null;
    }
    return await this.findOne({ _id: id });
  } catch (error) {
    console.error('Error in findById:', error);
    return null;
  }
};

// Static method to update user
userSchema.statics.updateUser = async function(id, updateData) {
  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error('Invalid user ID');
    }
    
    const update = { ...updateData, updatedAt: new Date() };
    
    if (update.password) {
      const salt = await bcrypt.genSalt(SALT_ROUNDS);
      update.password = await bcrypt.hash(update.password, salt);
    }
    
    const user = await this.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true, runValidators: true }
    );
    
    if (!user) {
      throw new Error('User not found');
    }
    
    return user.toObject();
  } catch (error) {
    console.error('Error in updateUser:', error);
    throw error;
  }
};

// Static method to compare password
userSchema.statics.comparePassword = async function(email, candidatePassword) {
  try {
    const user = await this.findOne({ email: email.toLowerCase().trim() }).select('+password');
    if (!user) return false;
    
    return await user.comparePassword(candidatePassword);
  } catch (error) {
    console.error('Error in comparePassword:', error);
    return false;
  }
};

const User = mongoose.models.User || mongoose.model('User', userSchema);

export default User;
