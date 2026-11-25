import { Suspense } from "react";
import Link from "next/link";
import {
  ArrowDownRight,
  ArrowRight,
  AudioLines,
  ChevronRight,
  CircleCheck,
  Zap,
} from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { StorefrontShell } from "@/components/storefront-shell";
import { cn } from "@/lib/utils";

import HomeCatalog from "./home-catalog";

function DeviceArtwork({ kind, color = "blue" }: { kind: string; color?: string }) {
  return (
    <div className={`device-art device-${kind} device-color-${color}`} aria-hidden="true">
      {kind === "laptop" ? (
        <><div className="device-laptop-screen"><div className="device-screen-glow" /><div className="device-camera" /></div><div className="device-laptop-base" /></>
      ) : kind === "tablet" ? (
        <div className="device-tablet-frame"><div className="device-tablet-screen"><div className="tablet-orbit" /><div className="tablet-sun" /></div><div className="device-tablet-camera" /></div>
      ) : kind === "watch" ? (
        <div className="watch-shape"><div className="watch-strap watch-strap-top" /><div className="watch-face"><span className="watch-time">09<span>:</span>41</span><span className="watch-signal"><i /><i /><i /></span></div><div className="watch-strap watch-strap-bottom" /></div>
      ) : (
        <div className="device-phone-frame"><div className="device-phone-screen"><div className="phone-screen-glow" /><div className="phone-camera-island"><i /><i /><i /></div><div className="phone-screen-date">MONDAY<br /><b>09:41</b></div><span className="phone-screen-weather">24° &nbsp; Sunny</span></div><div className="device-phone-button" /></div>
      )}
    </div>
  );
}

export default function Home() {
  return (
    <StorefrontShell>
      <main>
        <section className="hero-section">
          <div className="hero-grid">
            <div className="hero-copy">
              <span className="eyebrow"><span className="eyebrow-dot" /> YOUR NEXT FAVORITE THING</span>
              <h1 aria-label="Technology that moves with you">Technology<br />that <span>moves</span><br />with you.</h1>
              <p className="hero-description">The little upgrades that make a big difference. Meet your new everyday essentials, thoughtfully picked for the way you live.</p>
              <div className="hero-actions">
                <Link href="/shop" className={cn(buttonVariants(), "hero-button")}>Find your next favorite <ArrowRight aria-hidden="true" size={17} /></Link>
                <a href="#categories" className="text-link">Take a look around <ArrowDownRight aria-hidden="true" size={16} /></a>
              </div>
              <div className="hero-proof"><div className="proof-avatars"><span>M</span><span>3</span><span>+</span></div><p><b>Better tech, better days.</b><br />Picked with a little more care.</p></div>
            </div>
            <div className="hero-art-wrap" aria-label="Illustration of a laptop, smartphone, and smartwatch">
              <div className="hero-art-backdrop"><div className="hero-orbit hero-orbit-one" /><div className="hero-orbit hero-orbit-two" /><span className="hero-art-spark spark-one">✳</span><span className="hero-art-spark spark-two">✦</span><span className="hero-art-spark spark-three">✳</span>
                <div className="hero-device hero-laptop"><DeviceArtwork kind="laptop" color="blue" /></div>
                <div className="hero-device hero-phone"><DeviceArtwork kind="phone" color="violet" /></div>
                <div className="hero-device hero-watch"><DeviceArtwork kind="watch" color="dark" /></div>
                <div className="hero-floating-note"><span className="note-icon"><Zap size={16} fill="currentColor" /></span><span><b>Made for your everyday</b><small>One good choice at a time</small></span></div>
                <div className="hero-product-tag"><span className="tag-pulse" /> THE GOOD STUFF, RIGHT HERE</div>
              </div>
            </div>
            <span className="hero-index">01 — 03</span>
          </div>
          <div className="hero-bottom-line"><span>GOOD TECH, GOOD ENERGY</span><span>SCROLL TO EXPLORE <ChevronRight aria-hidden="true" size={14} /></span></div>
        </section>

        <Suspense fallback={
          <section id="categories" className="category-section section-wrap">
            <p role="status">Loading the catalog…</p>
          </section>
        }>
          <HomeCatalog />
        </Suspense>

        <section className="promise-section section-wrap" id="why-m3">
          <div className="promise-art"><div className="promise-disc"><div className="promise-ring" /><div className="promise-spark">✳</div><span className="promise-orbit-label">THOUGHTFULLY PICKED · ALWAYS</span></div><div className="promise-sticker">A little<br />more <span>care.</span></div></div>
          <div className="promise-copy"><span className="eyebrow section-eyebrow">THE M-3 DIFFERENCE</span><h2>Not just more tech.<br /><span>Better picks.</span></h2><p>There’s a lot of tech out there. We make it easier to find the good stuff: useful, lovely to live with, and ready for whatever’s next.</p><div className="promise-points"><div><span className="promise-check"><CircleCheck aria-hidden="true" size={18} /></span><span><b>Picked with purpose</b><small>Good design meets everyday usefulness.</small></span></div><div><span className="promise-check"><CircleCheck aria-hidden="true" size={18} /></span><span><b>Here for the long run</b><small>Gear that feels right, today and tomorrow.</small></span></div></div><Link href="/shop" className="promise-link">Get to know your next favorite <ArrowRight aria-hidden="true" size={17} /></Link></div>
        </section>

        <section className="closing-cta">
          <div className="closing-cta-inner"><span className="eyebrow cta-eyebrow"><AudioLines aria-hidden="true" size={15} /> READY WHEN YOU ARE</span><h2>Life’s better with<br />good <span>tech.</span></h2><p>Go on. Find your next favorite.</p><Link href="/shop" className={cn(buttonVariants(), "cta-button")}>Explore the shop <ArrowRight aria-hidden="true" size={17} /></Link><span className="cta-spark cta-spark-one">✳</span><span className="cta-spark cta-spark-two">✦</span><span className="cta-orbit" /></div>
        </section>
      </main>
    </StorefrontShell>
  );
}
