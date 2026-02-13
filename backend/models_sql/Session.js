module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Session', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    userId: { type: DataTypes.UUID, allowNull: false },
    token: { type: DataTypes.TEXT, allowNull: true },
    ipAddress: { type: DataTypes.STRING(50) },
    userAgent: { type: DataTypes.TEXT },
    expiresAt: { type: DataTypes.DATE },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true }
  }, { tableName: 'sessions', timestamps: true, underscored: true, createdAt: 'created_at', updatedAt: 'updated_at' });
};
