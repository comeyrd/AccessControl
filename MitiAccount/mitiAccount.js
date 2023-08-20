import MitiSettings from "../MitiSettings/mitiSettings";
import MitiAuth from "../MitiAuth/mitiAuth";
class MitiAccount {
  table = "_uinfo";
  constructor(mysqlPool, mitiSettings = new MitiSettings(), auth) {
    this.mysqlPool = mysqlPool;
    this.msettings = mitiSettings;
    this.mitiAuth = auth;
  }

  async #query(str, params) {
    const sql = this.mysqlPool.format(str, params);
    // console.log(sql); //TODO remove
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
    if (!this.validateUserObject(userObject)) {
      throw new Error("Invalid User Informations");
    }

    const decoded = await this.mitiAuth.checkJWT(authToken).catch((error) => {
      throw new Error("Invalid User Token" + error);
    });
    const id = decoded.userId;
    const type = decoded.type;
    if (!Object.values(this.msettings.userType).includes(type)) {
      throw new Error("Invalid user type");
    }
    let error = false;
    try {
      await this.read(authToken);
    } catch (e) {
      error = true;
    }
    if (!error) {
      throw new Error("User 'Account already existing");
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
      throw new Error("Didn't create user info");
    }
  }

  readRow() {
    return Object.keys(this.msettings.tableRows);
  }

  async read(authToken) {
    const decoded = await this.mitiAuth.checkJWT(authToken).catch((error) => {
      throw new Error("Invalid User Token");
    });
    const id = decoded.userId;
    const type = decoded.type;
    if (!Object.values(this.msettings.userType).includes(type)) {
      throw new Error("Invalid user type");
    }
    const selectSQL = `SELECT * FROM ${type}${this.table} WHERE id = ?`;
    const params = [id];
    const selectQuery = await this.#query(selectSQL, params);
    if (selectQuery.length === 0) {
      throw new Error("No userinfo at this id");
    }
    return selectQuery[0];
  }
  async update(userObject, authToken) {
    if (!this.validateUserObject(userObject)) {
      throw new Error("Invalid User Informations");
    }

    const decoded = await this.mitiAuth.checkJWT(authToken).catch((error) => {
      throw new Error("Invalid User Token");
    });
    const id = decoded.userId;
    const type = decoded.type;
    if (!Object.values(this.msettings.userType).includes(type)) {
      throw new Error("Invalid user type");
    }
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
    const decoded = await this.mitiAuth.checkJWT(authToken).catch((error) => {
      throw new Error("Invalid User Token");
    });
    const id = decoded.userId;
    const type = decoded.type;
    await this.read(authToken);
    const params = [id];
    if (!Object.values(this.msettings.userType).includes(type)) {
      throw new Error("Invalid user type");
    }
    const updateSQL = `DELETE FROM ${type}${this.table} WHERE id = ? ;`;
    await this.#query(updateSQL, params);
  }

  validateUserObject(userObject) {
    const keys = Object.keys(this.msettings.tableRows);
    for (const key of keys) {
      if (!(key in userObject)) {
        return false;
      }
      if (typeof userObject[key] !== this.convertType(key)) {
        return false;
      }
    }
    return true;
  }
  convertType(key) {
    if (this.msettings.tableRows[key] === "VARCHAR(80)") {
      return "string";
    }
  }
}

export default MitiAccount;
