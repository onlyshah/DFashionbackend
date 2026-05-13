module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Notification', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    userId: { type: DataTypes.UUID, allowNull: false },
    title: { type: DataTypes.STRING(200), allowNull: false },
    message: { type: DataTypes.TEXT, allowNull: false },
    // allow flexible types to avoid enum mismatches from seeders
    type: { type: DataTypes.STRING(100), defaultValue: 'system' },
    icon: { type: DataTypes.STRING(100) },
    link: { type: DataTypes.STRING(500) },
    isRead: { type: DataTypes.BOOLEAN, defaultValue: false },
    readAt: { type: DataTypes.DATE }
  }, { tableName: 'notification_preferences', timestamps: true, underscored: true, createdAt: 'created_at', updatedAt: 'updated_at' });
};
