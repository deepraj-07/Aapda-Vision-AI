import { useMemo, useState } from "react";

const UPI_ID = "9119985914@naviaxis";

export default function PaymentModal({ isOpen, onClose, source = "Relief Support" }) {
  const [activeMode, setActiveMode] = useState("qr");
  const [name, setName] = useState("");
  const [paid, setPaid] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const upiLink = useMemo(() => {
    const params = new URLSearchParams({
      pa: UPI_ID,
      pn: "AapdaVision Relief",
      cu: "INR",
      tn: `${source} contribution`,
    });
    return `upi://pay?${params.toString()}`;
  }, [source]);

  if (!isOpen) {
    return null;
  }

  function handleConfirm() {
    if (!name.trim() || !paid) {
      setSubmitted(true);
      return;
    }

    setSubmitted(false);
    setName("");
    setPaid(false);
    setActiveMode("qr");
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-[#010813cc] px-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-3xl border border-cyanline/30 bg-[#071c33] p-5 shadow-[0_26px_90px_rgba(0,0,0,0.45)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-cyanline/80">Contribution Checkout</p>
            <h3 className="mt-1 font-display text-3xl text-white">Support Relief</h3>
            <p className="mt-1 text-sm text-white/70">Source: {source}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/15 px-3 py-1.5 text-sm text-white/80 hover:border-cyanline/40 hover:text-cyanline"
          >
            Close
          </button>
        </div>

        <div className="mt-4 flex gap-2 rounded-2xl border border-white/10 bg-[#081f39] p-1.5">
          <button
            type="button"
            onClick={() => setActiveMode("qr")}
            className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition ${
              activeMode === "qr" ? "bg-cyanline/20 text-cyanline" : "text-white/75 hover:text-white"
            }`}
          >
            QR Payment
          </button>
          <button
            type="button"
            onClick={() => setActiveMode("upi")}
            className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition ${
              activeMode === "upi" ? "bg-cyanline/20 text-cyanline" : "text-white/75 hover:text-white"
            }`}
          >
            UPI ID Payment
          </button>
        </div>

        {activeMode === "qr" ? (
          <div className="mt-4 rounded-2xl border border-cyanline/20 bg-white/5 p-4">
            <p className="text-sm text-white/80">Scan and pay to this UPI:</p>
            <p className="mt-1 text-sm font-semibold text-cyanline">{UPI_ID}</p>
            <img
              src="/team/qr.jpeg"
              alt="UPI QR"
              className="mx-auto mt-4 h-52 w-52 rounded-2xl border border-white/20 object-cover"
            />
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-cyanline/20 bg-white/5 p-4">
            <p className="text-sm text-white/80">Pay directly via UPI ID:</p>
            <div className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-white/15 bg-[#08233f] px-3 py-2">
              <span className="font-semibold text-cyanline">{UPI_ID}</span>
              <button
                type="button"
                onClick={() => navigator.clipboard?.writeText(UPI_ID)}
                className="rounded-lg border border-cyanline/40 px-2 py-1 text-xs font-semibold text-cyanline"
              >
                Copy
              </button>
            </div>
            <a
              href={upiLink}
              className="mt-3 inline-flex rounded-xl border border-cyanline/40 bg-cyanline/10 px-3 py-2 text-sm font-semibold text-cyanline hover:bg-cyanline/20"
            >
              Pay via UPI App
            </a>
          </div>
        )}

        <div className="mt-4 rounded-2xl border border-white/10 bg-[#081f39] p-4">
          <label className="text-sm text-white/80">Your Name</label>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Enter your name"
            className="mt-2 w-full rounded-xl border border-white/15 bg-[#08233f] px-3 py-2 text-sm text-white placeholder:text-white/45"
          />

          <label className="mt-3 inline-flex items-center gap-2 text-sm text-white/80">
            <input
              type="checkbox"
              checked={paid}
              onChange={(event) => setPaid(event.target.checked)}
              className="h-4 w-4 rounded border border-cyanline/40 bg-transparent"
            />
            I have completed payment
          </label>

          {submitted && (
            <p className="mt-2 text-xs text-orange-300">Please enter name and confirm that payment is completed.</p>
          )}
        </div>

        <button
          type="button"
          onClick={handleConfirm}
          className="mt-4 w-full rounded-2xl bg-gradient-to-r from-[#2adcae] to-[#18d2e6] py-3 font-semibold text-[#05243a]"
        >
          Confirm Paid
        </button>
      </div>
    </div>
  );
}
