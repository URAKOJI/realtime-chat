'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

import { socket } from '@/lib/socket';
import BottomNavigation from './BottomNavigation';

interface AuthenticatedLayoutProps {
  children: React.ReactNode;
}

export default function AuthenticatedLayout({
  children,
}: AuthenticatedLayoutProps) {
  const pathname = usePathname();

  const isChatRoom = pathname.startsWith('/chats/');

  useEffect(() => {
    let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

    const stopHeartbeat = () => {
      if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
      }
    };

    const sendHeartbeat = () => {
      if (!socket.connected) {
        return;
      }

      socket.emit('presence:heartbeat');
    };

    const updateHeartbeat = () => {
      const isActive =
        document.visibilityState === 'visible' && document.hasFocus();

      stopHeartbeat();

      if (!isActive) {
        return;
      }

      // 활성화 직후 즉시 한 번 전송
      sendHeartbeat();

      heartbeatTimer = setInterval(() => {
        sendHeartbeat();
      }, 5000);
    };

    const handleConnect = () => {
      updateHeartbeat();
    };

    socket.on('connect', handleConnect);

    document.addEventListener('visibilitychange', updateHeartbeat);

    window.addEventListener('focus', updateHeartbeat);
    window.addEventListener('blur', updateHeartbeat);

    if (!socket.connected) {
      socket.connect();
    } else {
      updateHeartbeat();
    }

    return () => {
      stopHeartbeat();

      socket.off('connect', handleConnect);

      document.removeEventListener('visibilitychange', updateHeartbeat);

      window.removeEventListener('focus', updateHeartbeat);
      window.removeEventListener('blur', updateHeartbeat);
    };
  }, []);

  return (
    <div className={isChatRoom ? 'min-h-screen' : 'min-h-screen pb-16'}>
      {children}

      {!isChatRoom && <BottomNavigation />}
    </div>
  );
}
