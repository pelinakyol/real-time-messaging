const mongoose = require('mongoose') 

// Friendship Schema
const FriendshipSchema = new mongoose.Schema({
    user_id_1: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    user_id_2: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    created_at: { type: Date, default: Date.now },
  });
  
  // Unique constraint for friendships between two users
  FriendshipSchema.index({ user_id_1: 1, user_id_2: 1 }, { unique: true });
  
  const Friendship = mongoose.model("Friendship", FriendshipSchema);

module.exports = Friendship
