import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) redirect("/editor");

  return (
    <main className="landing">
      <header className="landing-nav">
        <div className="landing-brand">
          <Image src="/logo.png" alt="Vortexly" width={28} height={28} className="landing-brand-logo" />
          <span className="landing-brand-name">Vortexly</span>
        </div>
        <Link href="/login" className="landing-nav-signin">Sign in</Link>
      </header>

      <section className="landing-hero">
        <div className="landing-hero-text">
          <p className="landing-eyebrow">Pin Editor</p>
          <h1 className="landing-h1">
            Create stunning<br />
            comparison<br />
            <em>pins for Pinterest.</em>
          </h1>
          <p className="landing-lead">
            Professional 1000&thinsp;&times;&thinsp;1500px pin layouts — side-by-side comparisons,
            single spotlights, and a freeform canvas. Export PNG or JPEG in seconds.
          </p>
          <div className="landing-cta-row">
            <Link href="/editor" className="landing-cta-primary">Open Editor →</Link>
            <Link href="/login" className="landing-cta-ghost">Sign in to save &amp; Drive sync</Link>
          </div>
        </div>
        <div className="landing-hero-canvas">
          <Image
            src="/demo-pin.png"
            alt="Sample comparison pin made with Vortexly"
            fill
            sizes="(max-width: 768px) 90vw, 44vw"
            className="landing-demo-img"
            priority
          />
        </div>
      </section>

      <section className="landing-features">
        <div className="lf-card">
          <div className="lf-icon">⧖</div>
          <h3>Side-by-Side Comparisons</h3>
          <p>Two-item layouts with connector arrows, labels, and auto-sizing — compare anything.</p>
        </div>
        <div className="lf-card">
          <div className="lf-icon">◈</div>
          <h3>Freeform Canvas</h3>
          <p>Drag, resize, and layer images and text anywhere on the 1000&thinsp;&times;&thinsp;1500 canvas.</p>
        </div>
        <div className="lf-card">
          <div className="lf-icon">↑</div>
          <h3>Hi-Res Export</h3>
          <p>Download as 1×/2× PNG or JPEG. Optionally sync straight to Google Drive.</p>
        </div>
      </section>

      <footer className="landing-footer">
        <span>© {new Date().getFullYear()} Vortexly</span>
        <Link href="/editor">Open Editor</Link>
        <Link href="/login">Sign in</Link>
      </footer>
    </main>
  );
}
