const FAQS = [
  {
    q: "Do I have to give you my ChatGPT login?",
    a: "No. You sign in on the real chatgpt.com, claude.ai or grok.com in your own browser. The proof is generated on your own device, and your password and session never leave it.",
  },
  {
    q: "What do you actually store?",
    a: "Your wallet address, which service you verified, which plan tier it was, the amount paid, and an anonymous hash of your subscription. Nothing else.",
  },
  {
    q: "Does my email reach your server?",
    a: "Briefly, yes — and we would rather be straight about it. The ChatGPT proof identifies your account by email address. It arrives inside the proof, is immediately turned into an irreversible hash, and the address itself is never written to our database or our logs. It is what stops one subscription claiming twice. We cannot read it back, but it does pass through our server, so this is not zero-knowledge from our side.",
  },
  {
    q: "Can I claim from several wallets?",
    a: "No. Each subscription produces one anonymous identifier, and that identifier can only ever be used once. A second wallet proving the same subscription is rejected.",
  },
  {
    q: "How do I get paid?",
    a: "In USDC on Base, sent from our treasury directly to your wallet. You pay no gas and sign nothing.",
  },
  {
    q: "How often can I claim?",
    a: "Once per subscription per service, then again after the cooldown period once your next billing cycle has been paid.",
  },
];

export function Faq() {
  return (
    <section id="faq" className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
      <h2 className="text-[22px] font-semibold tracking-tight">Questions</h2>
      <dl className="mt-6 max-w-3xl divide-y divide-line border-t border-line">
        {FAQS.map((item) => (
          <div key={item.q} className="py-5">
            <dt className="text-[15px] font-medium">{item.q}</dt>
            <dd className="mt-1.5 text-sm leading-relaxed text-muted">{item.a}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
