import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import MitiSettings from "miti-settings";
const startDate = new Date("2023-01-01");
const randLen = 5;
function createRandomId() {
  const currentDate = new Date();
  // Calculate the time difference in milliseconds
  const timeDifference = currentDate.getTime() - startDate.getTime();
  const charrep = timeDifference.toString(36);
  const randomBytes = crypto.randomBytes(randLen);
  const randomString = randomBytes.toString("hex");
  return charrep + "-" + randomString;
}

class MitiAuth {
  table = "_users";
  jwtExpiration = 3 * 24 * 60 * 60 * 1000; //3Days
  logoutExpiration = 1;
  jwtSecret = "";
  EXPIRED_TOKEN_ERROR = "Expired Token";
  INVALID_TOKEN_ERROR = "Invalid Token";
  INVALID_USER_TYPE = "Invalid User Type";
  USER_EXISTS = "User already Exists";
  USER_DONT_EXISTS = "User doesnt exist";
  BAD_PASSWORD = "Password and Login does not match";
  BAD_PARAMS = "Bad Params";

  constructor(mysqlPool, mitiSettings = new MitiSettings(),jwtscrt) {
    this.mysqlPool = mysqlPool;
    this.msettings = mitiSettings;
    if(jwtscrt === false){
      this.jwtSecret = createRandomId();
    }else{
      this.jwtSecret = jwtscrt;
    }
  }

  async #query(str, params) {
    const sql = this.mysqlPool.format(str, params);
    const [rows] = await this.mysqlPool.query(sql);
    return rows;
  }

  async getNewUID() {
    while (true) {
      const id = createRandomId();
      const query = `SELECT IF(COUNT(*) > 0, 1, 0) AS isUsed FROM ${this.table} WHERE id = ?`;
      const rows = await this.#query(query, [id]);
      if (rows[0].isUsed === 0) {
        return id;
      }
    }
  }
  async setupDatabase() {
    return this.#query(`
    CREATE TABLE IF NOT EXISTS ${this.table} (
      id VARCHAR(36) NOT NULL PRIMARY KEY,
      username VARCHAR(255) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      type VARCHAR(255) NOT NULL
    )
  `);
  }

  async register(username, password, type) {
    this.checkUserType(type);
    this.checkParams(username, password);
    await this.checkUnsedUsername(username);
    const rid = await this.getNewUID();
    const hashedPassword = await bcrypt.hash(password, 10);
    const insertQuery = `INSERT INTO ${this.table} (id, username, password, type) VALUES (?, ?, ?, ?)`;
    const params = [rid, username, hashedPassword,type];
    await this.#query(insertQuery, params);
    return this.login(username, password, type);
  }

  async login(username, password) {
    this.checkParams(username, password);
    const query = `SELECT id, password, type FROM ${this.table} WHERE username = ?`;
    const rows = await this.#query(query, [username]);
    if (rows.length === 0) {
      throw new Error(this.USER_DONT_EXISTS);
    }
    const userId = rows[0].id;
    const hashedPassword = rows[0].password;
    const type = rows[0].type
    this.checkUserType(type);
    const passwordMatch = await bcrypt.compare(password, hashedPassword);
    if (passwordMatch) {
      return jwt.sign({ userId, type }, this.jwtSecret, {
        expiresIn: this.jwtExpiration,
      });
    }
    throw new Error(this.BAD_PASSWORD);
  }

  async update_username(token,newusername){
    this.checkParams(newusername, newusername);
    const decoded = await this.checkJWT(token);
    const query = `UPDATE ${this.table} SET username= ? WHERE id = ? ;`;
    const params = [newusername, decoded.userId];
    await this.#query(query, params);
    return true;
  }
  
  async update_password(token,newpassword){
    this.checkParams(newpassword, newpassword);
    const decoded = await this.checkJWT(token);
    const hashedPassword = await bcrypt.hash(newpassword, 10);
    const query = `UPDATE ${this.table} SET password= ? WHERE id = ? ;`;
    const params = [hashedPassword, decoded.userId];
    await this.#query(query, params);
    return true;
  }

  async getUsername(token) {
    const decoded = await this.checkJWT(token);
    const query = `SELECT username FROM  ${this.table} WHERE id = ? ;`;
    const params = [decoded.userId];
    const selectQuery = await this.#query(query, params);
    if (selectQuery.length === 0) {
      throw new Error(this.NO_USER_INFO);
    }
    return selectQuery[0]["username"];
  }

  async delete(token) {
    const decoded = await this.checkJWT(token);
    await this.delete_id(decoded.id);
  }

  async delete_id(id){
    const query = `DELETE FROM ${this.table} WHERE id = ?`;
    const params = [id];
    const result = await this.#query(query, params);
    if (result.affectedRows === 1) {
      return true;
    } else {
      throw new Error(this.USER_DONT_EXISTS);
    }
  }

  async get_type_from_id(id){
    const query = `SELECT type FROM  ${this.table} WHERE id = ? ;`;
    const params = [id];
    const selectQuery = await this.#query(query, params);
    if (selectQuery.length === 0) {
      throw new Error(this.NO_USER_INFO);
    }
    return selectQuery[0]["type"];
  }
  
  async checkJWT(token) {
    return new Promise((resolve, reject) => {
      jwt.verify(token, this.jwtSecret, async (err, decoded) => {
        if (err) {
          reject(this.processJWTError(err));
        } else {
          try {
            await this.checkExists(decoded);
            resolve(decoded);
          } catch (Error) {
            reject(Error);
          }
        }
      });
    });
  }

  async checkExists(decoded) {
    const selectQuery = `SELECT username FROM ${this.table} WHERE id = ?`;
    const rows = await this.#query(selectQuery, [decoded.userId]);
    if (rows.length == 0) {
      throw new Error(this.USER_DONT_EXISTS);
    }
  }
  async logout(token) {
    const decoded = await this.checkJWT(token);
    const userIdD = decoded.userId;
    const typeD = decoded.type;
    return jwt.sign({ userIdD, typeD }, this.jwtSecret, {
      expiresIn: this.logoutExpiration, //1 equals expires in 1ms.
    });
  }
  processJWTError(Error) {
    if (Error.name == "TokenExpiredError") {
      return this.EXPIRED_TOKEN_ERROR;
    } else {
      return this.INVALID_TOKEN_ERROR;
    }
  }
  checkUserType(type) {
    if (!Object.values(this.msettings.getUserTypes()).includes(type)) {
      throw new Error(this.INVALID_USER_TYPE);
    }
  }
  checkParams(user, pass) {
    if (typeof user !== "string" || typeof pass !== "string") {
      throw new Error(this.BAD_PARAMS);
    }
  }
  async checkUnsedUsername(username) {
    //verifier si un user avec cet username existe
      const selectQuery = `SELECT id FROM ${this.table} WHERE username = ?`;
      const rows = await this.#query(selectQuery, [username]);
      if (rows.length != 0) {
        throw new Error(this.USER_EXISTS);
      }
  }
}

export default MitiAuth;
