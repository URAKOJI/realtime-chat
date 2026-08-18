'use client';

import { SubmitEvent, useEffect, useState, useRef } from 'react';
import { socket } from '@/lib/socket';
import { apiFetch } from '@/lib/api';

interface Props {
  chatRoomUid: string;
}

interface User {
  uid: string;
  nickname: string;
}

interface ChatRoomInfo {
  uid: string;
  friend: {
    uid: string;
    nickname: string;
    friendCode: string;
  } | null;
  createdAt: string;
}

interface Message {
  _id: string;
  chatRoomUid: string;
  senderUid: string;
  content: string;
  createdAt: string;
}

interface MessagesResponse {
  messages: Message[];
  nextCursor: string | null;
}

interface SendMessageResponse {
  success: boolean;
  message?: Message | string;
}

export default function ChatRoom({ chatRoomUid }: Props) {
  const [roomInfo, setRoomInfo] = useState<ChatRoomInfo | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  const [content, setContent] = useState('');

  const [connected, setConnected] = useState(false);
  const [joined, setJoined] = useState(false);
  const [sending, setSending] = useState(false);

  // 메시지 입력후 엔터를 눌렀을 때 input에 포커스가 유지되도록 하기 위해 ref 사용
  const inputRef = useRef<HTMLInputElement>(null);
  // 메시지 영역의 스크롤을 맨 아래로 유지하기 위해 ref 사용
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // 메시지 영역의 스크롤 위치를 추적하기 위해 ref 사용
  const initialScrollDoneRef = useRef(false);
  // 메시지 영역의 스크롤 위치를 추적하기 위해 ref 사용
  const messagesContainerRef = useRef<HTMLElement>(null);
  const isNearBottomRef = useRef(true);
  // 이전 메시지 조회 중인지 추적하기 위해 ref 사용
  const loadingPreviousRef = useRef(false);

  /**
   * 로그인 사용자 조회
   */
  useEffect(() => {
    const fetchMe = async () => {
      try {
        const response = await apiFetch('/users/me');

        if (!response.ok) {
          throw new Error('사용자 정보 조회에 실패했습니다.');
        }

        const data = (await response.json()) as User;

        setCurrentUser(data);
      } catch (error) {
        console.error(error);
      }
    };

    void fetchMe();
  }, []);

  useEffect(() => {
    const fetchRoom = async () => {
      try {
        const response = await apiFetch(`/chat-rooms/${chatRoomUid}`);

        if (!response.ok) {
          throw new Error('채팅방 정보 조회에 실패했습니다.');
        }

        const data = (await response.json()) as ChatRoomInfo;

        setRoomInfo(data);
      } catch (error) {
        console.error(error);
      }
    };

    void fetchRoom();
  }, [chatRoomUid]);

  useEffect(() => {
    if (messages.length === 0 || initialScrollDoneRef.current) {
      return;
    }

    messagesEndRef.current?.scrollIntoView({
      behavior: 'auto',
    });

    initialScrollDoneRef.current = true;
  }, [messages]);

  /**
   * 이전 메시지 조회
   */
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const response = await apiFetch(`/chat-rooms/${chatRoomUid}/messages`);

        if (!response.ok) {
          throw new Error('이전 메시지 조회에 실패했습니다.');
        }

        const data = (await response.json()) as MessagesResponse;

        /**
         * API가 createdAt DESC로 반환한다면
         * 화면에서는 오래된 → 최신 순으로 보여주기 위해 reverse
         */
        setMessages([...data.messages].reverse());
        setNextCursor(data.nextCursor);
      } catch (error) {
        console.error(error);
      }
    };

    void fetchMessages();
  }, [chatRoomUid]);

  const fetchPreviousMessages = async () => {
    if (!nextCursor || loadingPreviousRef.current) {
      return;
    }

    const container = messagesContainerRef.current;

    if (!container) {
      return;
    }

    loadingPreviousRef.current = true;

    /**
     * 이전 메시지를 추가하기 전의
     * 전체 스크롤 높이를 저장
     */
    const previousScrollHeight = container.scrollHeight;

    try {
      const response = await apiFetch(
        `/chat-rooms/${chatRoomUid}/messages?limit=30&cursor=${encodeURIComponent(
          nextCursor,
        )}`,
      );

      if (!response.ok) {
        throw new Error('이전 메시지 조회에 실패했습니다.');
      }

      const data = (await response.json()) as MessagesResponse;

      const olderMessages = [...data.messages].reverse();

      setMessages((prev) => [...olderMessages, ...prev]);

      setNextCursor(data.nextCursor);

      /**
       * React가 이전 메시지를 화면에 렌더링한 뒤
       * 기존 위치를 유지하도록 보정
       */
      requestAnimationFrame(() => {
        const newScrollHeight = container.scrollHeight;

        container.scrollTop = newScrollHeight - previousScrollHeight;
      });
    } catch (error) {
      console.error(error);
    } finally {
      loadingPreviousRef.current = false;
    }
  };

  /**
   * Socket 연결 + 채팅방 입장
   */
  useEffect(() => {
    const handleConnect = () => {
      setConnected(true);

      socket.emit(
        'chat:join',
        {
          chatRoomUid,
        },
        (response: {
          success: boolean;
          chatRoomUid?: string;
          message?: string;
        }) => {
          if (!response.success) {
            console.error(response.message ?? '채팅방 입장에 실패했습니다.');

            setJoined(false);
            return;
          }

          setJoined(true);
        },
      );
    };

    const handleDisconnect = () => {
      setConnected(false);
      setJoined(false);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    /**
     * 이미 연결되어 있는 경우에도
     * room join이 필요할 수 있음
     */
    if (socket.connected) {
      handleConnect();
    } else {
      socket.connect();
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);

      socket.disconnect();
    };
  }, [chatRoomUid]);

  /**
   * 새로운 메시지 실시간 수신
   */
  useEffect(() => {
    const scrollToBottom = (behavior: ScrollBehavior = 'auto') => {
      messagesEndRef.current?.scrollIntoView({
        behavior,
      });
    };

    const handleNewMessage = (message: Message) => {
      if (message.chatRoomUid !== chatRoomUid) {
        return;
      }

      const isMine = message.senderUid === currentUser?.uid;
      const shouldScroll = isMine || isNearBottomRef.current;

      setMessages((prev) => [...prev, message]);

      if (shouldScroll) {
        requestAnimationFrame(() => {
          scrollToBottom('smooth');
        });
      }
    };

    socket.on('message:new', handleNewMessage);

    return () => {
      socket.off('message:new', handleNewMessage);
    };
  }, [chatRoomUid, , currentUser?.uid]);

  /**
   * 메시지 전송
   */
  const handleSendMessage = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedContent = content.trim();

    if (!trimmedContent || !connected || !joined || sending) {
      return;
    }

    setSending(true);

    setSendError(null);

    socket.emit(
      'message:send',
      {
        chatRoomUid,
        content: trimmedContent,
      },
      (response: SendMessageResponse) => {
        setSending(false);

        if (!response.success) {
          setSendError(
            typeof response.message === 'string'
              ? response.message
              : '메시지 전송에 실패했습니다.',
          );

          inputRef.current?.focus();
          return;
        }

        setContent('');
        inputRef.current?.focus();
      },
    );
  };

  return (
    <main className="mx-auto flex h-screen max-w-2xl flex-col border-x">
      <header className="border-b p-4">
        <h1 className="font-bold">{roomInfo?.friend?.nickname ?? '채팅방'}</h1>

        {roomInfo?.friend && (
          <div className="mt-1 text-xs text-gray-500">
            {roomInfo.friend.friendCode}
          </div>
        )}

        <div className="mt-1 text-xs text-gray-400">
          {connected
            ? joined
              ? '채팅방 연결됨'
              : '채팅방 입장 중'
            : '서버 연결 중'}
        </div>
      </header>

      <section
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4"
        onScroll={() => {
          const container = messagesContainerRef.current;

          if (!container) {
            return;
          }

          const distanceFromBottom =
            container.scrollHeight -
            container.scrollTop -
            container.clientHeight;

          isNearBottomRef.current = distanceFromBottom < 100;

          if (
            container.scrollTop < 50 &&
            nextCursor &&
            !loadingPreviousRef.current
          ) {
            void fetchPreviousMessages();
          }
        }}
      >
        {messages.length === 0 ? (
          <p className="text-center text-sm text-gray-500">
            아직 메시지가 없습니다.
          </p>
        ) : (
          <div className="space-y-2">
            {messages.map((message) => {
              const isMine = message.senderUid === currentUser?.uid;

              return (
                <div
                  key={message._id}
                  className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[75%] rounded-xl px-4 py-2 ${
                      isMine
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <div className="whitespace-pre-wrap break-words">
                      {message.content}
                    </div>

                    <div
                      className={`mt-1 text-xs ${
                        isMine ? 'text-blue-100' : 'text-gray-400'
                      }`}
                    >
                      {new Date(message.createdAt).toLocaleTimeString('ko-KR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </section>

      <form onSubmit={handleSendMessage} className="border-t p-4">
        <div className="flex gap-2">
          {sendError && (
            <p className="mb-2 text-sm text-red-500">{sendError}</p>
          )}
          <input
            ref={inputRef}
            type="text"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            disabled={!joined}
            maxLength={2000}
            placeholder={joined ? '메시지를 입력하세요.' : '채팅방 연결 중...'}
            className="flex-1 rounded-lg border px-3 py-2 disabled:bg-gray-100"
          />

          <button
            type="submit"
            disabled={!joined || !content.trim() || sending}
            className="rounded-lg bg-blue-500 px-4 py-2 text-white disabled:bg-gray-300"
          >
            전송
          </button>
        </div>
      </form>
    </main>
  );
}
