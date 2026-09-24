import { MessageBubble } from '@squad/web';

// MessageBubble renders on the dark lounge/chat surface in-app, so each cell is
// wrapped in a panel matching that backdrop (its bubble colors are tuned for it).
const Panel = ({ children }: { children: React.ReactNode }) => (
  <div
    style={{
      width: 360,
      padding: 16,
      background: '#0e0a24',
      borderRadius: 16,
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
    }}
  >
    {children}
  </div>
);

export function UserMessage() {
  return (
    <Panel>
      <MessageBubble role="user" content="ช่วยสรุปงานที่ทีมต้องส่งพรุ่งนี้ให้หน่อย" />
    </Panel>
  );
}

export function AssistantReply() {
  return (
    <Panel>
      <MessageBubble
        role="assistant"
        characterName="Yui"
        content="ได้เลยค่ะ! พรุ่งนี้มี 3 งานหลัก — รีวิว PR ที่ค้างอยู่, อัปเดต API docs และเดโมให้ลูกค้าตอนบ่าย 2 โมงนะคะ"
      />
    </Panel>
  );
}

export function Streaming() {
  return (
    <Panel>
      <MessageBubble role="assistant" characterName="Mika" content="กำลังรวบรวมข้อมูลให้อยู่นะ" isStreaming />
    </Panel>
  );
}

export function Conversation() {
  return (
    <Panel>
      <MessageBubble role="user" content="วันนี้ทีมเป็นยังไงบ้าง" />
      <MessageBubble role="assistant" characterName="Senko" content="ทุกคนสปิริตดีมากเลยค่ะ งานเดินตามแผนทุกอย่าง 🦊" />
    </Panel>
  );
}
