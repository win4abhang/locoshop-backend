const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Store = require("./models/Store");

dotenv.config();

const sampleStores = [
  {
    name: "Ramesh Bike Repair",
    address: "Kurla West, Mumbai",
    phone: "9876543210",
    whatsapp: "9876543210",
    tags: ["bike", "repair", "garage", "service"],
    location: {
      type: "Point",
      coordinates: [72.8722, 19.0728], // Mumbai
    },
  },
  {
    name: "ICICI Bank Andheri",
    address: "Andheri East, Mumbai",
    phone: "02212345678",
    whatsapp: "",
    tags: ["bank", "icici", "atm"],
    location: {
      type: "Point",
      coordinates: [72.8656, 19.1197], // Andheri
    },
  },
  {
    name: "Ganesh Footwear",
    address: "Pune Camp",
    phone: "8888888888",
    whatsapp: "8888888888",
    tags: ["shoes", "chappal", "footwear", "store"],
    location: {
      type: "Point",
      coordinates: [73.8772, 18.5089], // Pune
    },
  },
  {
    name: "Shraddha Notebook Center",
    address: "Kothrud, Pune",
    phone: "7777777777",
    whatsapp: "",
    tags: ["notebook", "books", "stationery", "shop"],
    location: {
      type: "Point",
      coordinates: [73.8077, 18.5088], // Pune
    },
  },
  {
    name: "Sunita Houseworker Service",
    address: "Vashi, Navi Mumbai",
    phone: "9999999999",
    whatsapp: "9999999999",
    tags: ["houseworker", "maid", "cleaning"],
    location: {
      type: "Point",
      coordinates: [73.0033, 19.0771], // Navi Mumbai
    },
  },
];

const seedDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    await Store.deleteMany({});
    await Store.insertMany(sampleStores);
    console.log("Sample data inserted");
    mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
};

seedDB();
