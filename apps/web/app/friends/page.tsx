'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import AddFriendModal from '@/components/friends/AddFriendModal';
import { apiFetch } from '@/lib/api';

interface User {
  uid: string;
  email: string;
  nickname: string;
  friendCode: string;
  lastLoginAt: string | null;
  createdAt: string;
}

interface FriendRequest {
  friendshipUid: string;
  friendCode: string;
  nickname: string;
  requestedAt: string;
}

interface Friend {
  friendshipUid: string;
  friendCode: string;
  nickname: string;
}

export default function FriendsPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isFriendRequestsLoading, setIsFriendRequestsLoading] = useState(true);
  const [isFriendsLoading, setIsFriendsLoading] = useState(true);

  const [errorMessage, setErrorMessage] = useState('');
  const [isAddFriendOpen, setIsAddFriendOpen] = useState(false);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [userResponse, friendRequestsResponse, friendsResponse] =
          await Promise.all([
            apiFetch('/users/me'),
            apiFetch('/friends/requests/received'),
            apiFetch('/friends'),
          ]);

        if (
          userResponse.status === 401 ||
          friendRequestsResponse.status === 401 ||
          friendsResponse.status === 401
        ) {
          router.replace('/login');
          return;
        }

        if (!userResponse.ok) {
          setErrorMessage('사용자 정보를 불러오지 못했습니다.');
          return;
        }

        if (!friendRequestsResponse.ok) {
          setErrorMessage('친구 요청 목록을 불러오지 못했습니다.');
          return;
        }

        if (!friendsResponse.ok) {
          setErrorMessage('친구 목록을 불러오지 못했습니다.');
          return;
        }

        const userData = (await userResponse.json()) as User;
        const friendRequestsData =
          (await friendRequestsResponse.json()) as FriendRequest[];
        const friendsData = (await friendsResponse.json()) as Friend[];

        setUser(userData);
        setFriendRequests(friendRequestsData);
        setFriends(friendsData);
      } catch {
        setErrorMessage('서버와 통신할 수 없습니다.');
      } finally {
        setIsLoading(false);
        setIsFriendRequestsLoading(false);
        setIsFriendsLoading(false);
      }
    };

    void loadInitialData();
  }, [router]);

  const fetchFriendRequests = async () => {
    setIsFriendRequestsLoading(true);

    try {
      const response = await apiFetch('/friends/requests/received');

      if (response.status === 401) {
        router.replace('/login');
        return;
      }

      if (!response.ok) {
        setErrorMessage('친구 요청 목록을 불러오지 못했습니다.');
        return;
      }

      const data = (await response.json()) as FriendRequest[];

      setFriendRequests(data);
    } catch {
      setErrorMessage('서버와 통신할 수 없습니다.');
    } finally {
      setIsFriendRequestsLoading(false);
    }
  };

  const fetchFriends = async () => {
    setIsFriendsLoading(true);

    try {
      const response = await apiFetch('/friends');

      if (response.status === 401) {
        router.replace('/login');
        return;
      }

      if (!response.ok) {
        setErrorMessage('친구 목록을 불러오지 못했습니다.');
        return;
      }

      const data = (await response.json()) as Friend[];

      setFriends(data);
    } catch {
      setErrorMessage('서버와 통신할 수 없습니다.');
    } finally {
      setIsFriendsLoading(false);
    }
  };

  const handleAcceptRequest = async (friendshipUid: string) => {
    setErrorMessage('');

    try {
      const response = await apiFetch(
        `/friends/requests/${friendshipUid}/accept`,
        {
          method: 'PATCH',
        },
      );

      if (response.status === 401) {
        router.replace('/login');
        return;
      }

      if (!response.ok) {
        setErrorMessage('친구 요청 승인에 실패했습니다.');
        return;
      }

      await Promise.all([fetchFriendRequests(), fetchFriends()]);
    } catch {
      setErrorMessage('서버와 통신할 수 없습니다.');
    }
  };

  const handleRejectRequest = async (friendshipUid: string) => {
    setErrorMessage('');

    try {
      const response = await apiFetch(
        `/friends/requests/${friendshipUid}/reject`,
        {
          method: 'PATCH',
        },
      );

      if (response.status === 401) {
        router.replace('/login');
        return;
      }

      if (!response.ok) {
        setErrorMessage('친구 요청 거절에 실패했습니다.');
        return;
      }

      await fetchFriendRequests();
    } catch {
      setErrorMessage('서버와 통신할 수 없습니다.');
    }
  };

  const handleRemoveFriend = async (friendshipUid: string) => {
    setErrorMessage('');

    const isConfirmed = window.confirm('친구 관계를 해제하시겠습니까?');

    if (!isConfirmed) {
      return;
    }

    try {
      const response = await apiFetch(`/friends/${friendshipUid}`, {
        method: 'DELETE',
      });

      if (response.status === 401) {
        router.replace('/login');
        return;
      }

      if (!response.ok) {
        setErrorMessage('친구 관계 해제에 실패했습니다.');
        return;
      }

      await fetchFriends();
    } catch {
      setErrorMessage('서버와 통신할 수 없습니다.');
    }
  };

  const handleLogout = async () => {
    setErrorMessage('');

    try {
      const response = await apiFetch('/auth/logout', {
        method: 'POST',
      });

      if (!response.ok) {
        setErrorMessage('로그아웃에 실패했습니다.');
        return;
      }

      router.replace('/login');
    } catch {
      setErrorMessage('서버와 통신할 수 없습니다.');
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
    <>
      <main className="mx-auto max-w-3xl p-8">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-bold">친구</h1>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setIsAddFriendOpen(true)}
              className="rounded bg-black px-4 py-2 text-white dark:bg-white dark:text-black"
            >
              + 친구 추가
            </button>

            <button
              type="button"
              onClick={() => {
                void handleLogout();
              }}
              className="rounded border px-4 py-2 dark:border-zinc-700"
            >
              로그아웃
            </button>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-6 rounded border border-red-200 bg-red-50 p-3">
            <p className="text-sm text-red-600">{errorMessage}</p>
          </div>
        )}

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

        <section className="mt-8 rounded border p-4">
          <h2 className="text-lg font-semibold">받은 친구 요청</h2>

          {isFriendRequestsLoading ? (
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              친구 요청을 불러오는 중...
            </p>
          ) : friendRequests.length === 0 ? (
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              받은 친구 요청이 없습니다.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {friendRequests.map((request) => (
                <li
                  key={request.friendshipUid}
                  className="flex items-center justify-between rounded border p-3"
                >
                  <div>
                    <p className="font-medium">{request.nickname}</p>

                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {request.friendCode}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        void handleAcceptRequest(request.friendshipUid);
                      }}
                      className="rounded bg-black px-3 py-1.5 text-sm text-white"
                    >
                      승인
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        void handleRejectRequest(request.friendshipUid);
                      }}
                      className="rounded border px-3 py-1.5 text-sm"
                    >
                      거절
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-8 rounded border p-4">
          <h2 className="text-lg font-semibold">친구 목록</h2>

          {isFriendsLoading ? (
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              친구 목록을 불러오는 중...
            </p>
          ) : friends.length === 0 ? (
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              등록된 친구가 없습니다.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {friends.map((friend) => (
                <li
                  key={friend.friendshipUid}
                  className="flex items-center justify-between rounded border p-3"
                >
                  <div>
                    <p className="font-medium">{friend.nickname}</p>

                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {friend.friendCode}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      void handleRemoveFriend(friend.friendshipUid);
                    }}
                    className="rounded border border-red-300 px-3 py-1.5 text-sm text-red-600"
                  >
                    친구 해제
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      <AddFriendModal
        open={isAddFriendOpen}
        onClose={() => setIsAddFriendOpen(false)}
      />
    </>
  );
}
