module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Session', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.INTEGER, allowNull: false },
    token: { type: DataTypes.TEXT, allowNull: true },
    ipAddress: { type: DataTypes.STRING(50) },
    userAgent: { type: DataTypes.TEXT },
    expiresAt: { type: DataTypes.DATE },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true }
  }, { tableName: 'sessions', timestamps: true });
};
