import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Repeat, X } from 'lucide-react';
import type { Book } from '@/types/book';
import { relayError, useRelayStore } from '@/store/relayStore';
import { useAuthGate } from '@/store/loginGate';
import { GuestScreen } from '@/components/auth/LoginPrompt';
import { BookPicker } from '@/components/common/BookPicker';
import { Page } from '@/components/layout/Page';
import { Button, IconButton, SegmentedControl, TextField, useToast } from '@/components/ui';
import { paths } from '@/routes/paths';
import editor from '@/pages/clubs/ClubNewPage.module.scss';
import styles from './Relay.module.scss';

type Rounds = '1' | '2' | '3';
type Hours = '12' | '24' | '72';

function RelayNewInner() {
  const navigate = useNavigate();
  const create = useRelayStore((s) => s.create);
  const showToast = useToast((s) => s.show);
  const [book, setBook] = useState<Book | null>(null);
  const [title, setTitle] = useState('');
  const [rounds, setRounds] = useState<Rounds>('2');
  const [hours, setHours] = useState<Hours>('24');
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  const finalTitle = title.trim() || (book ? `『${book.title}』 릴레이`.slice(0, 40) : '');
  const bookError = submitted && !book ? '함께 이야기할 책을 골라 주세요.' : undefined;

  const submit = async () => {
    setSubmitted(true);
    if (!book || saving) return;
    setSaving(true);
    setError(undefined);
    try {
      const id = await create({ book, title: finalTitle, rounds: Number(rounds), turnHours: Number(hours) });
      showToast('릴레이를 만들었어요. 친구를 초대해 보세요');
      navigate(paths.relay(id), { replace: true });
    } catch (e) {
      setError(relayError(e));
      setSaving(false);
    }
  };

  return (
    <form
      className={editor.shell}
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <header className={editor.bar}>
        <IconButton label="닫기" onClick={() => navigate(-1)}>
          <X />
        </IconButton>
        <h1 className={editor.title}>릴레이 만들기</h1>
        <Button type="submit" size="sm" loading={saving}>
          만들기
        </Button>
      </header>

      <div className={editor.body}>
        <div>
          <BookPicker label="함께 이야기할 책" value={book} onChange={setBook} />
          {bookError && <p className={editor.error}>{bookError}</p>}
        </div>
        <TextField
          label="릴레이 이름"
          optional
          maxLength={40}
          placeholder={book ? `『${book.title}』 릴레이` : '예: 『작별하지 않는다』 릴레이'}
          hint="비워 두면 책 제목으로 정해져요."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <SegmentedControl
          label="몇 바퀴 돌까요?"
          value={rounds}
          onChange={setRounds}
          options={[
            { value: '1', label: '1바퀴' },
            { value: '2', label: '2바퀴' },
            { value: '3', label: '3바퀴' },
          ]}
        />
        <SegmentedControl
          label="한 사람당 시간"
          value={hours}
          onChange={setHours}
          options={[
            { value: '12', label: '12시간' },
            { value: '24', label: '하루' },
            { value: '72', label: '3일' },
          ]}
        />
        <ol className={styles.rules}>
          <li>만들면 초대 코드와 링크가 생겨요. 친구에게 보내 주세요(최대 8명).</li>
          <li>2명 이상 모이면 방장이 시작해요. 들어온 순서대로 차례가 돌아요.</li>
          <li>시작한 뒤에도 친구를 초대할 수 있어요. 늦게 온 친구는 맨 뒤 차례예요.</li>
          <li>내 차례에는 생각을 쓰고, 다음 사람에게 질문 하나로 바통을 넘겨요.</li>
          <li>정한 바퀴 수만큼 돌면 완주! 응답이 없는 차례는 방장이 넘길 수 있어요.</li>
        </ol>
        {error && <p className={editor.error}>{error}</p>}
      </div>
    </form>
  );
}

export function RelayNewPage() {
  const gate = useAuthGate();
  if (gate === 'loading') return null;
  if (gate === 'guest')
    return (
      <Page narrow>
        <GuestScreen icon={<Repeat aria-hidden />} title="릴레이를 만들려면 로그인해 주세요" description="친구를 초대해 한 권의 책을 두고 차례대로 이야기해요." />
      </Page>
    );
  return <RelayNewInner />;
}
