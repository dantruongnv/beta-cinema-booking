import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [cinemas, movies, showtimes] = await Promise.all([
      prisma.cinema.count(),
      prisma.movie.count(),
      prisma.showtime.count(),
    ]);
    return Response.json({ ok: true, cinemas, movies, showtimes });
  } catch (error) {
    console.error(error);
    return Response.json(
      {
        ok: false,
        message: "Không kết nối được database",
        detail: process.env.NODE_ENV !== "production" ? String(error.message) : undefined,
      },
      { status: 500 }
    );
  }
}