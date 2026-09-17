import Link from "next/link";
import { Button } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center gap-4 py-20 text-center">
      <p className="font-mono text-sm font-medium text-ink-subtle">404</p>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">We could not find that page</h1>
      <p className="max-w-md text-sm text-ink-muted text-balance-pretty">
        The link may be out of date, or the kit it pointed at may have been deleted.
      </p>
      <div className="mt-2 flex gap-2">
        <Link href="/dashboard">
          <Button>My kits</Button>
        </Link>
        <Link href="/new">
          <Button variant="secondary">Create a kit</Button>
        </Link>
      </div>
    </div>
  );
}
