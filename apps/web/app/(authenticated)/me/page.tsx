'use client';

import Button from '@/components/ui/Button';
import { apiFetch } from '@/lib/api';
import { socket } from '@/lib/socket';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface User {
  uid: string;
  email: string;
  nickname: string;
  friendCode: string;
}

export default function MePage() {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await apiFetch('/users/me');
        if (response.status === 401) {
          router.replace('/login');
          return;
        }
        if (!response.ok) {
          setErrorMessage('사용자 정보를 불러오지 못했습니다.');
          return;
        }
        const data: User = await response.json();
        setUser(data);
      } catch {
        setErrorMessage('서버와 통신할 수 없습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    void fetchUser();
  }, [router]);

  const handleLogout = async () => {
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);
    setErrorMessage('');

    try {
      const response = await apiFetch('/auth/logout', {
        method: 'POST',
      });

      if (!response.ok) {
        setErrorMessage('로그아웃에 실패했습니다.');
        return;
      }

      socket.disconnect();

      router.replace('/login');
    } catch {
      setErrorMessage('서버와 통신할 수 없습니다.');
    } finally {
      setIsLoggingOut(false);
    }
  };

  if (isLoading) {
    return (
      <main className="p-8">
        <p>사용자 정보를 불러오는 중...</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="p-8">
        {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl p-6">
      <section className="rounded border p-4">
        <h2 className="mb-4 text-lg font-semibold">내 정보</h2>

        <dl className="space-y-2">
          <div className="flex gap-2">
            <dt className="font-medium">닉네임</dt>
            <dd>{user.nickname}</dd>
          </div>

          <div className="flex gap-2">
            <dt className="font-medium">친구 코드</dt>
            <dd>{user.friendCode}</dd>
          </div>

          <div className="flex gap-2">
            <dt className="font-medium">이메일</dt>
            <dd>{user.email}</dd>
          </div>
        </dl>
      </section>
      <Button
        fullWidth
        className="mt-4"
        type="button"
        onClick={() => {
          void handleLogout();
        }}
        disabled={isLoggingOut}
      >
        {isLoggingOut ? '로그아웃 중...' : '로그아웃'}
      </Button>
    </main>
  );
}
