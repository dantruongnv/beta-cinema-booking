import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";

export async function GET() {
  const { error: authError } = await requireStaff();
  if (authError) return authError;

  const [cinemas, movies] = await Promise.all([
    prisma.cinema.findMany({
      where: { isActive: true },
      orderBy: [{ region: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        rooms: {
          where: { isActive: true },
          orderBy: { id: "asc" },
          select: { id: true, name: true },
        },
      },
    }),
    prisma.movie.findMany({
      where: { isActive: true, status: { not: "ENDED" } },
      orderBy: { title: "asc" },
      select: { id: true, title: true, durationMin: true },
    }),
  ]);

  return Response.json({ cinemas, movies });
}