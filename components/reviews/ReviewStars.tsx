import styles from "./reviews.module.css";

export default function ReviewStars({ rating }: { rating: number }) {
  return (
    <span className={styles.stars} role="img" aria-label={`${rating.toLocaleString("vi-VN", { maximumFractionDigits: 1 })} trên 5 sao`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <i key={star} aria-hidden="true" className={`fa ${rating >= star ? "fa-star" : rating >= star - 0.5 ? "fa-star-half-o" : "fa-star-o"}`} />
      ))}
    </span>
  );
}
