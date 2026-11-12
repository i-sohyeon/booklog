import styles from './SourceCredit.module.scss';

/** 도서 정보 출처 표기 (카카오 책 검색) */
export function SourceCredit({ href = 'https://search.daum.net/search?w=book', label = '도서 정보 제공: 카카오(Daum 책)' }: { href?: string; label?: string }) {
  return (
    <p className={styles.credit}>
      <a href={href} target="_blank" rel="noopener noreferrer">
        {label}
      </a>
    </p>
  );
}
