import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: [true, 'Task title is required'],
    trim: true,
    maxlength: [200, 'Title cannot be more than 200 characters']
  },
  description: { 
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot be more than 1000 characters']
  },
  status: { 
    type: String, 
    enum: ['pending', 'in-progress', 'completed', 'cancelled'],
    default: 'pending'
  },
  priority: { 
    type: String, 
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  category: { 
    type: String,
    trim: true,
    maxlength: [50, 'Category cannot be more than 50 characters']
  },
  tags: [{ 
    type: String,
    trim: true,
    maxlength: [30, 'Tag cannot be more than 30 characters']
  }],
  dueDate: { 
    type: Date 
  },
  completedAt: { 
    type: Date 
  },
  timeSpent: { 
    type: Number, 
    default: 0,
    min: [0, 'Time spent cannot be negative']
  },
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },
  createdAt: { 
    type: Date, 
    default: Date.now,
    index: true
  },
  updatedAt: { 
    type: Date, 
    default: Date.now,
    index: true
  }
});

// Update the updatedAt field before saving
taskSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Set completedAt when status changes to completed
  if (this.status === 'completed' && !this.completedAt) {
    this.completedAt = new Date();
  }
  
  // Clear completedAt if status changes from completed
  if (this.status !== 'completed' && this.completedAt) {
    this.completedAt = undefined;
  }
  
  next();
});

// Update the updatedAt field before updating
taskSchema.pre('findOneAndUpdate', function(next) {
  this.set({ updatedAt: new Date() });
  next();
});

// Create indexes for better performance
taskSchema.index({ userId: 1, createdAt: -1 });
taskSchema.index({ userId: 1, status: 1 });
taskSchema.index({ userId: 1, priority: 1 });
taskSchema.index({ userId: 1, category: 1 });
taskSchema.index({ userId: 1, dueDate: 1 });

// Instance methods
taskSchema.methods.markComplete = function() {
  this.status = 'completed';
  this.completedAt = new Date();
  this.updatedAt = new Date();
  return this.save();
};

taskSchema.methods.markIncomplete = function() {
  this.status = 'pending';
  this.completedAt = undefined;
  this.updatedAt = new Date();
  return this.save();
};

// Static methods
taskSchema.statics.findByUser = async function(userId, filters = {}) {
  const query = { userId: new mongoose.Types.ObjectId(userId) };
  
  // Apply filters
  if (filters.status) {
    query.status = filters.status;
  }
  if (filters.priority) {
    query.priority = filters.priority;
  }
  if (filters.category) {
    query.category = filters.category;
  }
  if (filters.tags && filters.tags.length > 0) {
    query.tags = { $in: filters.tags };
  }
  if (filters.search) {
    query.$or = [
      { title: { $regex: filters.search, $options: 'i' } },
      { description: { $regex: filters.search, $options: 'i' } }
    ];
  }
  
  // Sorting
  const sortOptions = {};
  if (filters.sortBy) {
    sortOptions[filters.sortBy] = filters.sortOrder === 'desc' ? -1 : 1;
  } else {
    sortOptions.createdAt = -1; // Default sort by newest first
  }
  
  return this.find(query).sort(sortOptions).lean(); // Added lean for perf
};

taskSchema.statics.getTaskStats = async function(userId) {
  const stats = await this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalTime: { $sum: { $ifNull: ['$timeSpent', 0] } }
      }
    },
    { 
      $project: { 
        _id: 0, 
        status: '$_id', 
        count: 1, 
        totalTime: 1 
      } 
    }
  ]);

  // Convert to object with status as keys
  return stats.reduce((acc, { status, count, totalTime }) => {
    acc[status] = { count, totalTime };
    return acc;
  }, {});
};

const Task = mongoose.models.Task || mongoose.model('Task', taskSchema);

export default Task;