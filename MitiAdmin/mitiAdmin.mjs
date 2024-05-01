import MitiSettings from "miti-settings";

class MitiAdmin {
  constructor(mysqlPool, auth, account, mitiSettings = new MitiSettings()) {
    this.mysqlPool = mysqlPool;
    this.msettings = mitiSettings;
    this.mitiAuth = auth;
    this.mitiAccount = account;
  }

  INVALID_USER_TYPE = new Error("Invalid User Type");

  async #query(str, params) {
    const sql = this.mysqlPool.format(str, params);
    const [rows] = await this.mysqlPool.query(sql);
    return rows;
  }

  async list(type) {
    this.checkType(type);
    const arr_info_rows = Object.keys(this.msettings.getSqlInfo(this.msettings.reverseUsrType(type)));
    const info_rows = arr_info_rows.map(info_row => `${type}${this.mitiAccount.table}.${info_row}`).join(', ');

    const selectSQL = `SELECT ${type}${this.mitiAccount.table}.id, ${info_rows}, ${this.mitiAuth.table}.username FROM ${type}${this.mitiAccount.table} LEFT JOIN ${this.mitiAuth.table} ON ${this.mitiAuth.table}.id = ${type}${this.mitiAccount.table}.id ;`;
    //const params = [this.mitiAccount.table,info_rows,this.mitiAuth.table,this.mitiAccount.table,this.mitiAuth.table,this.mitiAuth.table,this.mitiAccount.table]
    const selectQuery = await this.#query(selectSQL,null);
    return selectQuery;
  }

  checkType(type) {
    if (!this.msettings.checkType(type)) {
      throw this.INVALID_USER_TYPE;
    }
  }
}
export default MitiAdmin;
