export default function Footer() {
  return (
    <footer className="mt-16 border-t border-neutral-800 px-4 py-8 text-center text-xs text-neutral-400">
      <p>Website đặt vé xem phim Beta Cinemas là sản phẩm của đồ án môn học, không phải website chính thức của Beta Cinemas.</p>
      <p className="mt-2">
        This product uses the TMDB API but is not endorsed or certified by{" "}
        <a href="https://www.themoviedb.org" target="_blank" rel="noopener noreferrer" className="underline">
          TMDB
        </a>
        .
      </p>
    </footer>
  );
}