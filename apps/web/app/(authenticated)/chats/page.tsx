'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { socket } from '@/lib/socket';

interface ChatRoom {
  uid: string;
  friend: {
    uid: string;
    friendCode: string;
    nickname: string;
    isOnline: boolean;
  } | null;
  createdAt: string;
  unreadCount: number;
  lastMessage: {
    _id: string;
    senderUid: string;
    content: string;
    createdAt: string;
  } | null;
}

export default function ChatsPage() {
  const router = useRouter();

  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);

  const formatMessageTime = (createdAt: string) => {
    return new Date(createdAt).toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  useEffect(() => {
    let isMounted = true;

    const loadRooms = async () => {
      try {
        const response = await apiFetch('/chat-rooms');

        if (response.status === 401) {
          router.replace('/login');
          return;
        }

        if (!response.ok) {
          throw new Error('채팅방 목록 조회에 실패했습니다.');
        }

        const data = (await response.json()) as ChatRoom[];

        if (isMounted) {
          setRooms(data);
        }
      } catch (error) {
        console.error(error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    const handleChatListUpdate = () => {
      void loadRooms();
    };

    void loadRooms();

    socket.on('chat:list:update', handleChatListUpdate);

    return () => {
      isMounted = false;

      socket.off('chat:list:update', handleChatListUpdate);
    };
  }, [router]);

  if (loading) {
    return <div className="p-6">불러오는 중...</div>;
  }

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="mb-6 text-2xl font-bold">채팅</h1>

      {rooms.length === 0 ? (
        <p className="text-gray-500">아직 채팅방이 없습니다.</p>
      ) : (
        <div className="space-y-2">
          {rooms.map((room) => (
            <Link
              key={room.uid}
              href={`/chats/${room.uid}`}
              className="flex items-center justify-between rounded-lg border p-4 hover:bg-gray-50 dark:hover:bg-zinc-800"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <div className="truncate font-medium">
                      {room.friend?.nickname ?? '알 수 없는 사용자'}
                    </div>

                    {room.friend && (
                      <span
                        className={`h-2 w-2 shrink-0 rounded-full ${
                          room.friend.isOnline ? 'bg-green-500' : 'bg-gray-400'
                        }`}
                      />
                    )}
                  </div>

                  <div className="shrink-0 text-xs text-gray-400">
                    {room.lastMessage
                      ? formatMessageTime(room.lastMessage.createdAt)
                      : formatMessageTime(room.createdAt)}
                  </div>
                </div>

                <div className="mt-1 flex items-center justify-between gap-4">
                  <p className="truncate text-sm text-gray-500 dark:text-gray-400">
                    {room.lastMessage?.content ?? '아직 메시지가 없습니다.'}
                  </p>

                  {room.unreadCount > 0 && (
                    <span className="flex min-w-6 shrink-0 items-center justify-center rounded-full bg-red-500 px-2 py-1 text-xs font-semibold text-white">
                      {room.unreadCount > 99 ? '99+' : room.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
