'use client';
import { useRef } from 'react';
import { io, type Socket } from 'socket.io-client';

let socketInstance: Socket | null = null;

export function useSocket(): Socket {
  const ref = useRef<Socket | null>(null);
  if (!socketInstance) {
    socketInstance = io(process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001', {
      autoConnect: true,
      reconnectionAttempts: 5,
    });
  }
  ref.current = socketInstance;
  return ref.current;
}
