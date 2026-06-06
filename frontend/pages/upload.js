import { useState } from "react";

const API_URL = "http://127.0.0.1:5000/analyze/upload";

export default function UploadPage() {
	const [file, setFile] = useState(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [result, setResult] = useState(null);

	const handleUpload = async () => {
		if (!file) {
			setError("Please select an image before uploading.");
			return;
		}

		setLoading(true);
		setError("");
		setResult(null);

		try {
			const formData = new FormData();
			formData.append("image", file);

			const response = await fetch(API_URL, {
				method: "POST",
				body: formData,
			});

			const data = await response.json();
			if (!response.ok) {
				throw new Error(data.error || "Upload failed. Please try again.");
			}

			setResult(data);
		} catch (err) {
			setError(err.message || "Something went wrong while uploading.");
		} finally {
			setLoading(false);
		}
	};

	return (
		<main className="min-h-screen bg-aurora px-4 py-12 text-white md:px-8">
			<div className="mx-auto max-w-4xl space-y-6">
				<header className="rounded-3xl border border-cyanline/20 bg-panel p-6 shadow-glow">
					<p className="text-xs uppercase tracking-[0.28em] text-cyanline/80">AapdaVision AI</p>
					<h1 className="mt-2 font-display text-4xl md:text-5xl">Disaster Image Upload</h1>
					<p className="mt-3 text-white/70">Upload a satellite or drone image to get an instant analysis response.</p>
				</header>

				<section className="rounded-3xl border border-cyanline/20 bg-panel p-6 shadow-glow">
					<div className="space-y-4">
						<input
							type="file"
							accept="image/*"
							onChange={(e) => setFile(e.target.files?.[0] || null)}
							className="w-full rounded-2xl border border-white/15 bg-[#08233f] px-4 py-3 text-white file:mr-4 file:rounded-xl file:border-0 file:bg-cyanline/20 file:px-4 file:py-2 file:text-cyanline"
						/>
						<button
							onClick={handleUpload}
							disabled={loading}
							className="rounded-2xl bg-gradient-to-r from-[#2adcae] to-[#18d2e6] px-6 py-3 font-semibold text-[#05253a] shadow-glow disabled:cursor-not-allowed disabled:opacity-60"
						>
							{loading ? "Uploading and analyzing..." : "Upload and Analyze"}
						</button>
					</div>

					{error && <p className="mt-4 rounded-xl border border-red-300/30 bg-red-400/10 px-4 py-3 text-red-200">{error}</p>}
				</section>

				{result?.analysis && (
					<section className="rounded-3xl border border-cyanline/20 bg-panel p-6 shadow-glow">
						<h2 className="font-display text-3xl">Analysis Result</h2>
						<p className="mt-1 text-sm text-white/65">Filename: {result.filename}</p>

						<div className="mt-5 grid gap-4 sm:grid-cols-2">
							<div className="rounded-2xl border border-white/10 bg-[#061d34] p-4">
								<p className="text-sm text-white/60">Buildings detected</p>
								<p className="mt-1 text-3xl font-semibold text-cyanline">{result.analysis.buildings_detected}</p>
							</div>

							<div className="rounded-2xl border border-white/10 bg-[#061d34] p-4">
								<p className="text-sm text-white/60">Damaged buildings</p>
								<p className="mt-1 text-3xl font-semibold text-orange-300">{result.analysis.damaged_buildings}</p>
							</div>

							<div className="rounded-2xl border border-white/10 bg-[#061d34] p-4">
								<p className="text-sm text-white/60">Damage %</p>
								<p className="mt-1 text-3xl font-semibold text-white">{result.analysis.damage_percent}%</p>
							</div>

							<div className="rounded-2xl border border-white/10 bg-[#061d34] p-4">
								<p className="text-sm text-white/60">Risk level</p>
								<p className="mt-1 text-3xl font-semibold text-mintline">{result.analysis.risk_level}</p>
							</div>
						</div>
					</section>
				)}
			</div>
		</main>
	);
}
