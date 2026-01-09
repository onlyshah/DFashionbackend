module.exports = (sequelize, DataTypes) => {
  return sequelize.define('RolePermission', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    roleId: { type: DataTypes.INTEGER, allowNull: false },
    permissionId: { type: DataTypes.INTEGER, allowNull: false }
  }, { tableName: 'role_permissions', timestamps: true });
};
