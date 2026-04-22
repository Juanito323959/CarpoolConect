import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { MessageSquare, User as UserIcon, ChevronRight, Search, Trash2 } from 'lucide-react';
import { User, Chat as ChatType } from '../types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ChatListProps {
  user: User | null;
}

export const ChatList: React.FC<ChatListProps> = ({ user }) => {
  const navigate = useNavigate();
  const [chats, setChats] = useState<ChatType[]>([]);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const loadChats = () => {
      const savedChats = JSON.parse(localStorage.getItem('chats') || '[]') as ChatType[];
      const myChats = savedChats.filter(c => c.driverId === user.id || c.passengerId === user.id);
      setChats(myChats);
    };

    loadChats();
    // Listen for storage changes to update chat list in real-time
    window.addEventListener('storage', loadChats);
    return () => window.removeEventListener('storage', loadChats);
  }, [user, navigate]);

  const deleteChat = (e: React.MouseEvent, chatId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (window.confirm('¿Estás seguro de que deseas eliminar esta conversación?')) {
      const savedChats = JSON.parse(localStorage.getItem('chats') || '[]') as ChatType[];
      const updatedChats = savedChats.filter(c => c.id !== chatId);
      localStorage.setItem('chats', JSON.stringify(updatedChats));
      setChats(prev => prev.filter(c => c.id !== chatId));
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-4xl font-extrabold text-gray-900">Mensajes</h1>
        <p className="text-gray-500">Tus conversaciones con conductores y pasajeros</p>
      </div>

      <div className="bg-white rounded-[40px] border border-gray-100 shadow-xl overflow-hidden">
        <div className="p-6 space-y-4">
          {chats.length === 0 ? (
            <div className="text-center py-20 space-y-4 opacity-40">
              <MessageSquare className="w-16 h-16 text-gray-400 mx-auto" />
              <div className="space-y-2">
                <p className="text-xl font-bold text-gray-900">No hay mensajes</p>
                <p className="text-gray-500">Inicia un chat desde los detalles de un viaje reservado.</p>
              </div>
            </div>
          ) : (
            chats.map((chat) => {
              const lastMessage = chat.messages[chat.messages.length - 1];
              const otherUserId = chat.driverId === user?.id ? chat.passengerId : chat.driverId;
              
              return (
                <Link 
                  key={chat.id}
                  to={`/chat/${chat.tripId}/${otherUserId}`}
                  className="flex items-center gap-6 p-6 hover:bg-gray-50 transition-all rounded-[32px] group"
                >
                  <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                    <UserIcon className="w-8 h-8" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-bold text-gray-900 truncate">Chat de Viaje</h3>
                      {lastMessage && (
                        <span className="text-[10px] text-gray-400 font-bold uppercase">
                          {format(new Date(lastMessage.timestamp), 'HH:mm')}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 truncate font-medium">
                      {lastMessage ? lastMessage.text : 'Inicia la conversación...'}
                    </p>
                  </div>
                    <div className="flex flex-col items-end gap-2">
                      <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-indigo-600 transition-colors" />
                      <button 
                        onClick={(e) => deleteChat(e, chat.id)}
                        className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                        title="Eliminar chat"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </Link>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
