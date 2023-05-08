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
    const queries = [];
    const promises = [];
    for (const key in this.userType) {
      const value = this.userType[key];
      queries.push(`
      CREATE TABLE IF NOT EXISTS ${value}_users (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        username VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL
      )
    `);
    }
    for (const query of queries) {
      promises.push(
        new Promise((resolve, reject) => {
          this.mysqlPool.query(query, (error, results) => {
            if (error) {
              reject(error);
            } else {
              resolve(results);
            }
          });
        })
      );
    }
    return Promise.all(promises);
  }

  async register(username, password, type) {
    if (!(type === this.userType.ADMIN || type === this.userType.REGULAR)) {
      throw new Error("Invalid user type");
    }
    const uuidv4 = uuid.v4();
    const hashedPassword = await bcrypt.hash(password, 10);
    const query = `INSERT INTO ${type}_users (id, username, password) VALUES (?, ?, ?)`;
    const params = [uuidv4, username, hashedPassword];
    return new Promise((resolve, reject) => {
      this.mysqlPool.query(query, params, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve(uuidv4);
        }
      });
    });
  }

  async login(username, password, type) {
    if (!(type === this.userType.ADMIN || type === this.userType.REGULAR)) {
      throw new Error("Invalid user type");
    }
    const query = `SELECT id, password FROM ${type}_users WHERE username = ?`;
    const params = [username];
    return new Promise((resolve, reject) => {
      this.mysqlPool.query(query, params, async (err, rows) => {
        if (err) {
          reject(err);
        } else if (rows.length === 0) {
          reject(new Error("User not found"));
        } else {
          const userId = rows[0].id;
          const hashedPassword = rows[0].password;
          const passwordMatch = await bcrypt.compare(password, hashedPassword);
          if (passwordMatch) {
            const token = jwt.sign({ userId, type }, this.jwtSecret, {
              expiresIn: this.jwtExpiration,
            });
            resolve(token);
          } else {
            reject(new Error("Password does not match"));
          }
        }
      });
    });
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
