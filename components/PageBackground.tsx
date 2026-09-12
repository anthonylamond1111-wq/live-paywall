type PageBackgroundProps = {
  /** Hide the poster during full-screen stream playback. */
  showPoster?: boolean;
};

export default function PageBackground({ showPoster = true }: PageBackgroundProps) {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-black">
      {showPoster && (
        <>
          <div
            className="absolute inset-0 scale-105 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: 'url(/checkout-poster.png)' }}
            aria-hidden
          />
          <div className="absolute inset-0 bg-black/70" aria-hidden />
          <div
            className="absolute inset-0 bg-gradient-to-b from-black/85 via-black/55 to-black/90"
            aria-hidden
          />
        </>
      )}

      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(220,38,38,0.14)_0%,_transparent_55%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_rgba(127,29,29,0.1)_0%,_transparent_50%)]" />
      <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.15)_1px,transparent_0)] bg-[length:3px_3px]" />
    </div>
  );
}
