import MitiSettings from "miti-settings";
class MitiAccount {
  table = "_uinfo";
  constructor(mysqlPool, auth, mitiSettings = new MitiSettings()) {
    this.mysqlPool = mysqlPool;
    this.msettings = mitiSettings;
    this.mitiAuth = auth;
  }
  INVALID_USER_TYPE = new Error("Invalid User Type");
  INVALID_USER_INFO = new Error("Invalid User Informations");
  ACCOUNT_EXISTS = new Error("User Account' Already Exists");
  ACCOUNT_CREATION = new Error("User Info Creation Error");
  NO_USER_INFO = new Error("No Account' for this Auth'");

  async #query(str, params) {
    const sql = this.mysqlPool.format(str, params);
    const [rows] = await this.mysqlPool.query(sql);
    return rows;
  }

  async setupDatabase() {
    const promises = [];
    let query = "";
    for (const key in this.msettings.tableRows) {
      query += `${key} ${this.msettings.tableRows[key]}, `;
    }
    query = query.slice(0, -2);

    for (const key in this.msettings.userType) {
      const value = this.msettings.userType[key];
      promises.push(
        this
          .#query(`CREATE TABLE IF NOT EXISTS ${value}${this.table} (id VARCHAR(36) NOT NULL PRIMARY KEY,${query}
      )
    `)
      );
    }
    return Promise.all(promises);
  }

  async create(userObject, authToken) {
    this.validateUserObject(userObject);
    const decoded = await this.mitiAuth.checkJWT(authToken);
    const type = decoded.type;
    this.checkType(type);
    let error = false;
    try {
      await this.read(authToken);
    } catch (e) {
      error = true;
    }
    if (!error) {
      throw this.ACCOUNT_EXISTS;
    }
    const rows = Object.keys(this.msettings.tableRows).join(", ");
    const values = Object.keys(this.msettings.tableRows)
      .map(() => `?`)
      .join(", ");
    const params = [decoded.userId].concat(
      Object.keys(this.msettings.tableRows).map((key) => userObject[key])
    );

    const createSQL = `INSERT INTO ${type}${this.table} (id,${rows}) VALUES (?, ${values})`;
    const createQuery = await this.#query(createSQL, params);
    if (createQuery["affectedRows"] !== 1) {
      throw this.ACCOUNT_CREATION;
    }
  }

  readRow() {
    return Object.keys(this.msettings.tableRows);
  }

  async read(authToken) {
    const decoded = await this.mitiAuth.checkJWT(authToken);
    const username = await this.mitiAuth.getUsername(authToken);
    const id = decoded.userId;
    const type = decoded.type;
    this.checkType(type);
    const columnNames = Object.keys(this.msettings.tableRows).join(", ");
    const selectSQL = `SELECT ${columnNames} FROM ${type}${this.table} WHERE id = ?`;
    const params = [id];
    const selectQuery = await this.#query(selectSQL, params);
    if (selectQuery.length === 0) {
      throw this.NO_USER_INFO;
    }
    var object = selectQuery[0];
    object["username"] = username;
    return object;
  }
  async update(userObject, authToken) {
    this.validateUserObject(userObject);
    const decoded = await this.mitiAuth.checkJWT(authToken);
    const id = decoded.userId;
    const type = decoded.type;
    this.checkType(type);
    await this.read(authToken);
    let updateMagic = "";
    let params = [];
    for (const key in this.msettings.tableRows) {
      if (this.msettings.tableRows.hasOwnProperty(key)) {
        updateMagic += `${key} = ?, `;
        params.push(userObject[key]);
      }
    }
    params.push(id);
    // Remove the last ", " from rows and values
    updateMagic = updateMagic.slice(0, -2);
    const updateSQL = `UPDATE ${type}${this.table} SET ${updateMagic} WHERE id = ? ;`;
    await this.#query(updateSQL, params);
  }

  async delete(authToken) {
    const decoded = await this.mitiAuth.checkJWT(authToken);
    const id = decoded.userId;
    const type = decoded.type;
    await this.read(authToken);
    const params = [id];
    this.checkType(type);
    const updateSQL = `DELETE FROM ${type}${this.table} WHERE id = ? ;`;
    await this.#query(updateSQL, params);
  }

  validateUserObject(userObject) {
    const keys = Object.keys(this.msettings.tableRows);
    for (const key of keys) {
      if (!(key in userObject)) {
        throw this.INVALID_USER_INFO;
      }
      if (typeof userObject[key] !== this.convertType(key)) {
        throw this.INVALID_USER_INFO;
      }
    }
  }

  convertType(key) {
    if (this.msettings.tableRows[key] === "VARCHAR(80)") {
      return "string";
    }
  }
  checkType(type) {
    if (!Object.values(this.msettings.userType).includes(type)) {
      throw this.INVALID_USER_TYPE;
    }
  }
}

export default MitiAccount;
