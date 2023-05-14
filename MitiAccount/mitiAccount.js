class MitiAccount {
  userType = {
    ADMIN: "admin",
    REGULAR: "regular",
  };
  tableRows = {
    email: "VARCHAR(20)",
    fname: "VARCHAR(20)",
    lname: "VARCHAR(20)",
    phone: "VARCHAR(20)",
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
      query += `${key} ${tableRows[key]}, `;
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
  async create() {}
  async read() {}
  async update() {}
  async delete() {}
}

export default MitiAccount;
