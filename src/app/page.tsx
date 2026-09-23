import { ClaimHistory } from "@/components/ClaimHistory";
import { Faq } from "@/components/Faq";
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { HowItWorks } from "@/components/HowItWorks";
import { ServiceSection } from "@/components/ServiceSection";
import { StatsBar } from "@/components/StatsBar";

// Treasury balance and claim counts are live, so the page can't be static.
export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <ServiceSection />
        <ClaimHistory />
        <HowItWorks />
        <StatsBar />
        <Faq />
      </main>
      <footer className="border-t border-line py-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 text-[12.5px] text-muted-soft sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>RewardGPT — cashback on the AI tools you already pay for.</p>
          <p>Not affiliated with OpenAI, Anthropic or xAI.</p>
        </div>
      </footer>
    </>
  );
}
