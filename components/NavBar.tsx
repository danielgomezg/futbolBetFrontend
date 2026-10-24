import Link from "next/link";

export default function NavBar() {
  return (
    <nav className="border-b border-gray-200">
      <div className="max-w-4xl mx-auto px-8 py-3 flex gap-6 text-sm font-medium">
        <Link href="/" className="hover:text-blue-600">
          Partidos
        </Link>
        <Link href="/dashboard" className="hover:text-blue-600">
          Dashboard
        </Link>
        <Link href="/calibracion" className="hover:text-blue-600">
          Calibracion
        </Link>
      </div>
    </nav>
  );
}
