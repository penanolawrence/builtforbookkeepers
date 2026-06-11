// src/components/landing/LandingFooter.tsx
export function LandingFooter() {
  return (
    <footer className="ld-footer">
      <p>
        © {new Date().getFullYear()} Built for Bookkeepers &middot;{' '}
        <a href="#">Privacy Policy</a> &middot;{' '}
        <a href="#">Terms</a>
      </p>
    </footer>
  )
}
