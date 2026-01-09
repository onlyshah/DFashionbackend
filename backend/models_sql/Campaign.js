module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Campaign', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(200), allowNull: false },
    description: { type: DataTypes.TEXT },
    type: { type: DataTypes.ENUM('promotional', 'seasonal', 'flash_sale', 'clearance'), defaultValue: 'promotional' },
    startDate: { type: DataTypes.DATE, allowNull: false },
    endDate: { type: DataTypes.DATE, allowNull: false },
    banner: { type: DataTypes.STRING(500) },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true }
  }, { tableName: 'campaigns', timestamps: true });
};
