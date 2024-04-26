import mitiAccount from "miti-account";
import mitiAuth from "miti-auth";
import mitiSettings from "miti-settings";
import mitiAdmin from "miti-admin";
import mysql from "mysql2/promise";

class Admin {
  constructor(layout,mysqlConfig) {
    this.layout = layout;
    this.mysqlConfig = mysqlConfig;
    this.mitiSett = new mitiSettings(this.layout);
  }
  async init(){
    this.mysqlPool = await mysql.createPool(this.mysqlConfig);
    this.auth = new mitiAuth(this.mysqlPool, this.mitiSett);
    this.account = new mitiAccount(this.mysqlPool, this.auth, this.mitiSett);
    this.admin = new mitiAdmin(this.mysqlPool,this.auth,this.account,this.mitiSett);
}


  async create(login, password, userObj) {
    const token = await this.auth.register(login, password, this.layout.ADMIN.id);
    await this.account.create(userObj, token);
  }

  async listUsers(){
    let users={};
    const types = this.mitiSett.getUserTypes();
    for (let type in types){
      users[types[type]] = await this.admin.list(types[type]);
    }
    return users;
  }
  async admin(redirect) {
    return async (req, res, next) => {
      const mapiToken = req.cookies.mapiTok;
      const mapiType = req.cookies.mapiType;
      if (mapiToken && mapiType) {
        try {
          if (await this.validate(mapiToken)) {
            next();
          } else {
            res.cookie("mapiTok", "", deleteCookie);
            res.redirect(redirect);
          }
        } catch (error) {
          res.redirect(redirect);
        }
      } else {
        res.redirect(redirect);
      }
    };
  }
}
export default Admin;
