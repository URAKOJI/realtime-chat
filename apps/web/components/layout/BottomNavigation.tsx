'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const menus = [
  {
    label: '친구',
    href: '/friends',
  },
  {
    label: '채팅',
    href: '/chats',
  },
  {
    label: '내 정보',
    href: '/me',
  },
];

export default function BottomNavigation() {
  const pathname = usePathname();

  return (
    <nav className="fixed right-0 bottom-0 left-0 z-50 border-t border-gray-200 bg-white">
      <div className="mx-auto flex h-16 max-w-2xl">
        {menus.map((menu) => {
          const isActive = pathname === menu.href;

          return (
            <Link
              key={menu.href}
              href={menu.href}
              className={`flex flex-1 items-center justify-center text-sm font-medium ${
                isActive ? 'text-blue-500' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              {menu.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
