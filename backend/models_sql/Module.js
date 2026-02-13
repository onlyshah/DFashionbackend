module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Module', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    name: { type: DataTypes.STRING(100), allowNull: false, unique: true },
    displayName: { type: DataTypes.STRING(150), allowNull: false },
    description: { type: DataTypes.TEXT },
    icon: { type: DataTypes.STRING(100) },
    order: { type: DataTypes.INTEGER, defaultValue: 0 },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true }
  }, { tableName: 'modules', timestamps: true, underscored: true, createdAt: 'created_at', updatedAt: 'updated_at' });
};
