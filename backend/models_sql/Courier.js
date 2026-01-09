module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Courier', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(100), allowNull: false, unique: true },
    code: { type: DataTypes.STRING(50), unique: true },
    website: { type: DataTypes.STRING(200) },
    trackingUrl: { type: DataTypes.STRING(500) },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
    supportEmail: { type: DataTypes.STRING(100) },
    supportPhone: { type: DataTypes.STRING(20) }
  }, { tableName: 'couriers', timestamps: true });
};
