import { useState } from 'react';
import { ExternalLink, Play } from 'lucide-react';
import { useVideos, youtubeSearchUrl, youtubeWatchUrl, type Video } from '@/services/videos';
import { formatRelative } from '@/lib/date';
import { Button, Sheet, Skeleton } from '@/components/ui';
import styles from './VideoRail.module.scss';

/**
 * 유튜브 영상 가로 목록. 누르면 앱 안에서 유튜브 플레이어로 재생.
 * 영상을 불러올 수 없으면(키 미설정 등) 유튜브 검색 링크 하나로 대신합니다.
 */
/** 영상 서비스 공개 여부 — false면 API를 부르지 않고, 누르면 '준비 중' 팝업 */
export const VIDEOS_READY = false;

export function VideoRail(props: { query: string; limit?: number; emptyText?: string }) {
  return VIDEOS_READY ? <LiveVideoRail {...props} /> : <ComingSoon query={props.query} />;
}

/** 준비 중: 자리만 보여주고 누르면 안내 팝업 */
function ComingSoon({ query }: { query: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={styles.searchLink} onClick={() => setOpen(true)}>
        <span className={styles.ytBadge} aria-hidden>
          <Play />
        </span>
        <span>
          <strong>‘{query}’ 영상 보기</strong>
          <span>준비 중인 서비스예요</span>
        </span>
        <span className={styles.soon}>준비 중</span>
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="준비 중인 서비스입니다" description="책 이야기 영상은 곧 만나볼 수 있어요. 조금만 기다려 주세요.">
        <Button size="lg" block onClick={() => setOpen(false)}>
          확인
        </Button>
      </Sheet>
    </>
  );
}

function LiveVideoRail({ query, limit = 8, emptyText = '관련 영상을 찾지 못했어요.' }: { query: string; limit?: number; emptyText?: string }) {
  const state = useVideos(query, limit);
  const [playing, setPlaying] = useState<Video | null>(null);

  if (state.status === 'loading')
    return (
      <ul role="list" className={styles.rail} aria-busy="true" aria-label="영상 불러오는 중">
        {Array.from({ length: 3 }, (_, i) => (
          <li key={i} className={styles.item}>
            <Skeleton className={styles.skelThumb} />
            <Skeleton variant="text" width="90%" />
            <Skeleton variant="text" width="50%" />
          </li>
        ))}
      </ul>
    );

  if (state.status === 'unavailable')
    return (
      <a className={styles.searchLink} href={youtubeSearchUrl(query)} target="_blank" rel="noopener noreferrer">
        <span className={styles.ytBadge} aria-hidden>
          <Play />
        </span>
        <span>
          <strong>유튜브에서 ‘{query}’ 찾아보기</strong>
          <span>새 창에서 유튜브 검색 결과가 열려요</span>
        </span>
        <ExternalLink aria-hidden className={styles.ext} />
      </a>
    );

  if (state.items.length === 0) return <p className={styles.muted}>{emptyText}</p>;

  return (
    <>
      <ul role="list" className={styles.rail}>
        {state.items.map((v) => (
          <li key={v.id} className={styles.item}>
            <button type="button" className={styles.card} onClick={() => setPlaying(v)} aria-label={`${v.title} 재생`}>
              <span className={styles.thumb}>
                <img src={v.thumbnail} alt="" loading="lazy" />
                <span className={styles.play} aria-hidden>
                  <Play />
                </span>
              </span>
              <span className={styles.title}>{v.title}</span>
              <span className={styles.meta}>
                {v.channel} · {formatRelative(v.publishedAt)}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <VideoSheet video={playing} onClose={() => setPlaying(null)} />
    </>
  );
}

function VideoSheet({ video, onClose }: { video: Video | null; onClose: () => void }) {
  return (
    <Sheet open={video !== null} onClose={onClose} title={video?.title ?? ''} description={video?.channel}>
      {video && (
        <div className={styles.player}>
          <div className={styles.frame}>
            {/* 개인정보 보호 강화 모드(youtube-nocookie) 공식 플레이어 */}
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(video.id)}?autoplay=1&rel=0&playsinline=1`}
              title={video.title}
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>
          <a className={styles.openYt} href={youtubeWatchUrl(video.id)} target="_blank" rel="noopener noreferrer">
            유튜브에서 보기 <ExternalLink aria-hidden />
          </a>
        </div>
      )}
    </Sheet>
  );
}
