import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = { title: "Hệ thống rạp - Beta Cinemas" };

export default async function CinemasPage() {
  const cinemas = await prisma.cinema.findMany({
    where: { isActive: true },
    orderBy: [{ region: "asc" }, { name: "asc" }],
    include: { _count: { select: { rooms: { where: { isActive: true } } } } },
  });

  const byRegion = new Map();
  for (const c of cinemas) {
    if (!byRegion.has(c.region)) byRegion.set(c.region, []);
    byRegion.get(c.region).push(c);
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Hệ thống rạp</h1>

      {cinemas.length === 0 && <p className="text-neutral-400">Chưa có rạp nào.</p>}

      {[...byRegion.entries()].map(([region, list]) => (
        <section key={region} className="mb-8">
          <h2 className="mb-3 border-l-4 border-red-600 pl-3 text-xl font-bold">{region}</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {list.map((c) => (
              <Link
                key={c.id}
                href={`/cinemas/${c.id}`}
                className="rounded-lg border border-neutral-800 p-4 hover:border-red-500"
              >
                <h3 className="font-semibold">{c.name}</h3>
                <p className="text-sm text-neutral-400">{c.address}</p>
                <p className="mt-2 text-xs text-neutral-500">
                  {c.phone ? `Điện thoại: ${c.phone}. ` : ""}
                  {c._count.rooms} phòng chiếu
                </p>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}