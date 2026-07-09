import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, 
  Lock, 
  Unlock, 
  CreditCard, 
  ArrowLeft, 
  MoreVertical,
  Phone,
  Video,
  Smile,
  Paperclip,
  Check,
  CheckCheck,
  AlertCircle,
} from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { chatAPI } from '../services/api';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { useCart } from '../context/CartContext';

const ChatPage = () => {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();
  const { addToCart } = useCart();
  const messagesEndRef = useRef(null);

  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [accessChecked, setAccessChecked] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [requiredPayment, setRequiredPayment] = useState(null);

  // Fetch conversations
  useEffect(() => {
    if (user) {
      fetchConversations();
    }
  }, [user]);

  // Join conversation room when selected
  useEffect(() => {
    if (selectedConversation && socket) {
      socket.emit('join_conversation', selectedConversation._id);
      fetchMessages(selectedConversation._id);
      checkCommunicationAccess(selectedConversation);
    }
  }, [selectedConversation, socket]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchConversations = async () => {
    try {
      const { data } = await chatAPI.getConversations();
      setConversations(data.conversations || []);
      
      // Select conversation from URL if exists
      if (conversationId) {
        const conv = data.conversations?.find(c => c._id === conversationId);
        if (conv) setSelectedConversation(conv);
      }
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (convId) => {
    try {
      const { data } = await chatAPI.getMessages(convId);
      setMessages(data.messages || []);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  };

  const checkCommunicationAccess = async (conversation) => {
    try {
      const { data } = await chatAPI.checkAccess(
        conversation.providerId,
        conversation.entityType
      );
      setHasAccess(data.accessGranted || false);
    } catch (error) {
      if (error.response?.status === 403) {
        setHasAccess(false);
        setRequiredPayment(error.response?.data);
      }
    } finally {
      setAccessChecked(true);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !hasAccess) return;

    try {
      await chatAPI.sendMessage({
        conversationId: selectedConversation._id,
        content: newMessage.trim(),
      });

      if (socket) {
        socket.emit('send_message', {
          conversationId: selectedConversation._id,
          content: newMessage.trim(),
        });
      }

      setMessages((prev) => [
        ...prev,
        {
          _id: Date.now(),
          sender: user,
          content: newMessage.trim(),
          createdAt: new Date(),
          status: 'sent',
        },
      ]);
      setNewMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleUnlockCommunication = () => {
    if (requiredPayment?.action === 'complete_payment') {
      navigate(`/checkout/${requiredPayment.entityType}/${requiredPayment.entityId}`);
    } else {
      navigate('/marketplace');
    }
    setShowUnlockModal(false);
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="h-screen bg-gray-50 flex">
      {/* Conversations List */}
      <div className={`w-full md:w-80 bg-white border-r border-gray-200 flex flex-col ${selectedConversation ? 'hidden md:flex' : 'flex'}`}>
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">Messages</h2>
        </div>

        {/* Conversations */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-gray-500">Loading...</div>
          ) : conversations.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <p>No conversations yet</p>
              <p className="text-sm mt-1">Start a chat after making a purchase</p>
            </div>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv._id}
                onClick={() => setSelectedConversation(conv)}
                className={`w-full p-4 flex items-center gap-3 hover:bg-gray-50 transition-colors ${
                  selectedConversation?._id === conv._id ? 'bg-blue-50' : ''
                }`}
              >
                <div className="relative">
                  <img
                    src={conv.providerAvatar || 'https://via.placeholder.com/40'}
                    alt={conv.providerName}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  {conv.unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      {conv.unreadCount}
                    </span>
                  )}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="font-medium text-gray-900 truncate">
                    {conv.providerName}
                  </p>
                  <p className="text-sm text-gray-500 truncate">
                    {conv.lastMessage?.content || 'No messages yet'}
                  </p>
                </div>
                <span className="text-xs text-gray-400">
                  {conv.lastMessage?.createdAt && formatTime(conv.lastMessage.createdAt)}
                </span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      {selectedConversation ? (
        <div className="flex-1 flex flex-col bg-white">
          {/* Chat Header */}
          <div className="p-4 border-b border-gray-200 flex items-center gap-3">
            <button
              onClick={() => setSelectedConversation(null)}
              className="md:hidden p-2 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft size={20} />
            </button>
            <img
              src={selectedConversation.providerAvatar || 'https://via.placeholder.com/40'}
              alt={selectedConversation.providerName}
              className="w-10 h-10 rounded-full object-cover"
            />
            <div className="flex-1">
              <p className="font-semibold text-gray-900">
                {selectedConversation.providerName}
              </p>
              <p className="text-xs text-gray-500">
                {isConnected ? 'Online' : 'Offline'}
              </p>
            </div>
            <div className="flex gap-2">
              <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
                <Phone size={20} />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
                <MoreVertical size={20} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {!accessChecked ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-gray-500">Checking access...</p>
                </div>
              </div>
            ) : !hasAccess ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center max-w-md">
                  <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Lock className="w-8 h-8 text-yellow-600" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    Communication Locked
                  </h3>
                  <p className="text-gray-600 mb-6">
                    You need to complete a payment before you can message this provider. 
                    This ensures quality service and prevents platform bypass.
                  </p>
                  <Button onClick={() => setShowUnlockModal(true)}>
                    <Unlock className="mr-2" size={18} />
                    Unlock Communication
                  </Button>
                </div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <p className="text-gray-500">No messages yet</p>
                  <p className="text-sm text-gray-400 mt-1">Start the conversation</p>
                </div>
              </div>
            ) : (
              messages.map((msg, index) => {
                const isOwn = msg.sender?._id === user?._id || msg.sender === user?._id;
                
                return (
                  <motion.div
                    key={msg._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs md:max-w-md px-4 py-2 rounded-2xl ${
                        isOwn
                          ? 'bg-blue-600 text-white rounded-br-md'
                          : 'bg-gray-100 text-gray-900 rounded-bl-md'
                      }`}
                    >
                      <p className="text-sm">{msg.content}</p>
                      <div className={`flex items-center justify-end gap-1 mt-1 text-xs ${
                        isOwn ? 'text-blue-200' : 'text-gray-400'
                      }`}>
                        <span>{formatTime(msg.createdAt)}</span>
                        {isOwn && (
                          <span>
                            {msg.status === 'delivered' ? (
                              <CheckCheck size={12} />
                            ) : msg.status === 'sent' ? (
                              <Check size={12} />
                            ) : null}
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          {hasAccess && (
            <form onSubmit={sendMessage} className="p-4 border-t border-gray-200 flex items-center gap-2">
              <button type="button" className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
                <Paperclip size={20} />
              </button>
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 px-4 py-2 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"
              >
                <Smile size={20} />
              </button>
              <button
                type="submit"
                disabled={!newMessage.trim()}
                className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={20} />
              </button>
            </form>
          )}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <Send className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Your Messages</h3>
            <p className="text-gray-500">Select a conversation to start chatting</p>
          </div>
        </div>
      )}

      {/* Unlock Modal */}
      <Modal
        isOpen={showUnlockModal}
        onClose={() => setShowUnlockModal(false)}
        title="Unlock Communication"
        size="md"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-yellow-50 rounded-lg">
            <AlertCircle className="w-8 h-8 text-yellow-600" />
            <div>
              <p className="font-medium text-gray-900">Payment Required</p>
              <p className="text-sm text-gray-600">
                Complete a purchase to unlock messaging with this provider.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="font-medium text-gray-900">Benefits of unlocking:</p>
            <ul className="text-sm text-gray-600 space-y-2">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                Direct messaging with the provider
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                View contact details (phone, email)
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                Real-time updates and notifications
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                Priority customer support
              </li>
            </ul>
          </div>

          <Button fullWidth onClick={handleUnlockCommunication}>
            <CreditCard className="mr-2" size={18} />
            Complete Payment
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default ChatPage;