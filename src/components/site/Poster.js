export default function Poster({ src, alt = "", className = "" }) {
  if (!src) {
    return (
      <div className={`flex items-center justify-center bg-neutral-800 p-2 text-center text-xs text-neutral-400 ${className}`}>
        Chưa có poster
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} loading="lazy" className={`object-cover ${className}`} />;
}