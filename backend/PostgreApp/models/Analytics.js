module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Analytics', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    eventType: { type: DataTypes.STRING(100), allowNull: false },
    eventName: { type: DataTypes.STRING(200), allowNull: false },
    eventCount: { type: DataTypes.INTEGER, defaultValue: 0 },
    conversionRate: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 },
    trackingDate: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, { tableName: 'analytics', timestamps: true, underscored: true, createdAt: 'created_at', updatedAt: 'updated_at' });
};
