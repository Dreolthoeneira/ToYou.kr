import { SITE_BRAND, SITE_DOMAIN, SITE_MARK } from '../../siteBrand'

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-top">
        <div className="brand-lockup">
          <div className="brand-mark">{SITE_MARK}</div>
          <div>
            <p className="brand-name">{SITE_BRAND}</p>
            <p className="brand-sub">{SITE_DOMAIN}</p>
          </div>
        </div>
        <div className="footer-links">
          <div>
            <strong>Service</strong>
            <a href="#services">Proxy Shopping</a>
            <a href="#services">Forwarding</a>
            <a href="#services">Business</a>
          </div>
          <div>
            <strong>Support</strong>
            <a href="#">Help Center</a>
            <a href="#">Shipping Rates</a>
            <a href="#">Track Order</a>
          </div>
          <div>
            <strong>Company</strong>
            <a href="#">About Us</a>
            <a href="#">Partners</a>
            <a href="#">Contact</a>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <p>© 2024 {SITE_BRAND}. All rights reserved. {SITE_DOMAIN}</p>
        <div className="social-links">
          <span>Instagram</span>
          <span>Twitter</span>
          <span>LinkedIn</span>
        </div>
      </div>
    </footer>
  )
}
