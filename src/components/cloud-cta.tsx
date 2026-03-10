export function CloudCta() {
  if (process.env.DISABLE_CLOUD_CTA === "true") return null;

  return (
    <div className="border-t border-zinc-200 px-4 py-3 text-center text-xs text-zinc-400">
      Powered by{" "}
      <span className="font-medium text-zinc-600">Curyloop Community</span>
      {" · "}
      <a
        href="https://curyloop.com?ref=community"
        target="_blank"
        rel="noopener noreferrer"
        className="text-[var(--color-brand)] hover:text-[#0258b8]"
      >
        Upgrade to Cloud
      </a>
    </div>
  );
}
