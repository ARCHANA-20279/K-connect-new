require("dotenv").config({ path: require("path").join(__dirname, ".env") });
const express = require("express");
const cors = require("cors");
const http = require("http");
const jwt = require("jsonwebtoken");
const { Server } = require("socket.io");
const User = require("./models/User");
const Member = require("./models/Member");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const memberRoutes = require("./routes/memberRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");
const loanRoutes = require("./routes/loanRoutes");
const meetingRoutes = require("./routes/meetingRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const thriftRoutes = require("./routes/thriftRoutes");
const programmeRoutes = require("./routes/programmeRoutes");
const jobRoutes = require("./routes/jobRoutes");
const auditRoutes = require("./routes/auditRoutes");
const nhgRoutes = require("./routes/nhgRoutes");
const enterpriseRoutes = require("./routes/enterpriseRoutes");
const seedInitialData = require("./config/seed");

connectDB().then(() => {
  seedInitialData();
});

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: process.env.CLIENT_ORIGIN || true } });
app.set("io", io);
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("K-Connect API is running");
});

app.use("/api/auth", authRoutes);
app.use("/api/nhgs", nhgRoutes);
app.use("/api/members", memberRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/loans", loanRoutes);
app.use("/api/meetings", meetingRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/thrift", thriftRoutes);
app.use("/api/programmes", programmeRoutes);
app.use("/api/enterprises", enterpriseRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/audit", auditRoutes);

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Authentication required"));
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "kconnect_secret");
    const user = await User.findById(decoded.id).select("-password");
    if (!user || (user.role || "").toLowerCase() !== "member") return next(new Error("NHG member access required"));
    let member = user.memberId ? await Member.findOne({ memberId: user.memberId, status: "Active" }) : null;
    if (member?.email && member.email.toLowerCase() !== user.email.toLowerCase()) member = null;
    if (!member) member = await Member.findOne({ email: user.email.toLowerCase(), status: "Active" });
    if (!member || !member.nhgName) return next(new Error("Active NHG membership required"));
    socket.data.member = { memberId: member.memberId, nhgId: member.nhgId, nhgName: member.nhgName };
    next();
  } catch {
    next(new Error("Invalid or expired session"));
  }
});

io.on("connection", (socket) => {
  const { nhgId, nhgName } = socket.data.member;
  socket.join(`nhg:${nhgId || nhgName}`);
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
