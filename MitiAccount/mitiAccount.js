const defaultTableRows = {
  email: "VARCHAR(80)",
  fname: "VARCHAR(80)",
  lname: "VARCHAR(80)",
  phone: "VARCHAR(80)",
  address: "VARCHAR(80)",
  ass: "VARCHAR(80)",
};
const defaultUserType = {
  ADMIN: "admin",
  REGULAR: "regular",
};
class MitiAccount {
  table = "_uinfo";
  constructor(mysqlPool, usrType = defaultUserType, tblRow = defaultTableRows) {
    this.tableRows = tblRow;
    this.userType = usrType;
    this.mysqlPool = mysqlPool;
  }

  async init() {
    const promises = [];
    let query = "";
    for (const key in this.tableRows) {
      query += `${key} ${this.tableRows[key]}, `;
    }
    query = query.slice(0, -2);

    for (const key in this.userType) {
      const value = this.userType[key];
      promises.push(
        this.mysqlPool.query(`
      CREATE TABLE IF NOT EXISTS ${value}${this.table} (
        id VARCHAR(36) NOT NULL PRIMARY KEY,${query}
      )
    `)
      );
    }
    return Promise.all(promises);
  }
  async create(userObject, id, type) {
    if (!this.validateUserObject(userObject)) {
      throw new Error("Invalid User Informations");
    }
    if (!Object.values(this.userType).includes(type)) {
      throw new Error("Invalid user type");
    }
    let error = false;
    try {
      await this.read(id, type);
    } catch (e) {
      error = true;
    }
    if (!error) {
      throw new Error("User Info Already Existing");
    }
    //TODO Check user ID with mitiAuth
    let rows = "";
    let values = "";
    let params = [id];

    for (const key in this.tableRows) {
      if (this.tableRows.hasOwnProperty(key)) {
        rows += `${key}, `;
        values += "?, ";
        params.push(userObject[key]);
      }
    }
    // Remove the last ", " from rows and values
    rows = rows.slice(0, -2);
    values = values.slice(0, -2);

    const createSQL = `INSERT INTO ${type}${this.table} (id,${rows}) VALUES (?,${values})`;
    const createQuery = await this.mysqlPool.query(createSQL, params);
    if (createQuery[0]["affectedRows"] !== 1) {
      throw new Error("Didn't create user info");
    }
  }

  readRow() {
    return Object.keys(this.tableRows);
  }

  async read(id, type) {
    if (!Object.values(this.userType).includes(type)) {
      throw new Error("Invalid user type");
    }
    //TODO Check user ID with mitiAuth
    const selectSQL = `SELECT * FROM ${type}${this.table} WHERE id = ?`;
    const params = [id];
    const selectQuery = await this.mysqlPool.query(selectSQL, params);
    if (selectQuery[0].length === 0) {
      throw new Error("No userinfo at this id");
    }
    return selectQuery[0][0];
  }
  async update(userObject, id, type) {
    if (!this.validateUserObject(userObject)) {
      throw new Error("Invalid User Informations");
    }
    if (!Object.values(this.userType).includes(type)) {
      throw new Error("Invalid user type");
    }
    await this.read(id, type);
    //TODO Check user ID with mitiAuth
    let updateMagic = "";
    let params = [];
    for (const key in this.tableRows) {
      if (this.tableRows.hasOwnProperty(key)) {
        updateMagic += `${key} = ?, `;
        params.push(userObject[key]);
      }
    }
    params.push(id);
    // Remove the last ", " from rows and values
    updateMagic = updateMagic.slice(0, -2);
    const updateSQL = `UPDATE ${type}${this.table} SET ${updateMagic} WHERE id = ? ;`;
    const updateQuery = await this.mysqlPool.query(updateSQL, params);
  }

  async delete(id, type) {
    await this.read(id, type);
    const params = [id];
    if (!Object.values(this.userType).includes(type)) {
      throw new Error("Invalid user type");
    }
    const updateSQL = ` DELETE FROM ${type}${this.table} WHERE id = ? ;`;
    const updateQuery = await this.mysqlPool.query(updateSQL, params);
  }

  validateUserObject(userObject) {
    const keys = Object.keys(this.tableRows);
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
    if (this.tableRows[key] === "VARCHAR(80)") {
      return "string";
    }
  }
}

export default MitiAccount;
