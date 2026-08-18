'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';

interface ChatRoom {
  uid: string;
  friend: {
    uid: string;
    friendCode: string;
    nickname: string;
  } | null;
  createdAt: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function ChatsPage() {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const response = await apiFetch(`${API_URL}/chat-rooms`);

        if (!response.ok) {
          throw new Error('채팅방 목록 조회에 실패했습니다.');
        }

        const data = (await response.json()) as ChatRoom[];

        setRooms(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    void fetchRooms();
  }, []);

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
              className="block rounded-lg border p-4 hover:bg-gray-50"
            >
              <div className="font-medium">
                {room.friend?.nickname ?? '알 수 없는 사용자'}
              </div>

              {room.friend && (
                <div className="mt-1 text-sm text-gray-500">
                  친구 코드: {room.friend.friendCode}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
