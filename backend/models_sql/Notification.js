module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Notification', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.INTEGER, allowNull: false },
    title: { type: DataTypes.STRING(200), allowNull: false },
    message: { type: DataTypes.TEXT, allowNull: false },
    type: { type: DataTypes.ENUM('order', 'promotion', 'system', 'social'), defaultValue: 'system' },
    icon: { type: DataTypes.STRING(100) },
    link: { type: DataTypes.STRING(500) },
    isRead: { type: DataTypes.BOOLEAN, defaultValue: false },
    readAt: { type: DataTypes.DATE }
  }, { tableName: 'notifications', timestamps: true });
};
