import Link from "next/link";
import { ArrowUpRight, Headphones } from "lucide-react";

import { StorefrontHeader } from "@/components/storefront-header";

function StorefrontFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-main">
        <div className="footer-brand-block">
          <Link className="brand-lockup footer-brand" href="/">
            <span className="brand-mark">M<span>3</span></span>
            <span className="brand-name">M-3 <span>Commerce</span></span>
          </Link>
          <p>Good technology, thoughtfully chosen. Find the right gear for the way you live, work, and play.</p>
        </div>
        <div className="footer-note">
          <span className="footer-kicker">Here when you need us</span>
          <span className="footer-contact"><Headphones aria-hidden="true" size={17} /> Friendly support, every step.</span>
        </div>
        <Link className="footer-link" href="/shop">Explore the collection <ArrowUpRight aria-hidden="true" size={16} /></Link>
      </div>
      <div className="footer-bottom">
        <span>© 2026 M-3 Commerce</span>
        <span>Made for your everyday.</span>
        <span>Engineered by Soe Thet Phyoe</span>
      </div>
    </footer>
  );
}

export function StorefrontShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="storefront">
      <StorefrontHeader />
      {children}
      <StorefrontFooter />
    </div>
  );
}
