import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Send, ArrowLeft, User as UserIcon, MessageSquare } from 'lucide-react';
import { User, Chat as ChatType, Message } from '../types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '../lib/utils';

interface ChatProps {
  user: User | null;
}

export const Chat: React.FC<ChatProps> = ({ user }) => {
  const { tripId, otherUserId } = useParams<{ tripId: string; otherUserId: string }>();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [otherUserName, setOtherUserName] = useState('Usuario');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    // Load messages from localStorage
    const chatId = [user.id, otherUserId].sort().join('-') + '-' + tripId;
    const savedChats = JSON.parse(localStorage.getItem('chats') || '[]') as ChatType[];
    const currentChat = savedChats.find(c => c.id === chatId);

    if (currentChat) {
      setMessages(currentChat.messages);
    }

    // Get other user's name (mock)
    const trips = JSON.parse(localStorage.getItem('trips') || '[]');
    const trip = trips.find((t: any) => t.id === tripId);
    if (trip) {
      if (user.role === 'driver') {
        // Driver is talking to passenger
        const reservations = JSON.parse(localStorage.getItem('reservations') || '[]');
        const res = reservations.find((r: any) => r.tripId === tripId && r.passengerId === otherUserId);
        if (res) setOtherUserName(res.passengerName);
      } else {
        // Passenger is talking to driver
        setOtherUserName(trip.driverName);
      }
    }
  }, [user, tripId, otherUserId, navigate]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !user) return;

    const newMessage: Message = {
      id: Math.random().toString(36).substr(2, 9),
      senderId: user.id,
      senderName: user.name,
      text: inputText,
      timestamp: new Date().toISOString()
    };

    const chatId = [user.id, otherUserId].sort().join('-') + '-' + tripId;
    const savedChats = JSON.parse(localStorage.getItem('chats') || '[]') as ChatType[];
    const chatIndex = savedChats.findIndex(c => c.id === chatId);

    let updatedChats: ChatType[];
    if (chatIndex >= 0) {
      updatedChats = [...savedChats];
      updatedChats[chatIndex].messages.push(newMessage);
    } else {
      updatedChats = [
        ...savedChats,
        {
          id: chatId,
          tripId: tripId!,
          driverId: user.role === 'driver' ? user.id : otherUserId!,
          passengerId: user.role === 'passenger' ? user.id : otherUserId!,
          messages: [newMessage]
        }
      ];
    }

    localStorage.setItem('chats', JSON.stringify(updatedChats));
    setMessages([...messages, newMessage]);
    setInputText('');
  };

  return (
    <div className="max-w-2xl mx-auto h-[calc(100vh-12rem)] flex flex-col bg-white rounded-[40px] border border-gray-100 shadow-xl overflow-hidden">
      {/* Header */}
      <div className="p-6 border-bottom border-gray-100 flex items-center gap-4 bg-white sticky top-0 z-10">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-50 rounded-full transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-gray-500" />
        </button>
        <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center">
          <UserIcon className="w-6 h-6 text-indigo-600" />
        </div>
        <div>
          <h2 className="font-bold text-gray-900">{otherUserName}</h2>
          <p className="text-xs text-green-500 font-bold uppercase tracking-wider">En línea</p>
        </div>
      </div>

      {/* Messages Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/30"
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-40">
            <MessageSquare className="w-12 h-12 text-gray-400" />
            <p className="text-gray-500 font-medium">Inicia la conversación con {otherUserName}</p>
          </div>
        ) : (
          messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className={cn(
                "flex flex-col max-w-[80%]",
                msg.senderId === user?.id ? "ml-auto items-end" : "mr-auto items-start"
              )}
            >
              <div className={cn(
                "p-4 rounded-3xl text-sm font-medium shadow-sm",
                msg.senderId === user?.id 
                  ? "bg-indigo-600 text-white rounded-tr-none" 
                  : "bg-white text-gray-900 rounded-tl-none border border-gray-100"
              )}>
                {msg.text}
              </div>
              <span className="text-[10px] text-gray-400 mt-1 font-bold">
                {format(new Date(msg.timestamp), 'HH:mm')}
              </span>
            </motion.div>
          ))
        )}
      </div>

      {/* Input Area */}
      <form 
        onSubmit={handleSendMessage}
        className="p-6 bg-white border-t border-gray-100 flex gap-4"
      >
        <input 
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Escribe un mensaje..."
          className="flex-1 px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
        />
        <button 
          type="submit"
          className="w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
        >
          <Send className="w-6 h-6" />
        </button>
      </form>
    </div>
  );
};
