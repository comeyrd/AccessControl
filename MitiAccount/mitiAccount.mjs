import MitiSettings from "miti-settings";
class MitiAccount {
  table = "_uinfo";
  constructor(mysqlPool, auth, mitiSettings = new MitiSettings()) {
    this.mysqlPool = mysqlPool;
    this.msettings = mitiSettings;
    this.mitiAuth = auth;
  }

  typeTranslation = {
    "VARCHAR(80)": "string",
    // Add more type translations as needed
  };

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
    const usrType = this.msettings.getUserTypes();
    for (const user in usrType) {
      const info = this.msettings.getSqlInfo(user);
      let query = "";
      for (const val in info) {
        query += `${val} ${info[val]}, `;
      }
      query = query.slice(0, -2);
      const value = usrType[user];
      promises.push(
        this
          .#query(`CREATE TABLE IF NOT EXISTS ${value}${this.table} (id VARCHAR(36) NOT NULL PRIMARY KEY,${query}
      );
    `)
      );
    }
    return Promise.all(promises);
  }

  async create(userObject, authToken) {
    const decoded = await this.mitiAuth.checkJWT(authToken);
    const type = decoded.type;
    this.validateUserObject(userObject, type);
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
    const rows = Object.keys(userObject).join(", ");
    const values = Object.keys(userObject)
      .map(() => `?`)
      .join(", ");
    const params = [decoded.userId].concat(
      Object.keys(userObject).map((key) => userObject[key])
    );

    const createSQL = `INSERT INTO ${type}${this.table} (id,${rows}) VALUES (?, ${values})`;
    const createQuery = await this.#query(createSQL, params);
    if (createQuery["affectedRows"] !== 1) {
      throw this.ACCOUNT_CREATION;
    }
  }

  async read(authToken) {
    const decoded = await this.mitiAuth.checkJWT(authToken);
    const username = await this.mitiAuth.getUsername(authToken);
    const id = decoded.userId;
    const type = decoded.type;
    this.checkType(type);
    const pretty = this.msettings.getUserFields(type);
    const columnNames = Object.keys(
      this.msettings.getSqlInfo(this.msettings.reverseUsrType(type))
    ).join(", ");
    const selectSQL = `SELECT ${columnNames} FROM ${type}${this.table} WHERE id = ?`;

    const params = [id];
    const selectQuery = await this.#query(selectSQL, params);
    if (selectQuery.length === 0) {
      throw this.NO_USER_INFO;
    }
    const object = selectQuery[0];
    object["username"] = username;
    pretty.push({"name":"username","pretty":"Username"});
    let retobj={};
    pretty.forEach(item => {
      const { name, pretty } = item;
      retobj[name] = { data: object[name], pretty };
    });
    return retobj;
  }
  async update(userObject, authToken) {
    const decoded = await this.mitiAuth.checkJWT(authToken);
    const id = decoded.userId;
    const type = decoded.type;
    this.validateUserObject(userObject, type);
    this.checkType(type);
    await this.read(authToken);
    let updateMagic = "";
    let params = [];
    for (const key in userObject) {
      updateMagic += `${key} = ?, `;
      params.push(userObject[key]);
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

  validateUserObject(userObject, type) {
    if (this.msettings.checkUserInfo(type, userObject)) {
      return;
    } else {
      throw this.INVALID_USER_INFO;
    }
  }
  checkType(type) {
    if (!this.msettings.checkType(type)) {
      throw this.INVALID_USER_TYPE;
    }
  }
  async getScheme(token) {
    const decoded = await this.mitiAuth.checkJWT(token);
    return this.msettings.object[this.msettings.reverseUsrType(decoded.type)]
      .info;
  }
}
export default MitiAccount;
