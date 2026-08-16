'use client';

import { useState } from 'react';
import type { SubmitEvent } from 'react';
import { useRouter } from 'next/navigation';

import { apiFetch } from '@/lib/api';

export default function RegisterPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    setErrorMessage('');
    setIsLoading(true);

    try {
      const response = await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email,
          password,
          nickname,
        }),
      });

      if (response.status === 409) {
        setErrorMessage('이미 사용 중인 이메일입니다.');
        return;
      }

      if (!response.ok) {
        setErrorMessage('회원가입 정보를 확인해주세요.');
        return;
      }

      router.push('/login');
    } catch {
      setErrorMessage('서버와 통신할 수 없습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className='flex min-h-screen items-center justify-center p-6'>
      <div className='w-full max-w-md'>
        <h1 className='mb-8 text-2xl font-bold'>회원가입</h1>

        <form
          onSubmit={handleSubmit}
          className='flex flex-col gap-4'
        >
          <div>
            <label
              htmlFor='email'
              className='mb-1 block'
            >
              이메일
            </label>

            <input
              id='email'
              type='email'
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className='w-full rounded border p-2'
              autoComplete='email'
              required
            />
          </div>

          <div>
            <label
              htmlFor='nickname'
              className='mb-1 block'
            >
              닉네임
            </label>

            <input
              id='nickname'
              type='text'
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
              className='w-full rounded border p-2'
              required
            />
          </div>

          <div>
            <label
              htmlFor='password'
              className='mb-1 block'
            >
              비밀번호
            </label>

            <input
              id='password'
              type='password'
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className='w-full rounded border p-2'
              autoComplete='new-password'
              minLength={8}
              required
            />
          </div>

          {errorMessage && (
            <p className='text-sm text-red-500'>
              {errorMessage}
            </p>
          )}

          <button
            type='submit'
            disabled={isLoading}
            className='rounded bg-black p-2 text-white disabled:opacity-50'
          >
            {isLoading ? '가입 중...' : '회원가입'}
          </button>
        </form>
      </div>
    </main>
  );
}