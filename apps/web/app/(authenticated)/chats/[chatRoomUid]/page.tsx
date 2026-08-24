import ChatRoom from '@/components/chat/ChatRoom';

interface Props {
  params: Promise<{
    chatRoomUid: string;
  }>;
}

export default async function ChatRoomPage({ params }: Props) {
  const { chatRoomUid } = await params;

  return <ChatRoom chatRoomUid={chatRoomUid} />;
}
