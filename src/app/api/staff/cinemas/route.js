import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { badRequest } from "@/lib/http";
import { validateCinemaInput } from "@/lib/validators";

export async function GET(request) {
  const { error: authError } = await requireStaff();
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();
  const region = (searchParams.get("region") ?? "").trim();
  const status = searchParams.get("status");

  const where = {};
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { address: { contains: q, mode: "insensitive" } },
    ];
  }
  if (region) where.region = region;
  if (status === "active") where.isActive = true;
  if (status === "inactive") where.isActive = false;

  const [cinemas, regionRows] = await Promise.all([
    prisma.cinema.findMany({
      where,
      orderBy: [{ region: "asc" }, { name: "asc" }],
      include: { _count: { select: { rooms: true } } },
    }),
    prisma.cinema.findMany({
      distinct: ["region"],
      select: { region: true },
      orderBy: { region: "asc" },
    }),
  ]);

  return Response.json({ cinemas, regions: regionRows.map((r) => r.region) });
}

export async function POST(request) {
  const { error: authError } = await requireStaff();
  if (authError) return authError;

  let body;
  try {
    body = await request.json();
  } catch {
    return badRequest("Dữ liệu không hợp lệ");
  }

  const { data, error } = validateCinemaInput(body);
  if (error) return badRequest(error);

  const duplicate = await prisma.cinema.findFirst({
    where: { name: { equals: data.name, mode: "insensitive" } },
    select: { id: true },
  });
  if (duplicate) {
    return Response.json({ message: "Tên rạp đã tồn tại" }, { status: 409 });
  }

  const cinema = await prisma.cinema.create({ data });
  return Response.json({ cinema }, { status: 201 });
}