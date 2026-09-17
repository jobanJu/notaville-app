import Link from "next/link";

// Pied de page global (voir app/layout.js) : mentions légales, CGU, et
// un lien vers le site JulLab -- volontairement inactif pour l'instant
// (ce site n'existe pas encore), à activer le jour où il existe.
export default function Footer() {
  return (
    <footer className="mt-auto border-t border-card-edge px-4 py-6 text-xs text-text-soft">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 text-center sm:flex-row sm:justify-between sm:text-left">
        <p>&copy; {new Date().getFullYear()} Notaville — un projet JulLab.</p>
        <nav className="flex items-center gap-4">
          <Link href="/mentions-legales" className="hover:text-text">
            Mentions légales
          </Link>
          <Link href="/cgu" className="hover:text-text">
            CGU
          </Link>
          <span
            title="Le site JulLab n'est pas encore en ligne"
            aria-disabled="true"
            className="cursor-not-allowed text-text-soft/50"
          >
            JulLab (bientôt)
          </span>
        </nav>
      </div>
    </footer>
  );
}
