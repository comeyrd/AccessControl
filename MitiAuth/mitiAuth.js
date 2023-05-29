import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { v4 } from "uuid";
const defaultUser = {
  ADMIN: "admin",
  REGULAR: "regular",
};

class MitiAuth {
  table = "_users";
  jwtExpiration = "3d";
  jwtSecret = v4();

  constructor(mysqlPool, typOfUser = defaultUser) {
    this.mysqlPool = mysqlPool;
    this.userType = typOfUser;
  }

  async init() {
    const promises = [];
    for (const key in this.userType) {
      const value = this.userType[key];
      promises.push(
        this.mysqlPool.query(`
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
    if (!(type === this.userType.ADMIN || type === this.userType.REGULAR)) {
      throw new Error("Invalid user type");
    }
    if (typeof username !== "string" || typeof password !== "string") {
      throw new Error("Bad Params");
    }
    //verifier si l'user existe
    const selectQuery = `SELECT id FROM ${type}${this.table} WHERE username = ?`;
    const rows = await this.mysqlPool.query(selectQuery, [username]);
    if (rows[0].length != 0) {
      throw new Error("User Already Exists");
    }
    const uuidv4 = v4();
    const hashedPassword = await bcrypt.hash(password, 10);
    const insertQuery = `INSERT INTO ${type}${this.table} (id, username, password) VALUES (?, ?, ?)`;
    const params = [uuidv4, username, hashedPassword];
    await this.mysqlPool.query(insertQuery, params);
    return uuidv4;
  }

  async login(username, password, type) {
    if (!(type === this.userType.ADMIN || type === this.userType.REGULAR)) {
      throw new Error("Invalid user type");
    }
    if (typeof username !== "string" || typeof password !== "string") {
      throw new Error("Bad Params");
    }
    const query = `SELECT id, password FROM ${type}${this.table} WHERE username = ?`;
    const [rows] = await this.mysqlPool
      .query(query, [username])
      .catch((error) => {
        if (error) {
          throw error;
        }
      });
    if (rows.length === 0) {
      throw new Error("User not found");
    }
    const userId = rows[0].id;
    const hashedPassword = rows[0].password;
    const passwordMatch = await bcrypt.compare(password, hashedPassword);
    if (passwordMatch) {
      return jwt.sign({ userId, type }, this.jwtSecret, {
        expiresIn: this.jwtExpiration,
      });
    }
    throw new Error("Password does not match");
  }

  async update(token, newusername, newpassword) {
    if (typeof newusername !== "string" || typeof newpassword !== "string") {
      throw new Error("Bad Params");
    }
    const decoded = await this.checkJWT(token).catch((error) => {
      throw error;
    });
    const hashedPassword = await bcrypt.hash(newpassword, 10);
    const query = `UPDATE ${decoded.type}${this.table} SET username= ?, password= ? WHERE id = ? ;`;
    const params = [newusername, hashedPassword, decoded.userId];
    await this.mysqlPool.query(query, params);
    return decoded.userId;
  }

  async delete(token) {
    const decoded = await this.checkJWT(token).catch((error) => {
      throw error;
    });
    const query = `DELETE FROM ${decoded.type}${this.table} WHERE id = ?`;
    const params = [decoded.userId];
    await this.mysqlPool.query(query, params);
  }

  async checkJWT(token) {
    return new Promise((resolve, reject) => {
      jwt.verify(token, this.jwtSecret, (err, decoded) => {
        if (err) {
          reject(err);
        } else {
          resolve(decoded);
        }
      });
    });
  }
}

export default MitiAuth;
