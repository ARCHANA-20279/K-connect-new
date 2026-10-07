const User = require("../models/User");
const NHG = require("../models/NHG");
const Member = require("../models/Member");
const Loan = require("../models/Loan");
const Meeting = require("../models/Meeting");
const Thrift = require("../models/Thrift");
const Attendance = require("../models/Attendance");

const seedInitialData = async () => {
  try {
    // 1. Ensure Main Admin account exists
    let mainAdmin = await User.findOne({
      $or: [
        { role: "MAIN_ADMIN" },
        { role: "super_admin" },
        { role: "superadmin" },
        { email: "admin@kconnect.gov.in" },
      ],
    });

    if (!mainAdmin) {
      await User.create({
        name: "Platform Main Admin",
        email: "admin@kconnect.gov.in",
        password: "admin123",
        role: "MAIN_ADMIN",
        nhgName: "State Kudumbashree Mission HQ",
        phone: "9400000000",
      });
      console.log("✓ Default Main Admin seeded: admin@kconnect.gov.in / admin123");
    } else {
      let modified = false;
      if (mainAdmin.role !== "MAIN_ADMIN") {
        mainAdmin.role = "MAIN_ADMIN";
        modified = true;
      }
      const match = await mainAdmin.matchPassword("admin123");
      if (!match) {
        mainAdmin.password = "admin123";
        modified = true;
      }
      if (modified) {
        await mainAdmin.save();
        console.log("✓ Main Admin credentials synchronized to admin@kconnect.gov.in / admin123");
      }
    }

    // 2. Ensure initial NHGs exist
    const defaultNHGs = [
      {
        nhgId: "NHG001",
        name: "Ward 15 Ayalkoottam",
        ward: "15",
        district: "Kannur",
        localBodyType: "Grama Panchayat",
        localBodyName: "Pariyaram Grama Panchayat",
        cdsName: "Pariyaram CDS",
        adsName: "Ward 15 ADS",
        presidentName: "Lathika Suresh",
        secretaryName: "Sujatha Nair",
        secretaryEmail: "secretary.ward15@kudumbashree.gov.in",
        secretaryPhone: "9447000001",
        memberCount: 20,
        status: "Approved",
        description: "Pioneer NHG in Ward 15 engaging in organic farming and micro-savings.",
      },
      {
        nhgId: "NHG002",
        name: "deepam",
        ward: "12",
        district: "Kannur",
        localBodyType: "Grama Panchayat",
        localBodyName: "Pariyaram Grama Panchayat",
        cdsName: "Pariyaram CDS",
        adsName: "Ward 12 ADS",
        presidentName: "Bindu Rajesh",
        secretaryName: "ARCHANA m",
        secretaryEmail: "archana552m@gmail.com",
        secretaryPhone: "8943580290",
        memberCount: 25,
        status: "Approved",
        description: "Deepam Ayalkoottam unit registered under Ward 12.",
      },
      {
        nhgId: "NHG003",
        name: "Jaaango",
        ward: "08",
        district: "Kannur",
        localBodyType: "Municipality",
        localBodyName: "Taliparamba Municipality",
        cdsName: "Taliparamba CDS",
        adsName: "Ward 08 ADS",
        presidentName: "Rani Mathew",
        secretaryName: "NHG Secretary",
        secretaryEmail: "secretary.jaaango@kconnect.gov.in",
        secretaryPhone: "9447000003",
        memberCount: 18,
        status: "Approved",
        description: "Jaaango Self-Help Group under Ward 08.",
      },
    ];

    for (const def of defaultNHGs) {
      const existing = await NHG.findOne({ name: { $regex: new RegExp(`^${def.name}$`, "i") } });
      if (!existing) {
        await NHG.create(def);
        console.log(`✓ Seeded NHG: ${def.name} (${def.nhgId})`);
      } else {
        let changed = false;
        if (!existing.nhgId) {
          existing.nhgId = def.nhgId;
          changed = true;
        }
        if (existing.status === "Active") {
          existing.status = "Approved";
          changed = true;
        }
        if (!existing.district) {
          existing.district = def.district;
          changed = true;
        }
        if (!existing.localBodyType) {
          existing.localBodyType = def.localBodyType;
          changed = true;
        }
        if (changed) {
          await existing.save();
        }
      }
    }

    // 3. Backfill nhgId on all collections to guarantee full data separation
    const nhgMap = {};
    const allNHGs = await NHG.find({});
    for (const n of allNHGs) {
      nhgMap[n.name.toLowerCase()] = n.nhgId;
    }

    // Backfill Users
    for (const n of allNHGs) {
      if (n.nhgId) {
        await User.updateMany(
          { nhgName: n.name, $or: [{ nhgId: { $exists: false } }, { nhgId: "" }, { nhgId: null }] },
          { $set: { nhgId: n.nhgId } }
        );
        await Member.updateMany(
          { $or: [{ nhgName: n.name }, { address: n.name }], $or: [{ nhgId: { $exists: false } }, { nhgId: "" }, { nhgId: null }] },
          { $set: { nhgId: n.nhgId, nhgName: n.name } }
        );
        await Loan.updateMany(
          { nhgName: n.name, $or: [{ nhgId: { $exists: false } }, { nhgId: "" }, { nhgId: null }] },
          { $set: { nhgId: n.nhgId } }
        );
        await Meeting.updateMany(
          { nhgName: n.name, $or: [{ nhgId: { $exists: false } }, { nhgId: "" }, { nhgId: null }] },
          { $set: { nhgId: n.nhgId } }
        );
        await Thrift.updateMany(
          { nhgName: n.name, $or: [{ nhgId: { $exists: false } }, { nhgId: "" }, { nhgId: null }] },
          { $set: { nhgId: n.nhgId } }
        );
        await Attendance.updateMany(
          { nhgName: n.name, $or: [{ nhgId: { $exists: false } }, { nhgId: "" }, { nhgId: null }] },
          { $set: { nhgId: n.nhgId } }
        );
      }
    }

    // 4. Ensure demo secretary Archana has password123 and NHG_SECRETARY role
    const secUser = await User.findOne({ email: "archana552m@gmail.com" });
    if (secUser) {
      secUser.role = "NHG_SECRETARY";
      secUser.nhgName = "deepam";
      secUser.nhgId = "NHG002";
      const match = await secUser.matchPassword("password123");
      if (!match) {
        secUser.password = "password123";
      }
      await secUser.save();
      console.log("✓ Deepam Secretary synced: archana552m@gmail.com / password123 (NHG002)");
    }

    // 5. Ensure demo member anu@gmail.com has password123 and MEMBER role
    const anuUser = await User.findOne({ email: "anu@gmail.com" });
    if (anuUser) {
      anuUser.role = "MEMBER";
      anuUser.nhgName = "deepam";
      anuUser.nhgId = "NHG002";
      const match = await anuUser.matchPassword("password123");
      if (!match) {
        anuUser.password = "password123";
      }
      await anuUser.save();
      console.log("✓ Demo member synced: anu@gmail.com / password123 (NHG002)");
    }
  } catch (err) {
    console.warn("Seed initial data warning:", err.message);
  }
};

module.exports = seedInitialData;
