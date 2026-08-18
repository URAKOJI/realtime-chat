import { io, Socket } from 'socket.io-client';

const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

if (!API_URL) {
  throw new Error('NEXT_PUBLIC_API_BASE_URL is not defined');
}

export const socket: Socket = io(API_URL, {
  autoConnect: false,
  withCredentials: true,
});
