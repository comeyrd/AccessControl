const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const uuid = require("uuid");

class MitiAuth {
  constructor(mysqlPool) {
    this.mysqlPool = mysqlPool;
    this.jwtSecret = uuid.v4();
    this.jwtExpiration = "3d";
    this.userType = {
      ADMIN: "admin",
      REGULAR: "regular",
    };
  }

  async init() {
    const promises = [];
    for (const key in this.userType) {
      const value = this.userType[key];
      promises.push(
        this.mysqlPool.query(`
      CREATE TABLE IF NOT EXISTS ${value}_users (
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
    if (typeof username != "string" || typeof password != "string") {
      throw new Error("Bad Params");
    }
    const uuidv4 = uuid.v4();
    const hashedPassword = await bcrypt.hash(password, 10);
    const query = `INSERT INTO ${type}_users (id, username, password) VALUES (?, ?, ?)`;
    const params = [uuidv4, username, hashedPassword];
    await this.mysqlPool.query(query, params);
    return uuidv4;
  }

  async login(username, password, type) {
    if (!(type === this.userType.ADMIN || type === this.userType.REGULAR)) {
      throw new Error("Invalid user type");
    }
    if (typeof username != "string" || typeof password != "string") {
      throw new Error("Bad Params");
    }
    const query = `SELECT id, password FROM ${type}_users WHERE username = ?`;
    var rows = await this.mysqlPool.query(query, [username]).catch((error) => {
      if (error) {
        console.log(error);
      }
    });
    rows = rows[0];
    if (rows.length === 0) {
      throw new Error("User not found");
    } else {
      const userId = rows[0].id;
      const hashedPassword = rows[0].password;
      const passwordMatch = await bcrypt.compare(password, hashedPassword);
      if (passwordMatch) {
        return jwt.sign({ userId, type }, this.jwtSecret, {
          expiresIn: this.jwtExpiration,
        });
      } else {
        throw new Error("Password does not match");
      }
    }
  }

  async checkJWT(token) {
    return new Promise((resolve, reject) => {
      jwt.verify(token, this.jwtSecret, (err, decoded) => {
        if (err) {
          reject(err);
        } else {
          resolve(decoded.type);
        }
      });
    });
  }
}

module.exports = MitiAuth;
