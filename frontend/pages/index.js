import { useState } from "react";

import AnalyticsCards from "../components/AnalyticsCards";
import CampaignGrid from "../components/CampaignGrid";
import Footer from "../components/Footer";
import HeroSection from "../components/HeroSection";
import Navbar from "../components/Navbar";
import PaymentModal from "../components/PaymentModal";
import RiskGrid from "../components/RiskGrid";
import UploadAnalyzer from "../components/UploadAnalyzer";

export default function HomePage() {
  const [analysis, setAnalysis] = useState(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentSource, setPaymentSource] = useState("Relief Support");

  function openPayment(source) {
    setPaymentSource(source || "Relief Support");
    setPaymentOpen(true);
  }

  return (
    <main className="min-h-screen bg-aurora pb-14 text-white">
      <Navbar onOpenPayment={openPayment} />
      <HeroSection />

      <div className="mx-auto mt-12 flex w-full max-w-7xl flex-col gap-8 px-4 md:px-8">
        <UploadAnalyzer onAnalyzed={setAnalysis} />
        <AnalyticsCards analysis={analysis} />
        <CampaignGrid onOpenPayment={openPayment} />
        <RiskGrid />
      </div>

      <Footer />
      <PaymentModal isOpen={paymentOpen} onClose={() => setPaymentOpen(false)} source={paymentSource} />
    </main>
  );
}
