import mitiAccount from "miti-account";
import mitiAuth from "miti-auth";
import mitiSettings from "miti-settings";
import mysql from "mysql2/promise";



class User {
  constructor(layout, mysqlConfig) {
    this.layout = layout;
    this.mysqlConfig = mysqlConfig;
    this.mitiSett = new mitiSettings(this.layout);
  }
  async init(jwt_secret = false) {
    this.mysqlPool = await mysql.createPool(this.mysqlConfig);
    this.auth = new mitiAuth(this.mysqlPool, this.mitiSett,jwt_secret);
    this.account = new mitiAccount(this.mysqlPool, this.auth, this.mitiSett);
  }

  async login(login, password) {
        let token = await this.auth.login(login, password);
        let type = (await this.decode(token)).type;
        return {
          token: token,
          expiration: this.auth.jwtExpiration,
          type: type,
        };
  }

  async decode(token) {
    const decoded = await this.auth.checkJWT(token);
    return { id: decoded.userId, type: decoded.type };
  }
  async validate(token) {
    try {
      const response = await this.decode(token);
      return !!response.id;
    } catch {
      return false;
    }
  }

  async create(login, password, userObj,type) {
    const token = await this.auth.register(
      login,
      password,
      type
    );
    await this.account.create(userObj, token);
  }

  async delete(token) {
    await this.account.delete(token);
    await this.auth.delete(token);
  }

  async logout(token) {
    const newtoken = await this.auth.logout(token);
    return { token: newtoken, expiration: this.auth.logoutExpiration };
  }

  async changePass(token, login, password) {
    await this.auth.update(token, login, password);
  }

  async getinfo(token) {
    return await this.account.read(token);
  }

  async editinfo(token, infoObj) {
    return await this.account.update(infoObj, token);
  }

  async getScheme(token) {
    return await this.account.getScheme(token);
  }

  async setupDb() {
    await this.auth.setupDatabase();
    await this.account.setupDatabase();
  }

  async user(redirect) {
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
export default User;
