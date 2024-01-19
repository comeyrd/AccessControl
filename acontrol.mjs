import mitiAccount from "miti-account";
import mitiAuth from "miti-auth";
import mitiSettings from "miti-settings";
import mysql from "mysql2/promise";
import { TableRows, UserType } from "./config.mjs";
import util from "util";
import dotenv from "dotenv";
class Acontrol {
  constructor(mysqlConfig) {
    this.config = mysqlConfig;
    let mitiSett = new mitiSettings(UserType, TableRows);
    let mysqlPool = await mysql.createPool(mysqlConfig);
    let auth = new mitiAuth(mysqlPool, mitiSett);
    let account = new mitiAccount(mysqlPool, auth, mitiSett);
  }
}
dotenv.config();
const mysqlConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
};


const app = express();
app.use(bodyParser.json());
const port = 8101;

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*"); //TOFIX IN PROD
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

app.post("/login", async (req, res) => {
  const { login, password } = req.body;
  try {
    const token = await auth.login(login, password, UserType.FUSER);
    res.status(200).json({
      Response: "Ok",
      data: { token: token, expiration: auth.jwtExpiration },
    });
  } catch (error) {
    res.status(200).json({ Response: "Error", data: { type: error.message } });
  }
});

app.post("/validate", async (req, res) => {
  const { token } = req.body;
  try {
    const decoded = await auth.checkJWT(token);
    if (decoded.type === UserType.FUSER && decoded.userId) {
      res.status(200).json({
        Response: "Ok",
        data: { id: decoded.userId, type: UserType.FUSER },
      });
    }
  } catch (error) {
    res.status(200).json({ Response: "Error", data: { type: error.message } });
    console.log(error.message);
  }
});

app.post("/register", async (req, res) => {
  const { login, password } = req.body;
  try {
    const newtoken = await auth.register(login, password, UserType.FUSER);
    res.status(200).json({
      Response: "Ok",
      data: { token: newtoken, expiration: auth.jwtExpiration },
    });
  } catch (error) {
    res.status(500).json({ Response: "Error", data: { type: error.message } });
  }
});

app.get("/", async (req, res) => {
  // Respond with a JSON object
  res.json({ message: "Hello, World!" });
});

app.post("/delete", async (req, res) => {
  const { token } = req.body;
  try {
    await auth.delete(token);
    res
      .status(200)
      .json({ Response: "Ok", data: { Message: "Account Deleted" } });
  } catch (error) {
    res
      .status(500)
      .json({ Response: "Error", data: { Message: error.message } });
  }
});

app.post("/logout", async (req, res) => {
  const { token } = req.body;
  try {
    const newtoken = await auth.logout(token);
    res.status(200).json({ Response: "Ok", data: { token: newtoken } });
  } catch (error) {
    res
      .status(500)
      .json({ Response: "Error", data: { Message: error.message } });
  }
});
app.post("/update", async (req, res) => {
  const { token, login, password } = req.body;
  try {
    await auth.update(token, login, password);
    res.status(200).json({ Response: "Ok", data: { message: "Info Updated" } });
  } catch (error) {
    res
      .status(500)
      .json({ Response: "Error", data: { Message: error.message } });
  }
});
app.listen(port, () => {
  console.log(`Server is listening at http://localhost:${port}`);
});

function showObj(obj) {
  console.log(util.inspect(obj, { depth: null }));
}
export { app };
