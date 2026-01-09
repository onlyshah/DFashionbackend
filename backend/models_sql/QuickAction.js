module.exports = (sequelize, DataTypes) => {
  return sequelize.define('QuickAction', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(100), allowNull: false },
    icon: { type: DataTypes.STRING(100) },
    url: { type: DataTypes.STRING(500), allowNull: false },
    order: { type: DataTypes.INTEGER, defaultValue: 0 },
    category: { type: DataTypes.STRING(100) },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true }
  }, { tableName: 'quick_actions', timestamps: true });
};
