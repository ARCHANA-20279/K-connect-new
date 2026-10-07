require("dotenv").config();
const express = require("express");
const cors = require("cors");
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
const seedInitialData = require("./config/seed");

connectDB().then(() => {
  seedInitialData();
});

const app = express();
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
app.use("/api/jobs", jobRoutes);
app.use("/api/audit", auditRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
