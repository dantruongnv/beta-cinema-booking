import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";

export async function GET() {
  const { error: authError } = await requireStaff();
  if (authError) return authError;

  const [cinemas, movies] = await Promise.all([
    prisma.cinema.findMany({
      where: { isActive: true },
      orderBy: [{ region: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
    prisma.movie.findMany({
      orderBy: { title: "asc" },
      select: { id: true, title: true },
    }),
  ]);

  return Response.json({ cinemas, movies });
}
