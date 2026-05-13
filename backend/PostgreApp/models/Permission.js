module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Permission', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    name: { type: DataTypes.STRING(100), allowNull: false, unique: true },
    displayName: { type: DataTypes.STRING(150), allowNull: false },
    description: { type: DataTypes.TEXT },
    module: { type: DataTypes.STRING(100), allowNull: false },
    actions: { type: DataTypes.JSON, defaultValue: [], field: 'action' },
    isSystemPermission: { type: DataTypes.BOOLEAN, defaultValue: false },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
    createdBy: { type: DataTypes.INTEGER }
  }, { tableName: 'permissions', timestamps: true, underscored: true, createdAt: 'created_at', updatedAt: 'updated_at' });
};
