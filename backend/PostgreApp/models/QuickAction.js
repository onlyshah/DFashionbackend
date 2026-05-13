module.exports = (sequelize, DataTypes) => {
  return sequelize.define('QuickAction', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    name: { type: DataTypes.STRING(100), allowNull: false },
    icon: { type: DataTypes.STRING(100) },
    url: { type: DataTypes.STRING(500), allowNull: false },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true }
  }, { tableName: 'quick_actions', timestamps: true, underscored: true, createdAt: 'created_at', updatedAt: 'updated_at' });
};
