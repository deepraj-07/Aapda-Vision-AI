const teamMembers = [
  {
    name: "Deep Raj",
    role: "Project Architect & Frontend Strategist",
    initials: "DR",
    image: "/team/deep.jpeg",
    linkedIn: "https://www.linkedin.com",
    email: "mailto:deep@example.com",
  },
  {
    name: "Ayush Shrivastava",
    role: "Chief ML Engineer",
    initials: "AS",
    image: "/team/ayush.jpeg",
    linkedIn: "https://www.linkedin.com",
    email: "mailto:ayush@example.com",
  },
];

function IconLinkedIn() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
      <path d="M6.94 8.5H3.56V20h3.38V8.5Zm.22-3.55a1.96 1.96 0 1 0-3.92 0 1.96 1.96 0 0 0 3.92 0ZM20.44 13.42c0-3.12-1.67-4.57-3.9-4.57-1.8 0-2.6.99-3.05 1.7V8.5h-3.37c.05 1.36 0 11.5 0 11.5h3.37v-6.42c0-.34.02-.68.13-.93.27-.68.88-1.38 1.9-1.38 1.35 0 1.9 1.04 1.9 2.56V20h3.37v-6.58Z" />
    </svg>
  );
}

function IconMail() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
      <path d="M3 6.75A2.75 2.75 0 0 1 5.75 4h12.5A2.75 2.75 0 0 1 21 6.75v10.5A2.75 2.75 0 0 1 18.25 20H5.75A2.75 2.75 0 0 1 3 17.25V6.75Zm2.2.07 6.52 4.95a.5.5 0 0 0 .56 0l6.52-4.95a1.25 1.25 0 0 0-.55-.07H5.75c-.2 0-.39.02-.56.07Zm13.3 1.35-5.34 4.06a2.5 2.5 0 0 1-3.02 0L4.8 8.17v9.08c0 .41.34.75.75.75h12.5c.41 0 .75-.34.75-.75V8.17Z" />
    </svg>
  );
}

export default function TeamSection() {
  return (
    <section className="space-y-6">
      <div className="text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-cyanline/80">Core Contributors</p>
        <h3 className="font-display text-4xl text-white">Meet The Team</h3>
      </div>

      <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
        {teamMembers.map((member) => (
          <article
            key={member.name}
            className="group relative overflow-hidden rounded-3xl border border-cyanline/20 bg-[linear-gradient(170deg,rgba(8,36,61,0.96),rgba(6,24,45,0.92))] p-6 shadow-[0_20px_40px_rgba(4,14,24,0.45)] transition duration-300 hover:-translate-y-1 hover:border-cyanline/45"
          >
            <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-cyanline/10 blur-2xl" />

            <div className="mx-auto h-32 w-32 overflow-hidden rounded-full border border-cyanline/40 bg-gradient-to-br from-[#0f3b57] via-[#0f4f60] to-[#1c6f6e] shadow-[0_0_0_6px_rgba(41,227,219,0.09)] md:h-36 md:w-36">
              <img
                src={member.image}
                alt={member.name}
                className="h-full w-full object-cover object-center contrast-105 saturate-110 transition duration-300 group-hover:scale-105"
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                  const fallback = event.currentTarget.nextElementSibling;
                  if (fallback) {
                    fallback.classList.remove("hidden");
                  }
                }}
              />
              <div className="hidden h-full w-full place-items-center text-2xl font-bold text-white md:text-3xl grid">
                {member.initials}
              </div>
            </div>

            <h4 className="mt-4 text-center font-display text-2xl text-white">{member.name}</h4>
            <p className="mt-1 text-center text-sm text-cyanline/90">{member.role}</p>

            <div className="mt-4 flex items-center justify-center gap-3 text-white/80">
              <a
                href={member.linkedIn}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-white/15 bg-white/5 p-2 transition hover:border-cyanline/40 hover:text-cyanline"
                aria-label={`${member.name} LinkedIn`}
              >
                <IconLinkedIn />
              </a>
              <a
                href={member.email}
                className="rounded-full border border-white/15 bg-white/5 p-2 transition hover:border-cyanline/40 hover:text-cyanline"
                aria-label={`${member.name} Email`}
              >
                <IconMail />
              </a>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
