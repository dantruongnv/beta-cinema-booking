const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

function buildSeats() {
  const rows = "ABCDEFGH".split("");
  const seats = [];
  for (const rowLabel of rows) {
    for (let seatNumber = 1; seatNumber <= 10; seatNumber++) {
      seats.push({
        rowLabel,
        seatNumber,
        type: rowLabel >= "G" ? "VIP" : "NORMAL",
      });
    }
  }
  return seats;
}

async function main() {
  // 1. Tài khoản nhân viên (từ biến môi trường, không ghi cứng trong code)
  const email = process.env.STAFF_EMAIL;
  const password = process.env.STAFF_PASSWORD;
  if (!email || !password) {
    throw new Error("Thiếu STAFF_EMAIL hoặc STAFF_PASSWORD trong file .env");
  }
  await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      passwordHash: await bcrypt.hash(password, 10),
      fullName: "Nhân viên Beta",
      role: "STAFF",
      isVerified: true,
    },
  });

  // Nếu đã có dữ liệu rạp thì không seed lại
  if ((await prisma.cinema.count()) > 0) {
    console.log("Đã có dữ liệu rạp, bỏ qua phần seed còn lại.");
    return;
  }

  // 2. Rạp (DỮ LIỆU MẪU - thay tên, địa chỉ, SĐT bằng thông tin thật từ betacinemas.vn)
  const cinemas = [
    { name: "Beta Cinemas Mỹ Đình", address: "Địa chỉ mẫu 1", region: "Hà Nội", phone: "0000000001" },
    { name: "Beta Cinemas Thanh Xuân", address: "Địa chỉ mẫu 2", region: "Hà Nội", phone: "0000000002" },
    { name: "Beta Cinemas Quận 1", address: "Địa chỉ mẫu 3", region: "TP. Hồ Chí Minh", phone: "0000000003" },
  ];

  // 3. Mỗi rạp 2 phòng, mỗi phòng 80 ghế (A-F thường, G-H VIP)
  for (const cinema of cinemas) {
    await prisma.cinema.create({
      data: {
        ...cinema,
        rooms: {
          create: [
            { name: "Phòng 1", seats: { create: buildSeats() } },
            { name: "Phòng 2", seats: { create: buildSeats() } },
          ],
        },
      },
    });
  }

  // 4. Phim mẫu (Bước 3 sẽ nhập phim thật từ TMDB)
  const movieData = [
    { title: "Phim mẫu 1", overview: "Mô tả phim mẫu 1", genres: "Hành động", durationMin: 105, ageRating: "T13" },
    { title: "Phim mẫu 2", overview: "Mô tả phim mẫu 2", genres: "Hài", durationMin: 120, ageRating: "P" },
    { title: "Phim mẫu 3", overview: "Mô tả phim mẫu 3", genres: "Kinh dị", durationMin: 135, ageRating: "T18" },
  ];
  const movies = [];
  for (const m of movieData) {
    movies.push(
      await prisma.movie.create({
        data: { ...m, status: "NOW_SHOWING", releaseDate: new Date() },
      })
    );
  }

  // 5. Suất chiếu: 3 ngày tới, 4 suất/ngày/phòng
  const rooms = await prisma.room.findMany();
  const hours = [9, 13, 17, 20];
  const showtimes = [];
  rooms.forEach((room, roomIndex) => {
    for (let day = 1; day <= 3; day++) {
      hours.forEach((hour, slot) => {
        const movie = movies[(roomIndex + day + slot) % movies.length];
        const startTime = new Date();
        startTime.setDate(startTime.getDate() + day);
        startTime.setHours(hour, 0, 0, 0);
        // Kết thúc = bắt đầu + thời lượng phim + 15 phút dọn phòng
        const endTime = new Date(startTime.getTime() + (movie.durationMin + 15) * 60000);
        showtimes.push({ movieId: movie.id, roomId: room.id, startTime, endTime, price: 90000 });
      });
    }
  });
  await prisma.showtime.createMany({ data: showtimes });

  console.log("Seed xong: 3 rạp, 6 phòng, 480 ghế, 3 phim, " + showtimes.length + " suất chiếu.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());