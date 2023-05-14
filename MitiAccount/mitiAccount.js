class MitiAccount {
  userType = {
    ADMIN: "admin",
    REGULAR: "regular",
  };
  tableRows = {
    email: "VARCHAR(80)",
    fname: "VARCHAR(80)",
    lname: "VARCHAR(80)",
    phone: "VARCHAR(80)",
    address: "VARCHAR(80)",
  };
  table = "_uinfo";
  constructor(mysqlPool) {
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
    if (!(type === this.userType.ADMIN || type === this.userType.REGULAR)) {
      throw new Error("Invalid user type");
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

    const createQuery = `INSERT INTO ${type}${this.table} (id,${rows}) VALUES (?,${values})`;
    const test = await this.mysqlPool.query(createQuery, params);
    if (test[0]["affectedRows"] !== 1) {
      throw new Error("Didn't create user info");
    }
  }

  readRow() {
    return Object.keys(this.tableRows);
  }

  async read() {}
  async update() {}
  async delete() {}

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
