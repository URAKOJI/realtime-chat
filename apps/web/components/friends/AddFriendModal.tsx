'use client';

import { useState } from 'react';

import { apiFetch } from '@/lib/api';

interface AddFriendModalProps {
  open: boolean;
  onClose: () => void;
}

interface SearchFriendResult {
  friendCode: string;
  nickname: string;
}

export default function AddFriendModal({ open, onClose }: AddFriendModalProps) {
  const [friendCode, setFriendCode] = useState('');
  const [searchResult, setSearchResult] = useState<SearchFriendResult | null>(
    null,
  );

  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [isSearching, setIsSearching] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);

  if (!open) {
    return null;
  }

  const handleSearch = async () => {
    const normalizedFriendCode = friendCode.trim().toUpperCase();

    if (!normalizedFriendCode) {
      setErrorMessage('친구 코드를 입력해주세요.');
      return;
    }

    setErrorMessage('');
    setSuccessMessage('');
    setSearchResult(null);
    setIsSearching(true);

    try {
      const response = await apiFetch(
        `/friends/search?friendCode=${encodeURIComponent(normalizedFriendCode)}`,
      );

      if (response.status === 404) {
        setErrorMessage('사용자를 찾을 수 없습니다.');
        return;
      }

      if (!response.ok) {
        setErrorMessage('친구 검색에 실패했습니다.');
        return;
      }

      const data = (await response.json()) as SearchFriendResult;

      setSearchResult(data);
    } catch {
      setErrorMessage('서버와 통신할 수 없습니다.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSendRequest = async () => {
    if (!searchResult) {
      return;
    }

    setErrorMessage('');
    setSuccessMessage('');
    setIsRequesting(true);

    try {
      const response = await apiFetch('/friends/requests', {
        method: 'POST',
        body: JSON.stringify({
          friendCode: searchResult.friendCode,
        }),
      });

      if (response.status === 409) {
        setErrorMessage('이미 친구이거나 친구 요청이 진행 중입니다.');
        return;
      }

      if (response.status === 400) {
        setErrorMessage('자기 자신에게 친구 요청을 보낼 수 없습니다.');
        return;
      }

      if (!response.ok) {
        setErrorMessage('친구 요청에 실패했습니다.');
        return;
      }

      setSuccessMessage('친구 요청을 보냈습니다.');
    } catch {
      setErrorMessage('서버와 통신할 수 없습니다.');
    } finally {
      setIsRequesting(false);
    }
  };

  const handleClose = () => {
    setFriendCode('');
    setSearchResult(null);
    setErrorMessage('');
    setSuccessMessage('');

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 text-black shadow-lg dark:bg-zinc-900 dark:text-white">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold">친구 추가</h2>

          <button
            type="button"
            onClick={handleClose}
            className="text-gray-500 hover:text-black"
          >
            닫기
          </button>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={friendCode}
            onChange={(event) => {
              setFriendCode(event.target.value);
              setSearchResult(null);
              setErrorMessage('');
              setSuccessMessage('');
            }}
            placeholder="친구 코드 입력"
            maxLength={8}
            className="min-w-0 flex-1 rounded border bg-white p-2 text-black dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
          />

          <button
            type="button"
            onClick={handleSearch}
            disabled={isSearching}
            className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
          >
            {isSearching ? '검색 중...' : '검색'}
          </button>
        </div>

        {errorMessage && (
          <p className="mt-3 text-sm text-red-500">{errorMessage}</p>
        )}

        {successMessage && (
          <p className="mt-3 text-sm text-green-600">{successMessage}</p>
        )}

        {searchResult && (
          <div className="mt-6 rounded border p-4 dark:border-zinc-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              검색 결과
            </p>

            <div className="mt-2 flex items-center justify-between">
              <div>
                <p className="font-semibold">{searchResult.nickname}</p>

                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {searchResult.friendCode}
                </p>
              </div>

              <button
                type="button"
                onClick={handleSendRequest}
                disabled={isRequesting || Boolean(successMessage)}
                className="rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
              >
                {isRequesting
                  ? '요청 중...'
                  : successMessage
                    ? '요청 완료'
                    : '친구 요청'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
