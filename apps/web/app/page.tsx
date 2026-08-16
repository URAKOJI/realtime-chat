import Link from 'next/link';

export default function Home() {
  return (
    <main className='p-8'>
      <h1 className='mb-6 text-2xl font-bold'>Realtime Chat</h1>

      <div className='flex gap-4'>
        <Link href='/login'>로그인</Link>
        <Link href='/register'>회원가입</Link>
      </div>
    </main>
  );
}