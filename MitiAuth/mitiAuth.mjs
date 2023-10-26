import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { v4 } from "uuid";
import MitiSettings from "miti-settings";
const defaultUser = {
  ADMIN: "admin",
  REGULAR: "regular",
};

class MitiAuth {
  table = "_users";
  jwtExpiration = "3d";
  jwtSecret = v4();
  EXPIRED_TOKEN_ERROR = new Error("Expired Token");
  INVALID_TOKEN_ERROR = new Error("Invalid Token");
  INVALID_USER_TYPE = new Error("Invalid User Type");
  USER_EXISTS = new Error("User already Exists");
  USER_DONT_EXISTS = new Error("User doesnt exist");
  BAD_PASSWORD = new Error("Password and Login does not match");
  BAD_PARAMS = new Error("Bad Params");

  constructor(mysqlPool, mitiSettings = new MitiSettings()) {
    this.mysqlPool = mysqlPool;
    this.msettings = mitiSettings;
  }

  async #query(str, params) {
    const sql = this.mysqlPool.format(str, params);
    const [rows] = await this.mysqlPool.query(sql);
    return rows;
  }

  async setupDatabase() {
    const promises = [];
    for (const key in this.msettings.userType) {
      const value = this.msettings.userType[key];
      promises.push(
        this.#query(`
      CREATE TABLE IF NOT EXISTS ${value}${this.table} (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        username VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL
      )
    `)
      );
    }
    return Promise.all(promises);
  }

  async register(username, password, type) {
    this.checkUserType(type);
    this.checkParams(username, password);
    //verifier si l'user existe
    const selectQuery = `SELECT id FROM ${type}${this.table} WHERE username = ?`;
    const rows = await this.#query(selectQuery, [username]);
    if (rows.length != 0) {
      throw this.USER_EXISTS;
    }
    const uuidv4 = v4();
    const hashedPassword = await bcrypt.hash(password, 10);
    const insertQuery = `INSERT INTO ${type}${this.table} (id, username, password) VALUES (?, ?, ?)`;
    const params = [uuidv4, username, hashedPassword];
    await this.#query(insertQuery, params);
    return this.login(username, password, type);
  }

  async login(username, password, type) {
    this.checkUserType(type);
    this.checkParams(username, password);
    const query = `SELECT id, password FROM ${type}${this.table} WHERE username = ?`;
    const rows = await this.#query(query, [username]);
    if (rows.length === 0) {
      throw this.USER_DONT_EXISTS;
    }
    const userId = rows[0].id;
    const hashedPassword = rows[0].password;
    const passwordMatch = await bcrypt.compare(password, hashedPassword);
    if (passwordMatch) {
      return jwt.sign({ userId, type }, this.jwtSecret, {
        expiresIn: this.jwtExpiration,
      });
    }
    throw this.BAD_PASSWORD;
  }

  async update(token, newusername, newpassword) {
    this.checkParams(newusername, newpassword);
    const decoded = await this.checkJWT(token);
    const hashedPassword = await bcrypt.hash(newpassword, 10);
    const query = `UPDATE ${decoded.type}${this.table} SET username= ?, password= ? WHERE id = ? ;`;
    const params = [newusername, hashedPassword, decoded.userId];
    await this.#query(query, params);
    return this.login(newusername, newpassword, decoded.type);
  }

  async delete(token) {
    const decoded = await this.checkJWT(token);
    const query = `DELETE FROM ${decoded.type}${this.table} WHERE id = ?`;
    const params = [decoded.userId];
    const result = await this.#query(query, params);
    if (result.affectedRows === 1) {
      return true;
    } else {
      throw this.USER_DONT_EXISTS;
    }
  }

  async checkJWT(token) {
    return new Promise((resolve, reject) => {
      jwt.verify(token, this.jwtSecret, (err, decoded) => {
        if (err) {
          reject(this.processJWTError(err));
        } else {
          resolve(decoded);
        }
      });
    });
  }

  async logout(token) {
    const decoded = await this.checkJWT(token);
    const userIdD = decoded.userId;
    const typeD = decoded.type;
    return jwt.sign({ userIdD, typeD }, this.jwtSecret, {
      expiresIn: -1, //1 equals expires in 1ms.
    });
  }
  processJWTError(error) {
    if (error.name == "TokenExpiredError") {
      return this.EXPIRED_TOKEN_ERROR;
    } else {
      return this.INVALID_TOKEN_ERROR;
    }
  }
  checkUserType(type) {
    if (!Object.values(this.msettings.userType).includes(type)) {
      throw this.INVALID_USER_TYPE;
    }
  }
  checkParams(user, pass) {
    if (typeof user !== "string" || typeof pass !== "string") {
      throw this.BAD_PARAMS;
    }
  }
}

export default MitiAuth;
