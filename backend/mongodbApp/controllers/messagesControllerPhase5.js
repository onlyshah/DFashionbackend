/**
 * Messages/Chat Controller - Complete MongoDB Implementation (Phase 5)
 * 9 methods for messaging and conversations management
 */

const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const User = require('../models/User');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');

/**
 * 1. Send a message
 */
exports.sendMessage = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new ApiError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const { conversationId, recipientId, content, attachments } = req.body;

    if (!conversationId && !recipientId) {
      throw new ApiError('Either conversationId or recipientId is required', 400, 'VALIDATION_ERROR');
    }

    if (!content || content.trim().length === 0) {
      throw new ApiError('Message content is required', 400, 'VALIDATION_ERROR');
    }

    if (content.length > 5000) {
      throw new ApiError('Message cannot exceed 5000 characters', 400, 'VALIDATION_ERROR');
    }

    let conversation = conversationId 
      ? await Conversation.findById(conversationId) 
      : null;

    // If no existing conversation, create one
    if (!conversation && recipientId) {
      if (!recipientId.match(/^[0-9a-fA-F]{24}$/)) {
        throw new ApiError('Invalid recipient ID', 400, 'INVALID_ID');
      }

      // Check if recipient exists
      const recipient = await User.findById(recipientId);
      if (!recipient) {
        throw new ApiError('Recipient not found', 404, 'USER_NOT_FOUND');
      }

      // Check if conversation already exists between these users
      conversation = await Conversation.findOne({
        participants: { $all: [req.user._id, recipientId] }
      });

      if (!conversation) {
        conversation = await Conversation.create({
          participants: [req.user._id, recipientId],
          unreadCount: new Map([[recipientId.toString(), 1]])
        });
      }
    }

    if (!conversation) {
      throw new ApiError('Conversation not found', 404, 'CONVERSATION_NOT_FOUND');
    }

    // Verify user is participant in conversation
    const isParticipant = conversation.participants.some(p => p.toString() === req.user._id.toString());
    if (!isParticipant) {
      throw new ApiError('Not a participant in this conversation', 403, 'FORBIDDEN');
    }

    const message = await Message.create({
      conversationId: conversation._id,
      senderId: req.user._id,
      recipientId: conversation.participants.find(p => p.toString() !== req.user._id.toString()),
      content,
      attachments: attachments || []
    });

    // Update conversation with latest message
    await Conversation.findByIdAndUpdate(
      conversation._id,
      {
        lastMessage: content,
        lastMessageAt: new Date(),
        lastMessageBy: req.user._id,
        $inc: { 'unreadCount.${recipientId}': 1 }
      }
    );

    const populatedMessage = await Message.findById(message._id)
      .populate('senderId', 'name email avatar')
      .populate('recipientId', 'name email avatar');

    return ApiResponse.created(res, populatedMessage, 'Message sent successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * 2. Get messages in a conversation
 */
exports.getMessages = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const { page = 1, limit = 50, sort = '-createdAt' } = req.query;

    if (!conversationId.match(/^[0-9a-fA-F]{24}$/)) {
      throw new ApiError('Invalid conversation ID', 400, 'INVALID_ID');
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit) || 50);
    const skip = (pageNum - 1) * limitNum;

    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      throw new ApiError('Conversation not found', 404, 'CONVERSATION_NOT_FOUND');
    }

    // Verify user is participant
    if (req.user) {
      const isParticipant = conversation.participants.some(p => p.toString() === req.user._id.toString());
      if (!isParticipant) {
        throw new ApiError('Not a participant in this conversation', 403, 'FORBIDDEN');
      }
    }

    const [messages, total] = await Promise.all([
      Message.find({ conversationId })
        .populate('senderId', 'name email avatar')
        .populate('recipientId', 'name email avatar')
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Message.countDocuments({ conversationId })
    ]);

    return ApiResponse.paginated(res, messages, {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
      hasNextPage: pageNum < Math.ceil(total / limitNum),
      hasPrevPage: pageNum > 1
    }, 'Messages retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * 3. Get all conversations for user
 */
exports.getConversations = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new ApiError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const { page = 1, limit = 20, sort = '-lastMessageAt' } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit) || 20);
    const skip = (pageNum - 1) * limitNum;

    const [conversations, total] = await Promise.all([
      Conversation.find({ participants: req.user._id })
        .populate('participants', 'name email avatar')
        .populate('lastMessageBy', 'name email')
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Conversation.countDocuments({ participants: req.user._id })
    ]);

    return ApiResponse.paginated(res, conversations, {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
      hasNextPage: pageNum < Math.ceil(total / limitNum),
      hasPrevPage: pageNum > 1
    }, 'Conversations retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * 4. Get conversation details with messages
 */
exports.getConversationWithMessages = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new ApiError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const { conversationId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    if (!conversationId.match(/^[0-9a-fA-F]{24}$/)) {
      throw new ApiError('Invalid conversation ID', 400, 'INVALID_ID');
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit) || 50);
    const skip = (pageNum - 1) * limitNum;

    const conversation = await Conversation.findById(conversationId)
      .populate('participants', 'name email avatar profile');

    if (!conversation) {
      throw new ApiError('Conversation not found', 404, 'CONVERSATION_NOT_FOUND');
    }

    const isParticipant = conversation.participants.some(p => p._id.toString() === req.user._id.toString());
    if (!isParticipant) {
      throw new ApiError('Not a participant in this conversation', 403, 'FORBIDDEN');
    }

    const [messages, total] = await Promise.all([
      Message.find({ conversationId })
        .populate('senderId', 'name email avatar')
        .populate('recipientId', 'name email avatar')
        .sort('-createdAt')
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Message.countDocuments({ conversationId })
    ]);

    return ApiResponse.paginated(res, {
      conversation,
      messages
    }, {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
      hasNextPage: pageNum < Math.ceil(total / limitNum),
      hasPrevPage: pageNum > 1
    }, 'Conversation with messages retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * 5. Delete conversation
 */
exports.deleteConversation = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new ApiError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const { conversationId } = req.params;

    if (!conversationId.match(/^[0-9a-fA-F]{24}$/)) {
      throw new ApiError('Invalid conversation ID', 400, 'INVALID_ID');
    }

    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      throw new ApiError('Conversation not found', 404, 'CONVERSATION_NOT_FOUND');
    }

    const isParticipant = conversation.participants.some(p => p.toString() === req.user._id.toString());
    if (!isParticipant) {
      throw new ApiError('Not authorized to delete this conversation', 403, 'FORBIDDEN');
    }

    // Delete all messages in conversation
    await Message.deleteMany({ conversationId });

    // Delete conversation
    await Conversation.findByIdAndDelete(conversationId);

    return ApiResponse.success(res, { id: conversationId }, 'Conversation deleted successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * 6. Mark conversation messages as read
 */
exports.markConversationAsRead = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new ApiError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const { conversationId } = req.params;

    if (!conversationId.match(/^[0-9a-fA-F]{24}$/)) {
      throw new ApiError('Invalid conversation ID', 400, 'INVALID_ID');
    }

    const result = await Message.updateMany(
      {
        conversationId,
        recipientId: req.user._id,
        isRead: false
      },
      {
        $set: {
          isRead: true,
          readAt: new Date()
        }
      }
    );

    return ApiResponse.success(res, {
      modifiedCount: result.modifiedCount
    }, 'Messages marked as read');
  } catch (error) {
    next(error);
  }
};

/**
 * 7. Send typing indicator (placeholder)
 */
exports.sendTypingIndicator = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new ApiError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const { conversationId } = req.params;
    const { isTyping } = req.body;

    if (!conversationId.match(/^[0-9a-fA-F]{24}$/)) {
      throw new ApiError('Invalid conversation ID', 400, 'INVALID_ID');
    }

    // In real app, this would emit Socket.IO event to other participants
    // For now, just acknowledge

    return ApiResponse.success(res, {
      conversationId,
      userId: req.user._id,
      isTyping: isTyping || true
    }, 'Typing indicator sent');
  } catch (error) {
    next(error);
  }
};

/**
 * 8. Get unread messages count
 */
exports.getUnreadMessagesCount = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new ApiError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const unreadCount = await Message.countDocuments({
      recipientId: req.user._id,
      isRead: false
    });

    return ApiResponse.success(res, {
      unreadCount,
      userId: req.user._id
    }, 'Unread messages count retrieved');
  } catch (error) {
    next(error);
  }
};

module.exports = exports;
