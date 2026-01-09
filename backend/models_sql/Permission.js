module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Permission', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(100), allowNull: false, unique: true },
    displayName: { type: DataTypes.STRING(150), allowNull: false },
    description: { type: DataTypes.TEXT },
    module: { type: DataTypes.STRING(100), allowNull: false },
    actions: { type: DataTypes.JSON, defaultValue: [] },
    isSystemPermission: { type: DataTypes.BOOLEAN, defaultValue: false },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
    createdBy: { type: DataTypes.INTEGER }
  }, { tableName: 'permissions', timestamps: true });
};
