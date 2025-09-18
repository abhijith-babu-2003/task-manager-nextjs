
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


userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};


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


userSchema.statics.findByEmail = async function(email) {
  try {
    if (!email) return null;
    const normalizedEmail = email.toLowerCase().trim();
    return await this.findOne({ email: normalizedEmail }).lean();
  } catch (error) {
    console.error('Error in findByEmail:', error);
    return null;
  }
};


userSchema.statics.findUserById = async function(id) {
  try {
    if (!id) return null;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.error('Invalid ObjectId:', id);
      return null;
    }
    return await this.findById(id).select('-password').lean(); 
  } catch (error) {
    console.error('Error in findUserById:', error);
    return null;
  }
};


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
    ).lean();
    
    if (!user) {
      throw new Error('User not found');
    }
    
    return user;
  } catch (error) {
    console.error('Error in updateUser:', error);
    throw error;
  }
};


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