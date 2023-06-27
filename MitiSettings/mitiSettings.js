const defaultUser = {
  ADMIN: "admin",
  REGULAR: "regular",
};
const defaultTableRows = {
  email: "VARCHAR(80)",
  fname: "VARCHAR(80)",
  lname: "VARCHAR(80)",
  phone: "VARCHAR(80)",
  address: "VARCHAR(80)",
  ass: "VARCHAR(80)",
};
//TODO Put the tableRows different for each user
class MitiSettings {
  userType;
  tableRows;
  constructor(typOfUser = defaultUser, tblrow = defaultTableRows) {
    this.userType = typOfUser;
    this.tableRows = tblrow;
  }
}

export default MitiSettings;
