import { Navigation }       from "@/components/Navigation";
import { Overview }          from "@/components/Overview";
import { AttackAnalysis }    from "@/components/AttackAnalysis";
import { FakerVSMarkov }     from "@/components/FakerVSMarkov";
import { AttackerProfiles }  from "@/components/AttackerProfiles";
import { AnomalyDetection }  from "@/components/AnomalyDetection";
import { MarkovGraph }       from "@/components/MarkovGraph";
import { Footer }            from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Navigation />
      <main>
        <Overview />
        <AttackAnalysis />
        <FakerVSMarkov />
        <AttackerProfiles />
        <AnomalyDetection />
        <MarkovGraph />
      </main>
      <Footer />
    </>
  );
}
