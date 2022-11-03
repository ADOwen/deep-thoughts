const { User, Thought } = require('../models');
const { signToken } = require('../utils/auth');
const { AuthenticationError } = require('apollo-server-express');

const resolvers = {
  Query: {
    // get all thoughts
    thoughts: async (parent, { username }) => {
      const params = username ? { username } : {};
      return Thought.find(params).sort({ createdAt: -1 });
    },


    // get thoughts by id
    thought: async (parent, { _id }) => {
      return Thought.findOne({ _id });
    },


    // get all users
    users: async () => {
      return User.find()
        .select('-__v -password')
        .populate('friends')
        .populate('thoughts');
    },


    // get a user by username
    user: async (parent, { username }) => {
      return User.findOne({ username })
        .select('-__v -password')
        .populate('friends')
        .populate('thoughts');
    },

    me: async (parent, args, context) =>{      
      if (context.user) {
        const userData = await User.findOne({_id: context.user._id})
        .select('-__V -password')
        .populate('thoughts')
        .populate('friends')

        return userData;

      }  

      throw new AuthenticationError('Not logged in');

    }
  },

  Mutation: {
    addUser: async (parent, args) => {
      const user = await User.create(args);
      const token = signToken(user);


      return { token, user};
    },


    addThought: async(parent, args, context) => {
      if (context.user){
        const thought = await Thought.create({...args, username: context.user.username})

        await User.findByIdAndUpdate(
          { _id: context.user._id } ,
          { $push: { thoughts: thought._id } },
          { new: true },
        )

        return thought;
      }

      throw new AuthenticationError('Not logged in!')
    },



    addReaction: async (parent, {thoughtId, reactionBody}, context) => {
      if (context.user){
        const updatedThought = await Thought.findByIdAndUpdate(
          { _id: thoughtId },
          {$push:{ reactions: { reactionBody, username: context.user.username} }},
          { new: true }
        )

        return updatedThought;
      }

      throw new AuthenticationError('Not logged in!')
    },


    addFriend: async (parent, {friendId}, context) => {
      if (context.user){
        const updatedUser = await User.findByIdAndUpdate(
          { _id: context.user._id },
          {$addToSet: { friends: friendId }},
          { new: true }
        ).populate('friends');

        return updatedUser;
      }

      throw new AuthenticationError('Not logged in!')
    },


    login: async (parent, { email, password}) => {
      const user = await User.findOne({ email });

      if (!user){
        throw new AuthenticationError('Incorrect credentials')
      }

      const correctPw = await user.isCorrectPassword(password)

      if (!correctPw) {
        throw new AuthenticationError('Incorrect credentials');
      }
       
      const token = signToken(user);
      
      return { user, token };
    },

  },
};

module.exports = resolvers;