import styles from './AladinCredit.module.scss';

/** 알라딘 Open API 이용 조건: 출처 표기 */
export function AladinCredit({ href = 'https://www.aladin.co.kr', label = '도서 DB 제공: 알라딘 인터넷서점' }: { href?: string; label?: string }) {
  return (
    <p className={styles.credit}>
      <a href={href} target="_blank" rel="noopener noreferrer">
        {label}
      </a>
    </p>
  );
}
