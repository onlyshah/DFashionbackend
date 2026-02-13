module.exports = (sequelize, DataTypes) => {
  return sequelize.define('RolePermission', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    roleId: { type: DataTypes.UUID, allowNull: false },
    permissionId: { type: DataTypes.UUID, allowNull: false },
  }, { tableName: 'role_permissions', timestamps: true });
};
